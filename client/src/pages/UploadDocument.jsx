// src/components/UploadDocument.jsx

import { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import {
  addFolder,
  getFolders,
  addDocument,
  bulkAddEncryptedChunks,
} from "../services/db";
import { useAuth } from "../context/AuthContext";
import { chunkText, generateEmbeddings } from "../utils/ragUtils";
import { encryptData } from "../services/CryptoServices";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";
import axios from "axios";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function UploadDocument() {
  const { vaultKey } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("READY");
  const [progress, setProgress] = useState(0);
  const [embeddingLoading, setEmbeddingLoading] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef(null);
  const [userFolders, setUserFolders] = useState([]);

  useEffect(() => {
    const verifyRoot = async () => {
      try {
        let res = await axios.get(
          "http://localhost:8000/api/folder/get-folders",
          { withCredentials: true },
        );

        let folders = res.data.folders;

        const hasRoot = folders.some((item) => item.folderName === "Root");
        if (!hasRoot) {
          res = await axios.post(
            "http://localhost:8000/api/folder/create-folder",
            { folderName: "Root" },
            { withCredentials: true },
          );

          const newFolderIdxDB = await addFolder(
            res.data.folder._id,
            res.data.folder.folderName,
          );

          setSelectedFolder(newFolderIdxDB);
          setUserFolders((prev) => [...prev, newFolderIdxDB]);
        } else {
          const foldersFromDB = await getFolders();
          setUserFolders(foldersFromDB);
          setSelectedFolder(foldersFromDB.find((f) => f.folderName === "Root"));
        }
      } catch (err) {
        console.error(err);
      }
    };

    verifyRoot();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.warning("ONLY PDF FILES ALLOWED");
      return;
    }
    setSelectedFile(file);
    setError("");
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await axios.post(
        "http://localhost:8000/api/folder/create-folder",
        { folderName: newFolderName.trim() },
        { withCredentials: true },
      );

      const backendFolder = res.data.folder;
      const newFolderIdxDB = await addFolder(
        backendFolder._id,
        backendFolder.folderName,
      );

      setUserFolders((prev) => [...prev, newFolderIdxDB]);
      setSelectedFolder(newFolderIdxDB);
      setNewFolderName("");
    } catch (error) {
      toast.error(error.response?.data?.message || "FOLDER CREATION FAILED");
    }
  };

  const handleSelectFolder = (folder) => {
    setSelectedFolder(folder);
  };

  const handleConfirmFolder = () => {
    setShowFolderModal(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("SELECT A DOCUMENT FIRST");
      return;
    }

    if (!vaultKey) {
      toast.error("VAULT KEY MISSING – RE-LOGIN");
      return;
    }

    setLoading(true);
    setError("");
    setStatus("STARTING...");
    setProgress(0);

    try {
      // ─────────────────────────────────────────────
      // PDF text extraction → chunking → embedding → encryption
      // ─────────────────────────────────────────────

      setStatus("EXTRACTING TEXT...");
      setProgress(10);

      const pdf = await pdfjsLib.getDocument(URL.createObjectURL(selectedFile))
        .promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item) => item.str).join(" ") + "\n\n";
      }

      setStatus("CHUNKING...");
      setProgress(20);
      const chunks = chunkText(fullText);

      setStatus("GENERATING EMBEDDINGS...");
      setProgress(30);
      const embeddedChunks = await generateEmbeddings(
        chunks,
        setEmbeddingLoading,
        setStatus,
        setError,
      );

      if (embeddedChunks.length === 0) {
        throw new Error("NO EMBEDDINGS GENERATED");
      }

      setStatus("ENCRYPTING CHUNKS...");
      setProgress(50);
      const encryptedChunks = [];
      for (let i = 0; i < embeddedChunks.length; i++) {
        const chunkText = embeddedChunks[i].text;
        const { encrypted, iv } = await encryptData(
          vaultKey,
          new TextEncoder().encode(chunkText),
        );

        encryptedChunks.push({
          chunkIdx: i,
          encryptedText: encrypted,
          iv: Array.from(iv),
          embedding: embeddedChunks[i].embedding,
        });
      }

      // Encrypt original file
      setStatus("ENCRYPTING ORIGINAL FILE...");
      setProgress(65);
      const fileBuffer = await selectedFile.arrayBuffer();
      const { encrypted: encryptedFileData, iv: fileIv } = await encryptData(
        vaultKey,
        new Uint8Array(fileBuffer),
      );

      const formData = new FormData();
      const encryptedBlob = new Blob([encryptedFileData], {
        type: "application/octet-stream",
      });

      formData.append("file", encryptedBlob);
      formData.append("fileName", selectedFile.name);
      formData.append("fileSize", selectedFile.size);
      formData.append("mimeType", selectedFile.type);
      formData.append("iv", JSON.stringify(Array.from(fileIv)));
      formData.append("folderId", selectedFolder?.backendId || null);

      setStatus("UPLOADING TO SERVER...");
      setProgress(75);
      const uploadRes = await axios.post(
        "http://localhost:8000/api/files/upload-encrypted-file",
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const backendFileId = uploadRes.data.documentId;

      setStatus("SAVING METADATA...");
      setProgress(85);
      const docId = await addDocument({
        fileName: selectedFile.name,
        folderId: selectedFolder?.backendId || null,
        fileSize: selectedFile.size,
        uploadDate: new Date().toISOString(),
      });

      setStatus("SAVING ENCRYPTED CHUNKS...");
      setProgress(90);
      const chunksToSave = encryptedChunks.map((c) => ({
        ...c,
        documentId: docId,
      }));
      await bulkAddEncryptedChunks(chunksToSave);

      setProgress(100);
      setStatus("UPLOAD COMPLETE");
      toast.success("DOCUMENT SECURED & SAVED", { autoClose: 5000 });

      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error(err);
      toast.error("UPLOAD FAILED – CHECK CONSOLE");
      setError("UPLOAD FAILED");
    } finally {
      setSelectedFile(null);
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      <div className="pt-32 pb-20 px-6 md:px-12 lg:px-24 max-w-6xl mx-auto">
        <div className="border-4 border-black shadow-[16px_16px_0px_#000] bg-white p-10 md:p-14">
          <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-12 text-center border-b-8 border-yellow-400 pb-6">
            UPLOAD
            <br />
            DOCUMENT
          </h2>

          <p className="text-2xl md:text-3xl font-bold text-center mb-16 uppercase tracking-widest">
            PDF ONLY • LOCAL ENCRYPTION • NO LEAKS
          </p>

          {/* Dropzone / File select */}
          {!selectedFile ? (
            <label className="block cursor-pointer">
              <div className="border-4 border-dashed border-black p-16 md:p-24 text-center hover:bg-yellow-100 transition-colors">
                <div className="text-8xl mb-6">📄</div>
                <p className="text-4xl font-black uppercase mb-4">
                  DROP PDF HERE
                  <br />
                  OR CLICK TO SELECT
                </p>
                <p className="text-2xl font-bold">MAX 20MB RECOMMENDED</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                disabled={loading}
                className="hidden"
              />
            </label>
          ) : (
            <div className="border-4 border-black p-10 mb-10">
              <div className="text-3xl font-black mb-6">SELECTED FILE</div>
              <p className="text-2xl font-bold mb-2">{selectedFile.name}</p>
              <p className="text-xl mb-6">
                SIZE: {Math.round(selectedFile.size / 1024)} KB • PDF
              </p>

              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                <div className="text-2xl font-bold">
                  FOLDER:{" "}
                  <span className="text-yellow-600">
                    {selectedFolder ? selectedFolder.folderName : "ROOT"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => setShowFolderModal(true)}
                    disabled={loading}
                    className="
                      px-10 py-5 text-2xl font-black uppercase
                      bg-yellow-400 border-4 border-black
                      shadow-[8px_8px_0_#000] hover:shadow-[12px_12px_0_#000]
                      hover:bg-black hover:text-yellow-400 transition-all
                      disabled:opacity-50
                    "
                  >
                    CHOOSE FOLDER
                  </button>

                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    disabled={loading}
                    className="
                      px-10 py-5 text-2xl font-black uppercase
                      bg-red-500 text-white border-4 border-black
                      shadow-[8px_8px_0_#000] hover:shadow-[12px_12px_0_#000]
                      hover:bg-black transition-all disabled:opacity-50
                    "
                  >
                    REMOVE
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Status & Progress */}
          {error && (
            <div className="border-4 border-red-600 bg-red-100 p-8 mb-8 text-center">
              <p className="text-3xl font-black uppercase text-red-700 mb-4">
                ERROR
              </p>
              <p className="text-2xl font-bold">{error}</p>
            </div>
          )}

          {loading && (
            <div className="border-4 border-black p-8 mb-8">
              <div className="text-4xl font-black uppercase mb-6 text-center">
                {status}
              </div>
              <div className="w-full bg-gray-300 h-8 relative">
                <div
                  className="bg-yellow-400 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-2xl font-bold text-center mt-4">
                {progress}% COMPLETE
              </p>
            </div>
          )}

          {/* Main Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || loading || !vaultKey}
            className={`
              w-full py-8 text-4xl font-black uppercase
              bg-black text-white border-4 border-black
              shadow-[12px_12px_0_#000] hover:shadow-[16px_16px_0_#000]
              hover:bg-yellow-400 hover:text-black transition-all
              disabled:opacity-40 disabled:cursor-not-allowed
              flex items-center justify-center gap-6
            `}
          >
            <span>SECURE UPLOAD</span>
            {loading && <span className="text-5xl">⚡</span>}
          </button>

          <p className="mt-12 text-xl font-bold text-center uppercase tracking-widest">
            YOUR FILE NEVER LEAVES ENCRYPTED
          </p>
        </div>

        {/* Folder Modal – brutal style */}
        {showFolderModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-6">
            <div className="bg-white border-4 border-black shadow-[16px_16px_0_#000] p-10 md:p-14 max-w-2xl w-full">
              <h3 className="text-6xl font-black uppercase tracking-tighter mb-10 text-center border-b-8 border-yellow-400 pb-6">
                SELECT FOLDER
              </h3>

              <div className="max-h-[50vh] overflow-auto mb-10 space-y-4">
                {userFolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleSelectFolder(folder)}
                    className={`
                      w-full p-6 text-left text-2xl font-black uppercase
                      border-4 border-black
                      ${
                        selectedFolder?.id === folder.id
                          ? "bg-yellow-400 shadow-[8px_8px_0_#000]"
                          : "hover:bg-yellow-200"
                      }
                      transition-all
                    `}
                  >
                    {folder.folderName}
                  </button>
                ))}
              </div>

              {/* New folder input */}
              <div className="mb-10">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="NEW FOLDER NAME"
                  className="
                    w-full px-6 py-5 text-2xl font-bold
                    border-4 border-black
                    shadow-[6px_6px_0_#000] focus:shadow-[10px_10px_0_#000]
                    focus:outline-none transition-all
                  "
                />
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="
                    mt-6 w-full py-5 text-2xl font-black uppercase
                    bg-yellow-400 border-4 border-black
                    shadow-[8px_8px_0_#000] hover:shadow-[12px_12px_0_#000]
                    hover:bg-black hover:text-yellow-400 transition-all
                    disabled:opacity-50
                  "
                >
                  CREATE & SELECT
                </button>
              </div>

              <div className="flex justify-end gap-6">
                <button
                  onClick={() => setShowFolderModal(false)}
                  className="text-2xl font-black uppercase hover:text-yellow-600"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmFolder}
                  className="
                    px-10 py-5 text-2xl font-black uppercase
                    bg-black text-white border-4 border-black
                    shadow-[8px_8px_0_#000] hover:shadow-[12px_12px_0_#000]
                    hover:bg-yellow-400 hover:text-black transition-all
                  "
                >
                  DONE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer strip */}
      <footer className="fixed bottom-0 left-0 right-0 border-t-4 border-black bg-white py-4 text-center text-xl font-bold uppercase">
        VaultVani — Documents Locked Down • No Compromise
      </footer>
    </div>
  );
}
