// src/pages/Browse.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast"; // assuming you're using react-hot-toast now
import Header from "../components/Header";

export default function Browse() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const res = await axios.get(
          "http://localhost:8000/api/folder/get-folders",
          {
            withCredentials: true,
          },
        );
        setFolders(res.data.folders || []);
      } catch (err) {
        console.error("Failed to load folders:", err);
        toast.error("Failed to load folders");
      } finally {
        setLoading(false);
      }
    };
    fetchFolders();
  }, []);

  // Filter & Sort
  const filteredAndSorted = folders
    .filter((f) =>
      f.folderName.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc"
          ? a.folderName.localeCompare(b.folderName)
          : b.folderName.localeCompare(a.folderName);
      }
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-4xl md:text-5xl font-black uppercase text-orange-400 animate-pulse tracking-tight">
          Loading Vault...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono antialiased pb-16">
      {/* Header */}
      <Header />
      <header className="pt-28 pb-12 px-6 md:px-12 lg:px-24 text-center">
        <div className="inline-block bg-gray-900/30 backdrop-blur-xl border border-white/10 rounded-3xl px-10 py-8 shadow-2xl shadow-black/60">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight text-orange-400 leading-tight mb-3">
            Your Folders
          </h1>
          <p className="text-lg md:text-xl text-gray-300 font-medium uppercase tracking-wide">
            Organized • Encrypted • Yours
          </p>
        </div>
      </header>

      {/* Search & Sort Controls */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 mb-12">
        <div className="flex flex-col md:flex-row gap-5 items-stretch">
          <input
            type="text"
            placeholder="Search folders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="
              flex-1 px-6 py-4 text-lg bg-gray-900/40 border border-white/10
              rounded-2xl focus:border-orange-500/50 focus:outline-none
              placeholder-gray-500 transition-all duration-200 backdrop-blur-sm
              shadow-inner shadow-black/30
            "
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="
              px-6 py-4 text-lg bg-gray-900/40 border border-white/10
              rounded-2xl focus:border-orange-500/50 focus:outline-none
              transition-all duration-200 backdrop-blur-sm
              shadow-inner shadow-black/30
            "
          >
            <option value="createdAt">Date Created</option>
            <option value="name">Folder Name</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="
              px-8 py-4 text-lg font-semibold uppercase rounded-2xl
              bg-orange-600/80 text-white border border-orange-400/30
              hover:bg-orange-500 hover:border-orange-300/50
              hover:shadow-orange-900/40 transition-all duration-300
              shadow-lg shadow-orange-900/30 flex items-center justify-center gap-2
            "
          >
            {sortOrder === "asc" ? "↑ Newest First" : "↓ Oldest First"}
          </button>
        </div>
      </div>

      {/* Folders Grid */}
      {filteredAndSorted.length === 0 && searchTerm ? (
        <div className="text-center py-24">
          <p className="text-4xl md:text-5xl font-black uppercase text-orange-400 mb-6">
            No folders found
          </p>
          <p className="text-xl text-gray-400">Try a different search term</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-6 md:px-12">
          {filteredAndSorted.map((folder) => (
            <Link
              key={folder._id}
              to={`/files/${folder._id}`}
              className="
                group relative
                bg-gray-900/25 backdrop-blur-xl border border-white/10
                rounded-2xl p-8 shadow-xl shadow-black/50
                hover:shadow-orange-900/40 hover:border-orange-500/30
                hover:scale-[1.02] hover:brightness-110
                transition-all duration-300 cursor-pointer
              "
            >
              <h3 className="text-2xl md:text-3xl font-black uppercase mb-4 text-orange-300 group-hover:text-orange-400 transition-colors truncate">
                {folder.folderName}
              </h3>
              <div className="text-lg font-medium text-gray-300 mb-2">
                {folder.fileStored?.length || 0} documents
              </div>
              <div className="text-sm text-gray-500">
                Created {new Date(folder.createdAt).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
