// src/pages/Browse.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

export default function Browse() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Trigger color re-roll on every search change
  const [colorTrigger, setColorTrigger] = useState(0);

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

  // Re-roll colors on every search keystroke
  useEffect(() => {
    setColorTrigger((prev) => prev + 1);
  }, [searchTerm]);

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

  // Violent hover color palette (random on each render/search)
  const brutalColors = [
    "hover:bg-red-300 hover:text-white",
    "hover:bg-yellow-300 hover:text-black",
    "hover:bg-emerald-300 hover:text-black",
    "hover:bg-cyan-300 hover:text-black",
    "hover:bg-violet-300 hover:text-white",
    "hover:bg-orange-300 hover:text-black",
    "hover:bg-pink-300 hover:text-black",
    "hover:bg-lime-300 hover:text-black",
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-5xl md:text-6xl font-black uppercase animate-pulse tracking-tighter border-l-8 border-black pl-6">
          LOADING VAULT...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-mono pb-16">
      {/* Header – brutal offset block */}
      <header className="pt-28 pb-12 px-6 md:px-12 lg:px-24 text-center">
        <div className="inline-block bg-black text-white border-6 border-black shadow-[16px_16px_0_#000] px-10 py-6 md:px-14 md:py-8 transform -rotate-1">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-none mb-3 text-yellow-400 drop-shadow-[0_0_16px_rgba(250,204,21,0.5)]">
            YOUR FOLDERS
          </h1>
          <p className="text-xl md:text-2xl font-bold uppercase tracking-widest">
            ORGANIZED CHAOS
          </p>
        </div>
      </header>

      {/* Controls – balanced size */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 mb-10">
        <div className="flex flex-col md:flex-row gap-5 items-stretch">
          <input
            type="text"
            placeholder="SEARCH FOLDERS... (type to explode colors)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="
              flex-1 px-6 py-5 text-xl md:text-2xl font-black uppercase
              border-4 border-black shadow-[8px_8px_0_#000]
              focus:shadow-[12px_12px_0_#000] focus:outline-none focus:bg-yellow-100
              placeholder-gray-600 transition-all
            "
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="
              px-6 py-5 text-xl font-black uppercase
              border-4 border-black shadow-[8px_8px_0_#000] bg-white
              focus:shadow-[12px_12px_0_#000] focus:outline-none
              transition-all
            "
          >
            <option value="createdAt">DATE CREATED</option>
            <option value="name">FOLDER NAME</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="
              px-8 py-5 text-xl md:text-2xl font-black uppercase
              bg-black text-white border-4 border-black shadow-[8px_8px_0_#000]
              hover:shadow-[12px_12px_0_#000] hover:bg-red-500 transition-all
            "
          >
            {sortOrder === "asc" ? "↑ ASC" : "↓ DESC"}
          </button>
        </div>
      </div>

      {/* Folders Grid */}
      {filteredAndSorted.length === 0 && searchTerm ? (
        <div className="text-center py-24">
          <p className="text-5xl md:text-6xl font-black uppercase mb-6 border-l-8 border-black pl-6">
            NO MATCH FOUND
          </p>
          <p className="text-2xl font-bold uppercase">TRY DIFFERENT SEARCH</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto px-6 md:px-12">
          {filteredAndSorted.map((folder) => {
            // Random color changes on every search keystroke
            const randomHover =
              brutalColors[Math.floor(Math.random() * brutalColors.length)];

            return (
              <Link
                key={folder._id}
                to={`/files/${folder._id}`}
                className={`
                  border-6 border-black p-8
                  shadow-[10px_10px_0_#000] hover:shadow-[16px_16px_0_#000]
                  transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02]
                  bg-white ${randomHover}
                `}
              >
                <h3 className="text-2xl md:text-3xl font-black uppercase mb-4 truncate">
                  {folder.folderName}
                </h3>
                <div className="text-lg md:text-xl font-bold mb-2">
                  {folder.fileStored?.length || 0} DOCUMENTS
                </div>
                <div className="text-base opacity-80">
                  CREATED {new Date(folder.createdAt).toLocaleDateString()}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
