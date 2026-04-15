// src/pages/Files.jsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast"; // assuming react-hot-toast is used consistently
import { useAuth } from "../context/AuthContext";
import { decryptData } from "../services/CryptoServices";
import Header from "../components/Header";

export default function Files() {
  const { folderId } = useParams();
  const { vaultKey } = useAuth();

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [folderName, setFolderName] = useState("Loading folder...");

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/files/my-documents?folderId=${folderId}`,
          { withCredentials: true },
        );
        setFiles(res.data.documents || []);

        // Optional: fetch folder name if your API supports it
        // For now using fallback
        setFolderName(res.data.fileName);
      } catch (err) {
        console.error("Failed to load files:", err);
        toast.error("Failed to load files");
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [folderId]);

  const handleViewFile = async (fileId, fileName) => {
    try {
      if (!vaultKey) {
        toast.error("Vault key missing — please re-login");
        return;
      }

      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/files/download/${fileId}`,
        {
          withCredentials: true,
          responseType: "arraybuffer",
        },
      );

      const ivArray = JSON.parse(res.headers["x-encrypted-iv"] || "[]");
      const mimeType = res.headers["x-mime-type"] || "application/pdf";

      const decryptedBuffer = await decryptData(
        vaultKey,
        res.data,
        new Uint8Array(ivArray),
      );

      const blob = new Blob([decryptedBuffer], { type: mimeType });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      // Optional cleanup (browser will handle it, but good practice)
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast.success("File decrypted and opened");
    } catch (err) {
      console.error("Decryption / view error:", err);
      toast.error("Failed to decrypt or open file");
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm("Are you absolutely sure you want to permanently delete this document and its AI memory indices globally?")) return;
    
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/files/delete/${fileId}`, {
        withCredentials: true,
      });
      // Splice entirely from arrays preventing refreshes natively
      setFiles((prev) => prev.filter((f) => f._id !== fileId));
      toast.success("Document cleanly deleted globally");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete natively");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-4xl md:text-5xl font-black uppercase text-orange-400 animate-pulse tracking-tight">
          Loading files...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono antialiased">
      <div className="pt-28 pb-20 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        {/* Header */}
        <Header />
        <div className="mb-16 text-center">
          <div className="inline-block bg-gray-900/30 backdrop-blur-xl border border-white/10 rounded-3xl px-10 py-8 shadow-2xl shadow-black/60">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight text-orange-400 leading-tight mb-3">
              {folderName}
            </h1>
            <p className="text-lg md:text-xl text-gray-300 font-medium">
              Your encrypted documents
            </p>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-3xl md:text-4xl font-black uppercase text-orange-400 mb-6">
              No documents yet
            </p>
            <p className="text-xl text-gray-400">
              Upload files to this folder to see them here
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {files.map((file) => (
              <div
                key={file._id}
                className="
                  group relative
                  bg-gray-900/25 backdrop-blur-xl border border-white/10
                  rounded-2xl p-8 shadow-xl shadow-black/50
                  hover:shadow-orange-900/40 hover:border-orange-500/30
                  hover:scale-[1.02] hover:brightness-110
                  transition-all duration-300
                "
              >
                <h3 className="text-2xl md:text-3xl font-black uppercase mb-4 text-orange-300 group-hover:text-orange-400 transition-colors truncate">
                  {file.fileName}
                </h3>

                <div className="space-y-2 text-gray-300">
                  <p className="text-lg font-medium">
                    {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="text-sm text-gray-500">
                    Uploaded {new Date(file.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => handleViewFile(file._id, file.fileName)}
                    className="
                      flex-1 py-4 text-sm md:text-base font-black uppercase rounded-2xl
                      bg-orange-600/90 text-white border border-orange-400/30
                      hover:bg-orange-500 hover:border-orange-300/50
                      hover:shadow-orange-900/50 transition-all duration-300
                      shadow-lg shadow-orange-900/40 flex items-center justify-center gap-2
                    "
                  >
                    Download <span className="text-xl">↗</span>
                  </button>

                  <button
                    onClick={() => handleDeleteFile(file._id)}
                    className="
                      px-5 py-4 text-lg md:text-xl font-black rounded-2xl
                      bg-red-900/40 text-red-500 border border-red-500/30
                      hover:bg-red-600 hover:text-white hover:border-red-500
                      transition-all duration-300 flex items-center justify-center
                    "
                    title="Permanently Delete Document"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer consistency */}
      <footer className="border-t border-white/10 bg-gray-950/50 backdrop-blur-md py-6 text-center text-gray-400 text-sm font-medium">
        VaultVani — Documents Encrypted • Privacy Preserved
      </footer>
    </div>
  );
}
