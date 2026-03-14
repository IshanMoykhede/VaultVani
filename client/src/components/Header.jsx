// src/components/Header.jsx

import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { isAuthenticated, logout } = useAuth(); // assuming your AuthContext has logout
  const navigate = useNavigate();

  const handleLogout = () => {
    logout?.(); // call your logout function if available
    navigate("/signin"); // or wherever you redirect after logout
  };

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-6xl px-4">
      <div
        className="
        bg-gray-900/30 backdrop-blur-xl 
        border border-white/10 rounded-2xl 
        shadow-2xl shadow-black/60 
        px-6 md:px-8 py-4
      "
      >
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link
            to={isAuthenticated ? "/dashboard" : "/"}
            className="text-3xl md:text-4xl font-black tracking-tight uppercase text-orange-400 hover:text-orange-300 transition-colors"
          >
            VaultVani
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-base font-semibold uppercase">
            {isAuthenticated ? (
              <>
                <button
                  to={"/upload"}
                  onClick={() => navigate("/upload")}
                  className="hover:text-orange-400 transition-colors text-white"
                >
                  Upload
                </button>
                <button
                  onClick={() => navigate("/browse")}
                  className="hover:text-orange-400 transition-colors text-white"
                >
                  Browse
                </button>
                <button
                  onClick={() => navigate("/ai-assistant")}
                  className="hover:text-orange-400 transition-colors text-white"
                >
                  Chat
                </button>
                <button
                  onClick={handleLogout}
                  className="
                    px-5 py-2 bg-orange-600/70 text-white 
                    rounded-xl border border-orange-400/30 
                    hover:bg-orange-500 hover:border-orange-300/50 
                    hover:shadow-orange-900/40 transition-all
                    shadow-lg shadow-orange-900/30 
                  "
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="hover:text-orange-400 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="
                    px-6 py-2.5 bg-orange-500 text-black 
                    rounded-xl border border-orange-400/40 
                    hover:bg-orange-400 hover:shadow-xl 
                    hover:shadow-orange-800/50 transition-all
                    font-semibold
                  "
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu placeholder – add hamburger + drawer later if needed */}
          <div className="md:hidden">
            {/* You can add a mobile menu button here later */}
            <span className="text-orange-400 font-bold">Menu</span>
          </div>
        </div>
      </div>
    </header>
  );
}
