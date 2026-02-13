// src/components/Header.jsx
import { FaUserCircle } from "react-icons/fa";

export default function Header() {
  return (
    <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl mx-auto px-6">
      <div className="backdrop-blur-2xl bg-black/35 border border-purple-900/20 rounded-full px-8 py-4 shadow-2xl shadow-black/60">
        <div className="flex justify-between items-center">
          {/* Brand Name */}
          <div className="text-2xl font-medium tracking-tight bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
            VaultVani
          </div>

          {/* User Avatar + Dropdown */}
          <div className="relative group">
            <FaUserCircle className="text-3xl text-gray-300 cursor-pointer hover:text-purple-300 transition-colors duration-300" />

            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-3 w-48 bg-black/90 border border-purple-900/40 rounded-xl shadow-2xl hidden group-hover:block overflow-hidden">
              <button className="w-full px-4 py-3 text-left text-gray-300 hover:bg-purple-900/30 transition-colors duration-200">
                Sign Out
              </button>
              <button className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-900/30 transition-colors duration-200">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
