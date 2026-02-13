// src/components/UploadDocument.jsx
import { useState, useRef, useEffect } from "react"; // ← added useRef
import { toast } from "react-toastify";
import { getFolders } from "../services/db";

export default function UploadDocument() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef(null);
  const [folders, setFolders] = useState([]);

  //this useEffect will get all folders from the indexedb
  useEffect(() => {
    const getAllFoldersFromDB = async () => {
      const allFolders = await getFolders();
      allFolders ? setFolders(allFolders) : [];
    };
    getAllFoldersFromDB();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.warning("Only PDF files are supported at the moment.");
      return;
    }
    setSelectedFile(file);
    return;
  };
  // const handleFileSelect = (e) => {
  //   const file = e.target.files[0];
  //   if (!file) {
  //     setError("No file selected.");
  //     return;
  //   }
  //   if (!file.name.toLowerCase().endsWith(".pdf")) {
  //     setError("Only PDF files are supported at the moment.");
  //     return;
  //   }
  //   setSelectedFile(file);
  //   setError("");
  // };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder = {
      id: Date.now(),
      name: newFolderName.trim(),
    };

    setFolders([...folders, newFolder]);
    setSelectedFolder(newFolder);
    setNewFolderName("");
  };

  const handleSelectFolder = (folder) => {
    setSelectedFolder(folder);
  };

  const handleConfirmFolder = () => {
    setShowFolderModal(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a document first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Placeholder for real processing (chunking, embedding, encryption, backend)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Success → toast + reset form completely
      toast.success("Document uploaded and secured successfully!", {
        autoClose: 6000,
        position: "top-right",
      });

      // Critical fix: clear the actual file input element
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // This clears the input so same file can be selected again
      }
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Failed to process document. Please try again.", {
        autoClose: 6000,
        position: "top-right",
      });
      setError("Upload failed. Check console for details.");
    } finally {
      setSelectedFile(null);
      setSelectedFolder(null);
      setNewFolderName("");
      setError("");
      setLoading(false);
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
            Processed locally • Encrypted before sending • Fully
            offline-capable.
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
              ref={fileInputRef} // ← Added ref here
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
                  {selectedFolder ? selectedFolder.name : "Root"}
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
                      setFolders(null); // ← THIS LINE IS THE BUG
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

          {loading && (
            <div className="mt-6 flex items-center justify-center gap-3 text-amber-400 animate-pulse text-sm">
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
              Securely processing your document...
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || loading}
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
            sending
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
                <button
                  onClick={() => setSelectedFolder(null)}
                  className={`
                    w-full p-5 text-left rounded-xl transition-all duration-300
                    ${!selectedFolder ? "bg-purple-900/30 border-purple-700/60" : "bg-black/40 border-purple-900/30 hover:bg-black/60 hover:border-purple-700/40"}
                    border
                  `}
                >
                  <p className="text-gray-200 font-medium">Root (Main Vault)</p>
                </button>

                {folders.length != 0 &&
                  folders.map((folder) => (
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
                      <p className="text-gray-200 font-medium">{folder.name}</p>
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
