// src/components/Dashboard.jsx

import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import ModelDownloader from "../components/ModelDownloader";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      <Header />

      <main className="pt-28 pb-20 px-6 md:px-12 lg:px-24 max-w-6xl mx-auto">
        {/* Welcome section */}
        <div className="text-center mb-16 border-b-4 border-yellow-400 pb-10">
          <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tight leading-tight mb-6">
            WELCOME BACK
          </h1>
          <p className="text-2xl md:text-3xl font-bold uppercase">
            {user?.userName || "VAULT KEEPER"}
          </p>
          <p className="mt-4 text-xl font-medium text-gray-700">
            YOUR PRIVATE VAULT IS LOCKED & LOADED
          </p>
        </div>

        {/* Model downloader badge */}
        <div className="max-w-md mx-auto mb-16">
          <ModelDownloader />
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Upload Card */}
          <div
            onClick={() => navigate("/upload")}
            className="
              border-4 border-black
              shadow-[10px_10px_0_#000]
              bg-white p-8
              hover:shadow-[14px_14px_0_#000]
              hover:bg-yellow-50
              transition-all cursor-pointer
            "
          >
            <div className="text-center">
              <div className="text-6xl mb-6">📤</div>
              <h3 className="text-3xl font-black uppercase mb-4">
                UPLOAD DOCUMENT
              </h3>
              <p className="text-lg font-bold">
                ADD PDFs • ENCRYPTED LOCALLY • SECURE
              </p>
            </div>
          </div>

          {/* Browse Card */}
          <div
            onClick={() => navigate("/browse")}
            className="
              border-4 border-black
              shadow-[10px_10px_0_#000]
              bg-white p-8
              hover:shadow-[14px_14px_0_#000]
              hover:bg-yellow-50
              transition-all cursor-pointer
            "
          >
            <div className="text-center">
              <div className="text-6xl mb-6">📂</div>
              <h3 className="text-3xl font-black uppercase mb-4">
                BROWSE VAULT
              </h3>
              <p className="text-lg font-bold">
                VIEW • SEARCH • MANAGE DOCUMENTS
              </p>
            </div>
          </div>

          {/* AI Assistant Card */}
          <div
            onClick={() => navigate("/ai-assistant")}
            className="
              border-4 border-black
              shadow-[10px_10px_0_#000]
              bg-white p-8
              hover:shadow-[14px_14px_0_#000]
              hover:bg-yellow-50
              transition-all cursor-pointer
            "
          >
            <div className="text-center">
              <div className="text-6xl mb-6">🤖</div>
              <h3 className="text-3xl font-black uppercase mb-4">
                AI ASSISTANT
              </h3>
              <p className="text-lg font-bold">
                ASK ANYTHING • ANSWERS FROM YOUR FILES ONLY
              </p>
            </div>
          </div>
        </div>

        {/* Quick privacy reminder */}
        <div className="mt-16 text-center border-t-4 border-black pt-10">
          <p className="text-2xl font-black uppercase tracking-widest">
            END-TO-END ENCRYPTED • LOCAL PROCESSING • ZERO LEAKS
          </p>
        </div>
      </main>

      {/* Fixed brutal footer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t-4 border-black bg-white py-4 text-center text-lg font-bold uppercase">
        VaultVani — Secure. Raw. No Compromise.
      </footer>
    </div>
  );
}
