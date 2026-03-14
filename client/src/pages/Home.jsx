// src/pages/Home.jsx

import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Home() {
  const { isAuthenticated } = useAuth();

  const handleLogout = () => {
    console.log("Logout clicked (non-functional)");
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono antialiased">
      {/* Navbar – glass pill */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-6xl px-4">
        <div className="bg-gray-900/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-3xl md:text-4xl font-black tracking-tight uppercase text-orange-400">
              VaultVani
            </div>

            <nav className="hidden md:flex items-center gap-10 text-base font-semibold uppercase">
              <Link
                to="#features"
                className="hover:text-orange-400 transition-colors"
              >
                Features
              </Link>
              <Link
                to="/how"
                className="hover:text-orange-400 transition-colors"
              >
                How It Works
              </Link>
              <Link
                to="/privacy"
                className="hover:text-orange-400 transition-colors"
              >
                Privacy
              </Link>
            </nav>

            <div className="flex items-center gap-5 text-base font-semibold uppercase">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="hover:text-orange-400 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-5 py-2.5 bg-orange-600/80 text-white rounded-xl border border-orange-400/30 backdrop-blur-sm hover:bg-orange-500 hover:border-orange-300/50 transition-all shadow-lg shadow-orange-900/30 text-sm md:text-base"
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
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="px-6 py-3 bg-orange-500 text-black rounded-xl border border-orange-400/40 shadow-lg shadow-orange-900/40 hover:bg-orange-400 hover:shadow-xl hover:shadow-orange-800/50 transition-all font-black uppercase text-sm md:text-base"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6 md:px-12 lg:px-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-tight tracking-tight uppercase mb-10">
            Documents
            <br />
            that <span className="text-orange-400">think</span>.
            <br />
            Privacy
            <br />
            that <span className="text-orange-400">endures</span>.
          </h1>

          <p className="text-xl md:text-2xl font-medium max-w-4xl mb-12 leading-relaxed text-gray-300">
            {isAuthenticated
              ? "YOUR VAULT IS OPEN. ENTER NOW."
              : "UPLOAD → ENCRYPT LOCALLY → ASK ANYTHING → ANSWERS STAY YOURS. NO LEAKS."}
          </p>

          <div className="flex flex-col sm:flex-row gap-5">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-10 py-5 text-2xl md:text-3xl font-black uppercase bg-orange-600/80 text-white rounded-2xl border border-orange-400/30 backdrop-blur-md shadow-2xl shadow-orange-900/40 hover:bg-orange-500 hover:shadow-orange-800/60 transition-all"
              >
                ENTER DASHBOARD
              </Link>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="px-10 py-5 text-2xl md:text-3xl font-black uppercase bg-orange-500 text-black rounded-2xl border border-orange-400/40 shadow-2xl shadow-orange-900/50 hover:bg-orange-400 hover:shadow-orange-800/60 transition-all"
                >
                  BUILD VAULT
                </Link>
                <Link
                  to="/signin"
                  className="px-10 py-5 text-2xl md:text-3xl font-black uppercase rounded-2xl border border-white/20 hover:bg-white/10 hover:border-orange-400/40 transition-all backdrop-blur-sm"
                >
                  LOGIN →
                </Link>
              </>
            )}
          </div>

          <div className="mt-16 text-base md:text-lg font-semibold uppercase tracking-wider flex flex-wrap gap-8 text-orange-300/80">
            <span>END-TO-END ENCRYPTED</span>
            <span>LOCAL AI ENGINE</span>
            <span>ZERO KNOWLEDGE</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="py-24 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-black to-gray-950"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black uppercase mb-16 text-orange-400">
            Built Different
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "ZERO-KNOWLEDGE ENCRYPTION",
                desc: "YOUR FILES GET LOCKED WITH YOUR PASSWORD BEFORE THEY LEAVE YOUR DEVICE. WE CAN'T SEE ANYTHING.",
              },
              {
                title: "NATURAL LANGUAGE POWER",
                desc: "ASK LIKE A HUMAN → “WHERE'S MY IFSC?” → GET EXACT ANSWER FROM YOUR DOCS ONLY.",
              },
              {
                title: "100% LOCAL BRAIN",
                desc: "NO SERVERS. NO CLOUD. EVERYTHING RUNS IN YOUR BROWSER – FAST & OFFLINE.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-gray-900/25 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-xl shadow-black/50 hover:shadow-orange-900/30 hover:border-orange-500/30 transition-all duration-300"
              >
                <h3 className="text-2xl md:text-3xl font-black uppercase mb-5 text-orange-400 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-lg md:text-xl font-medium text-gray-200">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-24 px-6 md:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black uppercase mb-16 text-orange-400 border-l-6 border-orange-500 pl-5">
            How It Works
          </h2>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "SIGN UP",
                desc: "KEY GENERATED LOCALLY. NO SERVER BS.",
              },
              {
                step: "02",
                title: "UPLOAD",
                desc: "FILES ENCRYPTED INSTANTLY IN BROWSER.",
              },
              {
                step: "03",
                title: "ASK",
                desc: "TYPE NORMAL QUESTIONS. NO PROMPT ENGINEERING.",
              },
              {
                step: "04",
                title: "GET ANSWER",
                desc: "PRECISE RESPONSES + SOURCE REFERENCES.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-gray-900/20 backdrop-blur-lg border border-white/10 rounded-2xl p-7 shadow-lg shadow-black/40 hover:shadow-orange-900/30 hover:border-orange-500/20 transition-all"
              >
                <div className="text-5xl font-black mb-4 text-orange-500">
                  {item.step}
                </div>
                <h3 className="text-2xl font-black uppercase mb-3 text-orange-300">
                  {item.title}
                </h3>
                <p className="text-base md:text-lg font-medium text-gray-300">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section
        id="privacy"
        className="py-24 px-6 md:px-12 lg:px-24 bg-gradient-to-t from-black to-gray-950"
      >
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-black uppercase mb-16 text-orange-400">
            PRIVACY BY DESIGN
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-900/25 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-xl shadow-black/50">
              <h3 className="text-2xl md:text-3xl font-black uppercase mb-6 text-orange-400">
                ZERO-KNOWLEDGE ARCHITECTURE
              </h3>
              <p className="text-lg md:text-xl font-medium text-gray-200">
                KEYS NEVER LEAVE YOUR DEVICE. WE CAN'T ACCESS YOUR DATA – EVER.
              </p>
            </div>

            <div className="bg-gray-900/25 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-xl shadow-black/50">
              <h3 className="text-2xl md:text-3xl font-black uppercase mb-6 text-orange-400">
                LOCAL INTELLIGENCE ONLY
              </h3>
              <p className="text-lg md:text-xl font-medium text-gray-200">
                ALL PROCESSING IN BROWSER. NO SERVERS TOUCHED. NO TRACKING.
              </p>
            </div>
          </div>

          <p className="mt-16 text-2xl md:text-3xl font-black uppercase text-orange-300 tracking-wide">
            YOUR DOCS. YOUR KEYS. YOUR RULES.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 md:px-12 lg:px-24 text-center">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black uppercase mb-10 text-orange-400">
            READY TO BUILD?
          </h2>
          <p className="text-xl md:text-2xl font-medium mb-10 text-gray-200">
            SECURE DOCUMENTS WITH REAL INTELLIGENCE. NO COMPROMISE.
          </p>

          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-block px-12 py-6 text-2xl md:text-3xl font-black uppercase bg-orange-600/80 text-white rounded-3xl border border-orange-400/30 backdrop-blur-md shadow-2xl shadow-orange-900/50 hover:bg-orange-500 hover:shadow-orange-800/70 transition-all"
            >
              DASHBOARD NOW
            </Link>
          ) : (
            <Link
              to="/signup"
              className="inline-block px-12 py-6 text-2xl md:text-3xl font-black uppercase bg-orange-500 text-black rounded-3xl border border-orange-400/40 shadow-2xl shadow-orange-900/60 hover:bg-orange-400 hover:shadow-orange-800/70 transition-all"
            >
              CREATE VAULT
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 text-center text-base font-semibold uppercase border-t border-white/10 text-gray-400">
        © {new Date().getFullYear()} VaultVani – Privacy First. No Compromises.
      </footer>
    </div>
  );
}

export default Home;
