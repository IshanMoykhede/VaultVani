// src/pages/Files.jsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { decryptData } from "../services/CryptoServices";

export default function Files() {
  const { folderId } = useParams();
  const { vaultKey } = useAuth();

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [folderName, setFolderName] = useState("Loading...");

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8000/api/files/my-documents?folderId=${folderId}`,
          { withCredentials: true },
        );
        setFiles(res.data.documents || []);
        setFolderName(`Folder ${folderId.substring(0, 8)}...`);
      } catch (err) {
        console.error("Failed to load files:", err);
        toast.error("Failed to load files");
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [folderId]);

  // Decrypt & view/download file
  const handleViewFile = async (fileId, fileName) => {
    try {
      console.log("[DEBUG] Starting download for fileId:", fileId);
      console.log("[DEBUG] vaultKey available:", !!vaultKey);

      if (!vaultKey) {
        toast.error("Vault key missing — re-login");
        return;
      }

      const res = await axios.get(
        `http://localhost:8000/api/files/download/${fileId}`,
        {
          withCredentials: true,
          responseType: "arraybuffer", // binary
        },
      );

      console.log("[DEBUG] Download response headers:", res.headers);

      const ivArray = JSON.parse(res.headers["x-encrypted-iv"]);
      console.log("[DEBUG] IV parsed:", ivArray);

      const mimeType = res.headers["x-mime-type"] || "application/pdf";
      console.log("[DEBUG] MIME type:", mimeType);

      console.log("[DEBUG] Encrypted data length:", res.data.byteLength);

      // Decrypt
      const decryptedBuffer = await decryptData(
        vaultKey,
        res.data, // ArrayBuffer
        new Uint8Array(ivArray),
      );

      console.log(
        "[DEBUG] Decrypted buffer length:",
        decryptedBuffer.byteLength,
      );

      // Create Blob & open/view
      const blob = new Blob([decryptedBuffer], { type: mimeType });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank"); // view in new tab

      // Cleanup
      URL.revokeObjectURL(url);

      toast.success("File decrypted & opened");
    } catch (err) {
      console.error("[DEBUG] Full decryption error:", err);
      toast.error("Failed to decrypt or open file: " + err.message);
    }
  };

  if (loading) return <div className="text-center py-20">Loading files...</div>;

  return (
    <div className="min-h-screen bg-white text-black font-mono p-6 md:p-12">
      <h1 className="text-5xl font-black uppercase mb-12 text-center">
        FILES IN FOLDER
      </h1>

      {files.length === 0 ? (
        <p className="text-center text-2xl">No files in this folder</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {files.map((file) => (
            <div
              key={file._id}
              className="border-4 border-black p-8 shadow-[8px_8px_0_#000]"
            >
              <h3 className="text-3xl font-black uppercase mb-4 truncate">
                {file.fileName}
              </h3>
              <p className="text-xl font-bold">
                SIZE: {(file.fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
              <p className="text-lg mt-3">
                UPLOADED: {new Date(file.createdAt).toLocaleDateString()}
              </p>
              <button
                onClick={() => handleViewFile(file._id, file.fileName)}
                className="mt-6 w-full py-4 text-2xl font-black uppercase bg-black text-white border-4 border-black shadow-[8px_8px_0_#000] hover:bg-yellow-400 hover:text-black"
              >
                VIEW / DOWNLOAD
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
