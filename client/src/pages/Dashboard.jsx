// src/components/Dashboard.jsx
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import ModelDownloader from "../components/ModelDownloader";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 font-sans antialiased relative overflow-hidden">
      {/* Deep layered background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#0f0b12] to-[#0a0a0f] pointer-events-none" />

      {/* Soft premium glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-50%] left-[-30%] w-[1400px] h-[1400px] bg-gradient-to-br from-purple-900/6 via-indigo-900/5 to-transparent rounded-full blur-[180px] opacity-60" />
        <div className="absolute bottom-[-40%] right-[-40%] w-[1600px] h-[1600px] bg-gradient-to-tl from-amber-900/5 via-purple-900/4 to-transparent rounded-full blur-[200px] opacity-50" />
      </div>

      {/* Header */}
      <Header />

      {/* Main Content – more compact */}
      <main className="relative z-10 pt-36 pb-20 px-6">
        {/* Welcome – smaller & tighter */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
            Welcome back, {user?.userName || "Vault Keeper"}
          </h1>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            Your private vault is ready. Upload, browse, or chat securely.
          </p>
        </div>

        {/* Model Status Badge – smaller */}
        <div className="max-w-md mx-auto mb-16 flex justify-center">
          <ModelDownloader />
        </div>

        {/* Three Cards – smaller, tighter */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Upload Card */}
          <div
            onClick={() => navigate("/upload")}
            className="group relative p-8 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:shadow-xl hover:shadow-purple-900/15 hover:border-purple-700/40"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/4 via-purple-500/4 to-indigo-500/4 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 flex flex-col items-center gap-5">
              <div className="text-6xl transform group-hover:scale-110 transition-transform duration-500">
                📤
              </div>
              <h3 className="text-xl font-medium bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent group-hover:from-amber-200 group-hover:via-purple-200 group-hover:to-indigo-200 transition-all">
                Upload Document
              </h3>
              <p className="text-gray-400 text-center text-sm leading-relaxed">
                Securely add PDFs, passbooks, certificates — encrypted instantly
              </p>
            </div>
          </div>

          {/* Browse Card */}
          <div
            onClick={() => navigate("/browse")}
            className="group relative p-8 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:shadow-xl hover:shadow-purple-900/15 hover:border-purple-700/40"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/4 via-purple-500/4 to-indigo-500/4 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 flex flex-col items-center gap-5">
              <div className="text-6xl transform group-hover:scale-110 transition-transform duration-500">
                📂
              </div>
              <h3 className="text-xl font-medium bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent group-hover:from-amber-200 group-hover:via-purple-200 group-hover:to-indigo-200 transition-all">
                Browse Vault
              </h3>
              <p className="text-gray-400 text-center text-sm leading-relaxed">
                View, search, manage your encrypted documents securely
              </p>
            </div>
          </div>

          {/* AI Assistant Card */}
          <div
            onClick={() => navigate("/ai-assistant")}
            className="group relative p-8 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:shadow-xl hover:shadow-purple-900/15 hover:border-purple-700/40"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/4 via-purple-500/4 to-indigo-500/4 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 flex flex-col items-center gap-5">
              <div className="text-6xl transform group-hover:scale-110 transition-transform duration-500">
                🤖
              </div>
              <h3 className="text-xl font-medium bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent group-hover:from-amber-200 group-hover:via-purple-200 group-hover:to-indigo-200 transition-all">
                AI Assistant
              </h3>
              <p className="text-gray-400 text-center text-sm leading-relaxed">
                Ask naturally — answers from your documents only
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
