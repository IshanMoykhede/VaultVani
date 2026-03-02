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
    <div className="min-h-screen bg-white text-black font-mono">
      {/* Navbar – brutal pill with thick border & shadow */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-6xl">
        <div className="bg-white border-4 border-black shadow-[12px_12px_0px_#000] px-8 py-5">
          <div className="flex justify-between items-center">
            <div className="text-4xl font-black tracking-tighter uppercase">
              VaultVani
            </div>

            <nav className="hidden md:flex items-center gap-12 text-xl font-bold uppercase">
              <Link
                to="/features"
                className="hover:text-yellow-400 transition-colors"
              >
                Features
              </Link>
              <Link
                to="/how"
                className="hover:text-yellow-400 transition-colors"
              >
                How It Works
              </Link>
              <Link
                to="/privacy"
                className="hover:text-yellow-400 transition-colors"
              >
                Privacy
              </Link>
            </nav>

            <div className="flex items-center gap-8 text-xl font-bold uppercase">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="hover:text-yellow-400 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-6 py-3 bg-red-500 text-white border-4 border-black shadow-[8px_8px_0px_#000] hover:bg-red-600 hover:shadow-[12px_12px_0px_#000] transition-all"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/signin"
                    className="hover:text-yellow-400 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="px-8 py-4 bg-yellow-400 text-black border-4 border-black shadow-[12px_12px_0px_#000] hover:bg-yellow-300 hover:shadow-[16px_16px_0px_#000] transition-all text-xl font-black uppercase"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero – massive text, offset, broken grid feel */}
      <section className="pt-48 pb-32 px-6 md:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-none tracking-tighter uppercase mb-12 border-l-8 border-black pl-6">
            Documents
            <br />
            that think.
            <br />
            <span className="text-yellow-400">Privacy</span>
            <br />
            that endures.
          </h1>

          <p className="text-2xl md:text-4xl font-bold max-w-4xl mb-16 leading-tight">
            {isAuthenticated
              ? "YOUR VAULT IS OPEN. GET IN."
              : "UPLOAD → ENCRYPT LOCALLY → ASK ANYTHING → ANSWERS STAY YOURS. NO BS. NO LEAKS."}
          </p>

          <div className="flex flex-col sm:flex-row gap-8">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-12 py-8 text-3xl font-black uppercase bg-black text-white border-4 border-black shadow-[12px_12px_0px_#000] hover:shadow-[16px_16px_0px_#000] hover:bg-yellow-400 hover:text-black transition-all"
              >
                ENTER DASHBOARD
              </Link>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="px-12 py-8 text-3xl font-black uppercase bg-yellow-400 text-black border-4 border-black shadow-[12px_12px_0px_#000] hover:shadow-[16px_16px_0px_#000] hover:bg-black hover:text-yellow-400 transition-all"
                >
                  BUILD VAULT
                </Link>
                <Link
                  to="/signin"
                  className="px-12 py-8 text-3xl font-black uppercase border-4 border-black hover:bg-black hover:text-white transition-all"
                >
                  LOGIN →
                </Link>
              </>
            )}
          </div>

          <div className="mt-20 text-xl font-bold uppercase tracking-widest flex flex-wrap gap-8">
            <span>ENCRYPTED END-TO-END</span>
            <span>LOCAL AI ONLY</span>
            <span>ZERO KNOWLEDGE</span>
          </div>
        </div>
      </section>

      {/* Features – blocky, offset cards with thick shadows */}
      <section
        id="features"
        className="py-32 px-6 md:px-12 lg:px-24 bg-black text-white"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-7xl font-black uppercase mb-24 text-yellow-400 border-b-8 border-yellow-400 pb-6">
            Built Different
          </h2>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                title: "ZERO-KNOWLEDGE ENCRYPTION",
                desc: "YOUR FILES GET LOCKED WITH YOUR PASSWORD BEFORE THEY LEAVE YOUR DEVICE. WE CAN'T SEE SHIT.",
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
                className="bg-white text-black p-10 border-4 border-black shadow-[12px_12px_0px_#000] hover:shadow-[16px_16px_0px_#000] transition-all hover:-translate-y-2"
              >
                <h3 className="text-4xl font-black uppercase mb-8 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-2xl font-bold">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works – numbered blocks, raw */}
      <section id="how" className="py-32 px-6 md:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-7xl font-black uppercase mb-24 border-l-8 border-black pl-6">
            How It Works
          </h2>

          <div className="grid md:grid-cols-4 gap-12">
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
                className="border-4 border-black p-8 shadow-[8px_8px_0px_#000] hover:shadow-[12px_12px_0px_#000] transition-all"
              >
                <div className="text-6xl font-black mb-6 text-yellow-400">
                  {item.step}
                </div>
                <h3 className="text-3xl font-black uppercase mb-4">
                  {item.title}
                </h3>
                <p className="text-xl font-bold">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section
        id="privacy"
        className="py-32 px-6 md:px-12 lg:px-24 bg-black text-white"
      >
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-7xl font-black uppercase mb-20">
            PRIVACY BY DESIGN
          </h2>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white text-black p-12 border-4 border-black shadow-[12px_12px_0px_#000]">
              <h3 className="text-4xl font-black uppercase mb-8">
                ZERO-KNOWLEDGE ARCHITECTURE
              </h3>
              <p className="text-2xl font-bold">
                KEYS NEVER LEAVE YOUR DEVICE. WE CAN'T ACCESS YOUR DATA – EVER.
              </p>
            </div>

            <div className="bg-white text-black p-12 border-4 border-black shadow-[12px_12px_0px_#000]">
              <h3 className="text-4xl font-black uppercase mb-8">
                LOCAL INTELLIGENCE ONLY
              </h3>
              <p className="text-2xl font-bold">
                ALL PROCESSING IN BROWSER. NO SERVERS TOUCHED. NO TRACKING.
              </p>
            </div>
          </div>

          <p className="mt-20 text-4xl font-black uppercase">
            YOUR DOCS. YOUR KEYS. YOUR RULES.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 md:px-12 lg:px-24 text-center">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-7xl font-black uppercase mb-12">
            READY TO BUILD?
          </h2>
          <p className="text-3xl font-bold mb-12">
            SECURE DOCUMENTS WITH REAL INTELLIGENCE. NO COMPROMISE.
          </p>

          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-block px-16 py-10 text-4xl font-black uppercase bg-black text-white border-4 border-black shadow-[16px_16px_0px_#000] hover:shadow-[20px_20px_0px_#000] hover:bg-yellow-400 hover:text-black transition-all"
            >
              DASHBOARD NOW
            </Link>
          ) : (
            <Link
              to="/signup"
              className="inline-block px-16 py-10 text-4xl font-black uppercase bg-yellow-400 text-black border-4 border-black shadow-[16px_16px_0px_#000] hover:shadow-[20px_20px_0px_#000] hover:bg-black hover:text-yellow-400 transition-all"
            >
              CREATE VAULT
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 text-center text-xl font-bold uppercase border-t-4 border-black">
        © {new Date().getFullYear()} VaultVani – Raw Privacy. No Apologies.
      </footer>
    </div>
  );
}

export default Home;
