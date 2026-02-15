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

// Local pdf.js worker (public/assets/pdf.worker.min.js)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function UploadDocument() {
  const { vaultKey } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [progress, setProgress] = useState(0);
  const [embeddingLoading, setEmbeddingLoading] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolder, setNewFolder] = useState();
  const fileInputRef = useRef(null);
  const [userFolders, setUserFolders] = useState([]);

  useEffect(() => {
    let folders = [];
    try {
      const verifyRoot = async () => {
        let res = await axios.get(
          "http://localhost:8000/api/folder/get-folders",
          { withCredentials: true },
        );

        folders = res.data.folders;

        const hasRoot = folders.some((item) => item.folderName == "Root");
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
          //new folder called Root
          setNewFolder(newFolderIdxDB);

          setSelectedFolder(newFolderIdxDB);
          setUserFolders((prev) => [...prev, newFolderIdxDB]);
        } else {
          const folders = await getFolders();
          setUserFolders(folders);
          console.log(folders);
        }
      };
      verifyRoot();
    } catch (error) {
      console.log(error.response.data.message);
      return;
    }
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.warning("Only PDF files are supported.");
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
        {
          folderName: newFolderName.trim(),
        },
        { withCredentials: true },
      );

      const backendFolder = res.data.folder;

      const newFolderIdxDB = await addFolder(
        backendFolder._id, // important mapping
        backendFolder.folderName,
      );
      setUserFolders((prev) => [...prev, newFolderIdxDB]);

      setSelectedFolder(newFolderIdxDB);
      setNewFolderName("");
    } catch (error) {
      toast.error(error.response.data.message);
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
      toast.error("Select a document first.");
      return;
    }

    if (!vaultKey) {
      toast.error("Vault key not loaded. Log in again.");
      return;
    }

    setLoading(true);
    setError("");
    setStatus("Starting...");
    setProgress(0);

    try {
      // Step 1: Extract text from PDF
      setStatus("Extracting text from PDF...");
      setProgress(10);
      const pdf = await pdfjsLib.getDocument(URL.createObjectURL(selectedFile))
        .promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item) => item.str).join(" ") + "\n\n";
      }

      // Step 2: Chunk text using YOUR function
      setStatus("Chunking text...");
      setProgress(20);
      const chunks = chunkText(fullText);

      // Step 3: Generate embeddings using YOUR function (with real setters)
      setStatus("Loading embedding model...");
      setProgress(30);
      const embeddedChunks = await generateEmbeddings(
        chunks,
        setEmbeddingLoading,
        setStatus,
        setError,
      );

      if (embeddedChunks.length === 0) {
        throw new Error("No embeddings generated");
      }

      // Step 4: Encrypt chunks using vaultKey
      setStatus("Encrypting chunks...");
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

      // Step 5: Save document metadata
      setStatus("Saving document metadata...");
      setProgress(70);

      // 🔐 Encrypt original PDF file before sending to backend
      setStatus("Encrypting original file...");
      setProgress(65);

      // 1️⃣ Read file as ArrayBuffer
      const fileBuffer = await selectedFile.arrayBuffer();

      // 2️⃣ Encrypt file using vaultKey
      const { encrypted: encryptedFileData, iv: fileIv } = await encryptData(
        vaultKey,
        new Uint8Array(fileBuffer),
      );

      // 3️⃣ Prepare FormData for backend
      const formData = new FormData();

      // Convert encrypted Uint8Array → Blob
      const encryptedBlob = new Blob([encryptedFileData], {
        type: "application/octet-stream",
      });

      formData.append("file", encryptedBlob);
      formData.append("fileName", selectedFile.name);
      formData.append("fileSize", selectedFile.size);
      formData.append("mimeType", selectedFile.type);
      formData.append("iv", JSON.stringify(Array.from(fileIv)));
      formData.append("folderId", selectedFolder?.backendId || null); // ← backendId bhej (null/empty for Root)
      console.log(selectedFolder.backendId);

      // 4️⃣ Send encrypted file to backend
      const uploadRes = await axios.post(
        "http://localhost:8000/api/files/upload-encrypted-file",
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const backendFileId = uploadRes.data.documentId;

      const docId = await addDocument({
        fileName: selectedFile.name,
        folderId: selectedFolder?.backendId || null,
        fileSize: selectedFile.size,
        uploadDate: new Date().toISOString(),
      });

      // Step 6: Bulk save encrypted chunks to DB
      setStatus("Saving encrypted chunks...");
      setProgress(85);
      const chunksToSave = encryptedChunks.map((c) => ({
        ...c,
        documentId: docId,
      }));
      await bulkAddEncryptedChunks(chunksToSave);

      // Success
      setProgress(100);
      setStatus("Upload complete!");
      toast.success("Document processed, encrypted, and saved locally!", {
        autoClose: 6000,
      });

      // Reset
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error(
        "Failed to process document: " + (err.message || "Unknown error"),
      );
      setError("Upload failed. Check console.");
    } finally {
      setSelectedFile(null);
      setSelectedFolder(null);
      setNewFolderName("");
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 font-sans antialiased relative overflow-x-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#0f0b12] to-[#0a0a0f] pointer-events-none" />

      {/* Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-50%] left-[-30%] w-[1400px] h-[1400px] bg-gradient-to-br from-purple-900/6 via-indigo-900/5 to-transparent rounded-full blur-[180px] opacity-60" />
        <div className="absolute bottom-[-40%] right-[-40%] w-[1600px] h-[1600px] bg-gradient-to-tl from-amber-900/5 via-purple-900/4 to-transparent rounded-full blur-[200px] opacity-50" />
      </div>

      <div className="relative z-10 pt-32 pb-20 px-6 max-w-5xl mx-auto">
        <div className="backdrop-blur-3xl bg-black/35 border border-purple-900/20 rounded-3xl p-10 md:p-12 shadow-2xl shadow-black/60">
          <h2 className="text-4xl md:text-5xl font-medium text-center mb-12 bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
            Upload Document
          </h2>

          <p className="text-lg text-gray-400 text-center mb-16 max-w-3xl mx-auto leading-relaxed">
            Securely add PDFs to your private vault.
            <br />
            Processed locally • Encrypted before saving • Fully offline-capable.
          </p>

          {/* Upload Dropzone */}
          <label
            className={`block cursor-pointer group ${!selectedFile ? "" : "hidden"}`}
          >
            <div
              className={`
                w-full px-10 py-20 bg-black/40 border-2 border-dashed border-purple-900/40 
                rounded-2xl text-center transition-all duration-300
                group-hover:border-purple-700/60 group-hover:bg-black/50 group-hover:shadow-xl group-hover:shadow-purple-900/20
              `}
            >
              <div className="text-8xl mb-8 text-purple-400 opacity-80 group-hover:opacity-100 transition-opacity">
                📄
              </div>
              <p className="text-2xl font-medium text-gray-200 group-hover:text-purple-300 transition-colors">
                Drop your PDF here or click to browse
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Supported: PDF • Recommended size under 20 MB
              </p>
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

          {/* Selected File & Folder Info */}
          {selectedFile && (
            <div className="mt-8 p-6 bg-black/50 border border-purple-900/30 rounded-2xl space-y-4">
              <div>
                <p className="text-lg text-gray-200">
                  <span className="font-medium text-purple-300">Document:</span>{" "}
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Size: {Math.round(selectedFile.size / 1024)} KB • PDF
                </p>
              </div>

              <div className="flex items-center justify-between gap-4">
                <p className="text-lg text-gray-200">
                  <span className="font-medium text-purple-300">Folder:</span>{" "}
                  {selectedFolder ? selectedFolder.folderName : "Root"}
                </p>
                <div className="flex gap-5">
                  <button
                    onClick={() => setShowFolderModal(true)}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-amber-700 via-purple-700 to-indigo-700 hover:from-amber-600 hover:via-purple-600 hover:to-indigo-600 text-white text-sm font-medium rounded-full transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50"
                  >
                    Select Folder
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setSelectedFolder(null);
                      setLoading(false);
                      setError("");
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-amber-700 via-purple-700 to-indigo-700 hover:from-amber-600 hover:via-purple-600 hover:to-indigo-600 text-white text-sm font-medium rounded-full transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50"
                  >
                    Remove file
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {error && (
            <p className="mt-6 text-red-400 text-center text-sm bg-red-900/20 p-4 rounded-xl border border-red-900/30">
              {error}
            </p>
          )}

          {/* Progress + Status */}
          {loading && (
            <div className="mt-6">
              <div className="w-full bg-black/40 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-amber-600 via-purple-600 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-center text-sm text-amber-400 mt-2">
                {status} {progress}%
              </p>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || loading || !vaultKey}
            className={`
              mt-10 w-full px-12 py-6 
              bg-gradient-to-r from-amber-700 via-purple-700 to-indigo-700 
              hover:from-amber-600 hover:via-purple-600 hover:to-indigo-600 
              text-white font-medium text-lg rounded-full transition-all duration-300 
              shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-3
            `}
          >
            <span>Secure & Upload to Vault</span>
            {loading && (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z"
                />
              </svg>
            )}
          </button>

          {/* Privacy note */}
          <p className="mt-8 text-sm text-gray-500 text-center">
            Your document stays private • Processed locally • Encrypted before
            saving
          </p>
        </div>

        {/* Folder Selection Modal */}
        {showFolderModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="backdrop-blur-3xl bg-black/50 border border-purple-900/30 rounded-3xl p-10 max-w-lg w-full mx-4 shadow-2xl shadow-purple-900/20">
              <h3 className="text-2xl font-medium mb-8 bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                Choose Folder
              </h3>

              {/* Flat Folder List */}
              <div className="max-h-[60vh] overflow-auto mb-8 space-y-3">
                {userFolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleSelectFolder(folder)}
                    className={`
                      w-full p-5 text-left rounded-xl transition-all duration-300
                      ${
                        selectedFolder?.id === folder.id
                          ? "bg-purple-900/30 border-purple-700/60"
                          : "bg-black/40 border-purple-900/30 hover:bg-black/60 hover:border-purple-700/40"
                      }
                      border
                    `}
                  >
                    <p className="text-gray-200 font-medium">
                      {folder.folderName}
                    </p>
                  </button>
                ))}
              </div>

              {/* Create New Folder */}
              <div className="mb-8">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder name..."
                  className="w-full px-6 py-4 bg-black/50 border border-purple-900/40 rounded-xl text-gray-200 placeholder-gray-500 focus:border-purple-700/60 transition-all"
                />
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="mt-4 px-8 py-3 bg-gradient-to-r from-amber-700 via-purple-700 to-indigo-700 hover:from-amber-600 hover:via-purple-600 hover:to-indigo-600 text-white text-sm font-medium rounded-full transition-all disabled:opacity-50"
                >
                  Create & Select
                </button>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowFolderModal(false)}
                  className="px-8 py-3 text-gray-400 hover:text-purple-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmFolder}
                  className="px-8 py-3 bg-gradient-to-r from-amber-700 via-purple-700 to-indigo-700 hover:from-amber-600 hover:via-purple-600 hover:to-indigo-600 text-white font-medium rounded-full transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
