// src/components/Dashboard.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import ModelDownloader from "../components/ModelDownloader";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.userName?.toUpperCase() || "Vault Keeper";

  return (
    <div className="min-h-screen bg-black text-white font-mono antialiased relative overflow-hidden">
      {/* Background depth */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-black via-gray-950 to-black" />

      <Header />

      <main className="relative pt-28 pb-20 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        {/* Merged Welcome + Model Readiness Panel */}
        <div className="mb-20">
          <div
            className={`
              relative overflow-hidden
              bg-gradient-to-br from-gray-900/40 via-gray-900/25 to-gray-950/30
              backdrop-blur-2xl border border-white/5 rounded-3xl
              shadow-2xl shadow-black/70
              p-8 md:p-10 lg:p-12
              before:content-[''] before:absolute before:inset-0
              before:bg-gradient-to-r before:from-orange-600/8 before:via-transparent before:to-orange-500/5
              before:pointer-events-none
            `}
          >
            {/* Subtle animated shine */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/6 to-transparent animate-shine-slow" />
            </div>

            <div className="relative z-10 grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Left: Welcome + personal greeting */}
              <div className="space-y-5">
                <h1
                  className={`
                    text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-[-0.04em]
                    bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500
                    bg-clip-text text-transparent leading-none animate-gradient-x-slow
                  `}
                >
                  Welcome Back
                </h1>

                <div className="flex items-center gap-4 flex-wrap">
                  <p className="text-2xl md:text-3xl font-bold tracking-wide text-white/95">
                    {displayName}
                  </p>
                  <span className="px-4 py-1.5 text-sm font-semibold uppercase tracking-wider bg-orange-900/50 text-orange-200 border border-orange-500/30 rounded-full backdrop-blur-md shadow-sm">
                    Identity Verified
                  </span>
                </div>

                <p className="text-lg text-gray-300 max-w-lg leading-relaxed">
                  Your encrypted vault is waiting. Local intelligence activates
                  once models are fully loaded.
                </p>
              </div>

              {/* Right: Model readiness status */}
              <div className="space-y-6 md:border-l md:border-white/10 md:pl-10 lg:pl-16">
                <div className="text-xl md:text-2xl font-semibold text-orange-300/90 mb-4">
                  System Readiness
                </div>

                <div className="space-y-5">
                  <ModelDownloader />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {[
            {
              to: "/upload",
              icon: "📤",
              title: "Upload Document",
              desc: "Add • Encrypt locally • Secure",
            },
            {
              to: "/browse",
              icon: "📂",
              title: "Browse Vault",
              desc: "View • Search • Manage",
            },
            {
              to: "/ai-assistant",
              icon: "🤖",
              title: "AI Assistant",
              desc: "Ask • Answers from your files only",
            },
          ].map((card, index) => (
            <div
              key={index}
              onClick={() => navigate(card.to)}
              className="
                group relative cursor-pointer
                bg-gray-900/25 backdrop-blur-xl border border-white/10
                rounded-2xl p-8 shadow-xl shadow-black/50
                hover:shadow-orange-900/40 hover:border-orange-500/30
                hover:scale-[1.02] hover:brightness-110
                transition-all duration-300
              "
            >
              <div className="text-center">
                <div className="text-6xl md:text-7xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  {card.icon}
                </div>
                <h3 className="text-2xl md:text-3xl font-black uppercase mb-4 tracking-tight text-orange-300 group-hover:text-orange-400 transition-colors">
                  {card.title}
                </h3>
                <p className="text-lg font-medium text-gray-300">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Privacy assurance strip */}
        <div className="mt-16">
          <div className="bg-gray-900/30 backdrop-blur-lg border border-white/10 rounded-2xl px-8 py-6 text-center shadow-xl shadow-black/50">
            <p className="text-xl md:text-2xl font-bold uppercase tracking-wide text-orange-300">
              End-to-End Encrypted • Local Only • Zero Leaks
            </p>
          </div>
        </div>
      </main>

      <footer className="relative mt-16 border-t border-white/10 bg-gray-950/50 backdrop-blur-md py-10 text-center text-lg font-semibold text-gray-400">
        VaultVani — Secure. Private. Sovereign.
      </footer>
    </div>
  );
}
