// src/components/UploadDocument.jsx
import { useState, useRef, useEffect } from "react";
import { toast } from "react-hot-toast"; // assuming you're using react-hot-toast now
import {
  addFolder,
  getFolders,
  addDocument,
} from "../services/db";
import { useAuth } from "../context/AuthContext";
import {
  chunkText,
  generateEmbeddings,
  extractStructuredText,
} from "../utils/ragUtils";
import { encryptData } from "../services/CryptoServices";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";
import axios from "axios";
import Header from "../components/Header";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function UploadDocument() {
  const { vaultKey } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("READY");
  const [progress, setProgress] = useState(0);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef(null);
  const [userFolders, setUserFolders] = useState([]);
  const [showScannedModal, setShowScannedModal] = useState(false);
  const [customFileName, setCustomFileName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    const verifyRoot = async () => {
      try {
        let res = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/folder/get-folders`,
          {
            withCredentials: true,
          },
        );

        let folders = res.data.folders;
        const hasRoot = folders.some((item) => item.folderName === "Root");

        if (!hasRoot) {
          res = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL}/api/folder/create-folder`,
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
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are allowed");
      return;
    }
    setSelectedFile(file);
    setCustomFileName(file.name.replace(/\.pdf$/i, ""));
    setError("");
    setIsEditingName(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/folder/create-folder`,
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
      setShowFolderModal(false);
      toast.success("Folder created");
    } catch (error) {
      toast.error(error.response?.data?.message || "Folder creation failed");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a document first");
      return;
    }
    if (!vaultKey) {
      toast.error("Vault key missing – please re-login");
      return;
    }

    setLoading(true);
    setError("");
    setStatus("Starting...");
    setProgress(0);

    try {
      setStatus("Extracting text...");
      setProgress(10);
      const pdf = await pdfjsLib.getDocument(URL.createObjectURL(selectedFile))
        .promise;
      const extractedPages = await extractStructuredText(pdf);
      
      const totalLength = extractedPages.reduce((acc, p) => acc + p.text.length, 0);

      if (totalLength < 50) {
        setLoading(false);
        setShowScannedModal(true);
        return;
      }

      const fileDisplayName = customFileName.trim() || selectedFile.name.replace(/\.pdf$/i, "");

      setStatus("Chunking content...");
      setProgress(20);
      const chunks = chunkText(extractedPages, fileDisplayName);

      await finishUploadPipeline(chunks);
    } catch (err) {
      console.error(err);
      toast.error("Upload failed – check console");
      setError("Upload failed: " + err.message);
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleAiAssist = async () => {
    setShowScannedModal(false);
    setLoading(true);
    setError("");
    setStatus("Sending to AI Server (It might take a minute)...");
    setProgress(15);
    
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      const res = await axios.post("http://localhost:8001/api/ocr", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      const aiCleanedText = res.data.cleaned_text;
      
      if (!aiCleanedText || aiCleanedText.trim().length === 0) {
        toast.error("AI could not extract readable text. Storing without index.");
        return await finishUploadPipeline([]);
      }
      
      const fileDisplayName = customFileName.trim() || selectedFile.name.replace(/\.pdf$/i, "");

      setStatus("Chunking AI contextualized text...");
      setProgress(30);
      const chunks = chunkText(aiCleanedText, fileDisplayName);
      
      await finishUploadPipeline(chunks);
    } catch (err) {
      console.error("AI Error:", err);
      toast.error("AI Assistance failed. Continuing without AI.");
      await finishUploadPipeline([]);
    }
  };

  const handleStoreWithoutAi = async () => {
    setShowScannedModal(false);
    setLoading(true);
    setError("");
    setStatus("Bypassing AI...");
    setProgress(20);
    try {
        await finishUploadPipeline([]);
    } catch(err) {
        console.error(err);
        toast.error("Upload failed – check console");
        setError("Upload failed: " + err.message);
        setLoading(false);
        setTimeout(() => setProgress(0), 1000);
    }
  };

  const finishUploadPipeline = async (chunks) => {
    try {
      const finalFileName = customFileName.trim() ? `${customFileName.trim()}.pdf` : selectedFile.name;
      const fileDisplayName = customFileName.trim() || selectedFile.name.replace(/\.pdf$/i, "");
      
      const enrichedChunks = chunks.map(chunk => `[Document: ${fileDisplayName}]\n${chunk}`);

      // ─────────────────────────────────────────────────────
      // ── DEBUG: PRINT CREATED CHUNKS ──────────────────────
      if (enrichedChunks.length > 0) {
        console.log(
          "%c=== RAG CHUNK REPORT ===",
          "color: #fb923c; font-weight: bold; font-size: 14px;",
        );
        console.log(`Total Chunks Generated: ${enrichedChunks.length}`);

        enrichedChunks.forEach((chunk, index) => {
          console.groupCollapsed(`Chunk ${index + 1} (${chunk.length} chars)`);
          console.log("%cPreview:", "color: #9ca3af; font-style: italic;");
          console.log(chunk);
          if (chunk.includes("|") && chunk.includes("-|-")) {
            console.log("%c[Table Detected in this chunk]", "color: #4ade80;");
          }
          console.groupEnd();
        });
        console.log(
          "%c========================",
          "color: #fb923c; font-weight: bold;",
        );
      }
      // ─────────────────────────────────────────────────────

      let embeddedChunks = [];
      let encryptedChunks = [];

      if (enrichedChunks.length > 0) {
        setStatus("Generating embeddings...");
        setProgress(30);
        embeddedChunks = await generateEmbeddings(enrichedChunks);

        if (embeddedChunks.length === 0) {
           throw new Error("No embeddings generated");
        }

        setStatus("Encrypting chunks...");
        setProgress(50);
        for (let i = 0; i < embeddedChunks.length; i++) {
          const text = embeddedChunks[i].text;
          const { encrypted, iv } = await encryptData(
            vaultKey,
            new TextEncoder().encode(text),
          );
          encryptedChunks.push({
            chunkIdx: i,
            encryptedText: Array.from(encrypted),
            iv: Array.from(iv),
            embedding: embeddedChunks[i].embedding,
          });
        }
      }

      setStatus("Encrypting original file...");
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
      formData.append("fileName", finalFileName);
      formData.append("fileSize", selectedFile.size);
      formData.append("mimeType", selectedFile.type);
      formData.append("iv", JSON.stringify(Array.from(fileIv)));
      formData.append("folderId", selectedFolder?.backendId || null);

      setStatus("Uploading to server...");
      setProgress(75);
      const uploadRes = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/files/upload-encrypted-file`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const backendFileId = uploadRes.data.documentId;

      setStatus("Saving metadata...");
      setProgress(85);
      const docId = await addDocument({
        fileName: finalFileName,
        folderId: selectedFolder?.id || null, // Using local ID for IndexedDB
        fileSize: selectedFile.size,
        uploadDate: new Date().toISOString(),
      });

      if (encryptedChunks.length > 0) {
        setStatus("Saving AI indices to Cloud...");
        setProgress(90);
        const chunksToSave = encryptedChunks.map((c) => ({
          ...c,
          documentId: backendFileId,
        }));
        
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/chunks/upload`,
        { chunks: chunksToSave },
        { withCredentials: true }
      );
      }

      setProgress(100);
      setStatus("Upload complete");
      toast.success(chunks.length > 0 ? "Document secured and indexed" : "Document secured (No AI Indexing)");

      if (fileInputRef.current) fileInputRef.current.value = "";
      setSelectedFile(null);
    } catch (err) {
      console.error(err);
      toast.error("Upload process failed – check console");
      setError("Upload failed: " + err.message);
    } finally {
      setLoading(false);
      // Reset progress after a short delay so user sees 100%
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-black text-white font-mono antialiased">
        <div className="pt-32 pb-20 px-6 md:px-12 lg:px-24 max-w-5xl mx-auto">
          <div className="bg-gray-900/25 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl shadow-black/60">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-orange-400 text-center mb-6">
              Secure Upload
            </h2>

            <p className="text-lg md:text-xl text-gray-300 text-center mb-12 max-w-2xl mx-auto">
              PDF only • End-to-end local encryption • Your data never exposed
            </p>

            {/* Dropzone / File preview */}
            {!selectedFile ? (
              <label className="block cursor-pointer">
                <div
                  className="
                border-2 border-dashed border-white/20 rounded-2xl p-12 md:p-16
                text-center hover:border-orange-500/50 hover:bg-white/5
                transition-all duration-300 backdrop-blur-sm
              "
                >
                  <div className="text-6xl mb-6">📄</div>
                  <p className="text-2xl md:text-3xl font-bold mb-3">
                    Drop PDF here
                    <br />
                    or click to browse
                  </p>
                  <p className="text-gray-500">Recommended: under 20 MB</p>
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
              <div className="bg-gray-900/30 backdrop-blur-lg border border-white/10 rounded-2xl p-8 mb-10">
                <h3 className="text-2xl font-bold text-orange-300 mb-4">
                  Selected Document
                </h3>
                
                <div className="flex items-center gap-3 mb-2">
                  {isEditingName ? (
                    <div className="flex items-center w-full max-w-sm">
                      <input
                        type="text"
                        value={customFileName}
                        onChange={(e) => setCustomFileName(e.target.value)}
                        className="w-full bg-gray-900/50 border border-orange-500/50 rounded-l-lg px-4 py-2 text-xl font-medium focus:outline-none focus:border-orange-400 text-white"
                        placeholder="Document Name"
                        autoFocus
                      />
                      <button 
                        onClick={() => setIsEditingName(false)}
                        className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-r-lg border border-orange-500/50 font-bold transition-colors"
                      >
                         Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xl font-medium truncate max-w-sm" title={customFileName}>
                        {customFileName || "Untitled"}<span className="text-gray-400">.pdf</span>
                      </p>
                      <button 
                        onClick={() => setIsEditingName(true)}
                        className="text-gray-400 hover:text-orange-400 p-1 rounded-md transition-colors"
                        title="Rename file"
                      >
                         ✏️
                      </button>
                    </>
                  )}
                </div>

                <p className="text-gray-400 mb-6">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • PDF
                </p>

                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                  <div className="text-lg font-medium">
                    Folder:{" "}
                    <span className="text-orange-400 font-semibold">
                      {selectedFolder?.folderName || "Root"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => setShowFolderModal(true)}
                      disabled={loading}
                      className="
                      px-6 py-3 rounded-xl font-medium text-base
                      bg-orange-600/80 text-white border border-orange-400/30
                      hover:bg-orange-500 hover:border-orange-300/50
                      hover:shadow-orange-900/40 transition-all duration-300
                      shadow-lg shadow-orange-900/30 disabled:opacity-50
                    "
                    >
                      Choose Folder
                    </button>

                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      disabled={loading}
                      className="
                      px-6 py-3 rounded-xl font-medium text-base
                      bg-gray-800 text-white border border-white/20
                      hover:bg-gray-700 hover:border-red-500/40
                      transition-all duration-300 disabled:opacity-50
                    "
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Progress & Status */}
            {error && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-2xl p-6 mb-8 text-center backdrop-blur-lg">
                <p className="text-xl font-bold text-red-400 mb-2">Error</p>
                <p className="text-gray-300">{error}</p>
              </div>
            )}

            {loading && (
              <div className="bg-gray-900/30 backdrop-blur-lg border border-white/10 rounded-2xl p-8 mb-8">
                <div className="text-xl font-semibold text-orange-400 mb-4 text-center">
                  {status}
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-orange-400 h-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center mt-3 text-gray-400 font-medium">
                  {progress}% • {status.toLowerCase()}
                </p>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || loading || !vaultKey}
              className={`
              w-full py-6 text-2xl md:text-3xl font-black uppercase rounded-2xl
              bg-orange-600/90 text-white border border-orange-400/30
              hover:bg-orange-500 hover:border-orange-300/50
              hover:shadow-orange-900/50 transition-all duration-300
              shadow-2xl shadow-orange-900/40
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-4
            `}
            >
              Secure & Upload
              {loading && <span className="animate-pulse">⚡</span>}
            </button>

            <p className="mt-10 text-center text-gray-500 text-sm uppercase tracking-wider">
              Your file is encrypted locally before leaving your device
            </p>
          </div>

          {/* Scanned PDF Prompt Modal */}
          {showScannedModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
              <div className="bg-gray-900/60 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-2xl shadow-black/80 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-orange-500 to-yellow-400"></div>
                <h3 className="text-3xl font-black uppercase text-orange-400 mb-4 text-center">
                  Scanned Document Detected
                </h3>
                <p className="text-gray-300 text-lg text-center mb-10">
                  This file contains no extractable text. Would you like our Local AI backend to attempt to read and structure it via OCR, or skip AI indexing and just store it securely?
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <button
                     onClick={handleAiAssist}
                     disabled={loading}
                     className="flex flex-col items-center justify-center p-6 border border-purple-500/40 bg-purple-900/20 hover:bg-purple-800/40 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-900/50 disabled:opacity-50"
                   >
                     <span className="text-4xl mb-3">🤖</span>
                     <span className="text-xl font-bold text-white mb-2">Option A</span>
                     <span className="text-sm text-purple-200">Allow AI to structure (OCR)</span>
                   </button>
                   <button
                     onClick={handleStoreWithoutAi}
                     disabled={loading}
                     className="flex flex-col items-center justify-center p-6 border border-gray-600/40 bg-gray-800/40 hover:bg-gray-700/60 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/50 disabled:opacity-50"
                   >
                     <span className="text-4xl mb-3">🔒</span>
                     <span className="text-xl font-bold text-white mb-2">Option B</span>
                     <span className="text-sm text-gray-300">Store Securely without AI</span>
                   </button>
                </div>
                
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => setShowScannedModal(false)}
                    className="text-lg font-medium text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Cancel Upload
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Folder Selection Modal */}
          {showFolderModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
              <div className="bg-gray-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-10 max-w-lg w-full shadow-2xl shadow-black/70">
                <h3 className="text-3xl font-black uppercase text-orange-400 mb-8 text-center">
                  Select Folder
                </h3>

                <div className="max-h-[50vh] overflow-y-auto mb-8 space-y-3">
                  {userFolders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => {
                        setSelectedFolder(folder);
                        setShowFolderModal(false);
                      }}
                      className={`
                      w-full p-5 text-left text-lg font-medium rounded-2xl
                      border border-white/10
                      ${
                        selectedFolder?.id === folder.id
                          ? "bg-orange-600/40 border-orange-500/40"
                          : "hover:bg-white/5 hover:border-orange-500/20"
                      }
                      transition-all duration-200
                    `}
                    >
                      {folder.folderName}
                    </button>
                  ))}
                </div>

                <div className="mb-8">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder name"
                    className="
                    w-full px-6 py-4 text-lg bg-gray-900/50 border border-white/10
                    rounded-2xl focus:border-orange-500/50 focus:outline-none
                    transition-all duration-200 placeholder-gray-500
                  "
                  />
                  <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim() || loading}
                    className="
                    mt-4 w-full py-4 rounded-2xl font-medium text-lg
                    bg-orange-600/80 text-white border border-orange-400/30
                    hover:bg-orange-500 hover:border-orange-300/50
                    transition-all duration-300 disabled:opacity-50
                  "
                  >
                    Create & Select
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setShowFolderModal(false)}
                    className="text-lg font-medium text-gray-400 hover:text-orange-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-gray-950/50 backdrop-blur-md py-6 text-center text-gray-400 text-sm font-medium">
          VaultVani — Documents Encrypted • Privacy Preserved
        </footer>
      </div>
    </>
  );
}
