// src/components/Dashboard.jsx

import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import ModelDownloader from "../components/ModelDownloader";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-black font-mono relative overflow-hidden">
      {/* Sharp geometric background cuts – no gradients, pure brutal */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-1/2 h-1/3 bg-black transform -skew-x-12 opacity-10" />
        <div className="absolute bottom-0 right-0 w-2/3 h-2/3 bg-yellow-400 transform skew-x-12 opacity-10" />
        <div className="absolute top-1/3 right-0 w-1/3 h-1/2 bg-red-500 transform -skew-y-12 opacity-5" />
      </div>

      <Header />

      <main className="relative pt-28 pb-32 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        {/* Welcome – offset brutal block with yellow glitch */}
        <div className="relative mb-20">
          <div className="inline-block bg-black text-white border-6 border-black shadow-[16px_16px_0_#000] px-10 py-8 transform -rotate-1">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-none mb-3 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]">
              WELCOME BACK
            </h1>
            <p className="text-2xl md:text-3xl font-bold uppercase">
              {user?.userName?.toUpperCase() || "VAULT KEEPER"}
            </p>
          </div>
          {/* Yellow cut accent */}
          <div className="absolute -top-4 -right-8 bg-yellow-400 w-32 h-32 transform rotate-12 border-6 border-black shadow-[8px_8px_0_#000] opacity-90" />
        </div>

        {/* Model downloader – industrial badge */}
        <div className="max-w-md mx-auto mb-20">
          <div className="border-6 border-black bg-white shadow-[12px_12px_0_#000] p-6 transform hover:rotate-1 transition-transform">
            <ModelDownloader />
          </div>
        </div>

        {/* Action Cards – tilted, colored edges, deep shadows */}
        <div className="grid md:grid-cols-3 gap-10">
          {[
            {
              to: "/upload",
              icon: "📤",
              title: "UPLOAD DOCUMENT",
              desc: "ADD • ENCRYPT LOCALLY • SECURE",
              accent: "border-l-12 border-red-600",
            },
            {
              to: "/browse",
              icon: "📂",
              title: "BROWSE VAULT",
              desc: "VIEW • SEARCH • MANAGE",
              accent: "border-l-12 border-yellow-400",
            },
            {
              to: "/ai-assistant",
              icon: "🤖",
              title: "AI ASSISTANT",
              desc: "ASK • ANSWERS FROM YOUR FILES ONLY",
              accent: "border-l-12 border-cyan-600",
            },
          ].map((card, i) => (
            <div
              key={i}
              onClick={() => navigate(card.to)}
              className={`
                relative border-6 border-black p-8 md:p-10
                shadow-[12px_12px_0_#000] hover:shadow-[20px_20px_0_#000]
                bg-white transition-all duration-300 cursor-pointer
                hover:-translate-y-3 hover:rotate-1 group ${card.accent}
              `}
            >
              {/* Left colored cut */}
              <div className="absolute -left-3 top-0 bottom-0 w-8 bg-current opacity-90 transform -skew-x-12" />

              <div className="text-center relative z-10">
                <div className="text-7xl md:text-8xl mb-6 group-hover:scale-110 transition-transform">
                  {card.icon}
                </div>
                <h3 className="text-2xl md:text-3xl font-black uppercase mb-5 tracking-tight">
                  {card.title}
                </h3>
                <p className="text-lg md:text-xl font-bold opacity-90">
                  {card.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Privacy strip – slanted brutal */}
        <div className="mt-20 relative overflow-hidden">
          <div className="bg-black text-white border-6 border-black shadow-[12px_12px_0_#000] px-10 py-8 transform -skew-x-6">
            <p className="text-2xl md:text-3xl font-black uppercase tracking-widest text-center">
              END-TO-END ENCRYPTED • LOCAL ONLY • ZERO LEAKS
            </p>
          </div>
        </div>
      </main>

      {/* Footer – cut edge */}
      <footer className="relative mt-20 border-t-8 border-black bg-black text-white py-8 text-center text-xl font-black uppercase tracking-widest">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-400 transform -skew-x-12 border-4 border-black shadow-[8px_8px_0_#000]" />
        VaultVani – Secure. Raw. No Compromise.
      </footer>
    </div>
  );
}
