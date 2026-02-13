// src/App.jsx  (or your landing/home page file)

import React from "react";
import { Link } from "react-router-dom"; // ← This is the key import

function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 font-sans antialiased relative overflow-x-hidden">
      {/* Deep layered background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#0f0b12] to-[#0a0a0f] pointer-events-none" />

      {/* Soft premium glow lighting (orange-purple-blue haze) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-50%] left-[-30%] w-[1400px] h-[1400px] bg-gradient-to-br from-purple-900/6 via-indigo-900/5 to-transparent rounded-full blur-[180px] opacity-60" />
        <div className="absolute bottom-[-40%] right-[-40%] w-[1600px] h-[1600px] bg-gradient-to-tl from-amber-900/5 via-purple-900/4 to-transparent rounded-full blur-[200px] opacity-50" />
      </div>

      {/* Floating glass navbar */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl mx-auto">
        <div className="backdrop-blur-2xl bg-black/35 border border-purple-900/20 rounded-full px-8 py-4 shadow-2xl shadow-black/60">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-medium tracking-tight bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
              VaultVani
            </div>

            <nav className="hidden md:flex items-center gap-10 text-sm font-medium text-gray-400">
              <Link
                to="/features"
                className="hover:text-purple-300 transition-colors duration-300"
              >
                Features
              </Link>
              <Link
                to="/how"
                className="hover:text-purple-300 transition-colors duration-300"
              >
                How It Works
              </Link>
              <Link
                to="/privacy"
                className="hover:text-purple-300 transition-colors duration-300"
              >
                Privacy
              </Link>
            </nav>

            <div className="flex items-center gap-5">
              <Link
                to="/signin"
                className="px-5 py-2 text-sm font-medium text-gray-300 hover:text-purple-300 transition duration-200"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="px-6 py-2.5 bg-gradient-to-r from-amber-700 via-purple-700 to-indigo-700 hover:from-amber-600 hover:via-purple-600 hover:to-indigo-600 text-white text-sm font-medium rounded-full transition duration-300 shadow-sm hover:shadow-md"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-48 pb-40 px-8 lg:px-16 flex flex-col items-center text-center relative z-10">
        <div className="max-w-4xl">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium leading-tight tracking-[-0.02em] mb-12 bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
            Documents that think.
            <br />
            Privacy that endures.
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-16 leading-relaxed">
            Upload once — encrypted locally.
            <br />
            Ask naturally — answers from your files only.
            <br />
            No intermediaries. No exposure.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              to="/signup"
              className="px-10 py-4 bg-gradient-to-r from-amber-700 via-purple-700 to-indigo-700 hover:from-amber-600 hover:via-purple-600 hover:to-indigo-600 text-white font-medium rounded-full transition duration-300 shadow-md hover:shadow-lg"
            >
              Create Vault
            </Link>

            <Link
              to="/signin"
              className="px-10 py-4 text-gray-300 hover:text-purple-300 font-medium transition duration-300"
            >
              Login →
            </Link>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-10 text-sm text-gray-500">
            <span>End-to-End Encrypted</span>
            <span className="hidden sm:block">•</span>
            <span>On-Device Intelligence</span>
            <span className="hidden sm:block">•</span>
            <span>Zero-Knowledge Design</span>
          </div>
        </div>
      </section>

      {/* Subtle divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-purple-900/20 to-transparent max-w-5xl mx-auto relative z-10" />

      {/* Features */}
      <section id="features" className="py-40 px-8 lg:px-16 relative z-10">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-medium text-center mb-24 text-white tracking-tight">
            Built differently
          </h2>

          <div className="grid md:grid-cols-3 gap-16">
            {[
              {
                title: "Zero-Knowledge Encryption",
                desc: "Your files are encrypted with your password before they ever leave your device. We never have — and never can — access your content.",
              },
              {
                title: "Natural Language Intelligence",
                desc: "Ask plain questions — “What’s my IFSC code?” or “Show branch address from passbook” — receive precise, context-aware answers from your documents.",
              },
              {
                title: "Completely Local Processing",
                desc: "No cloud servers. All reasoning and search happen directly in your browser — fast, private, and fully offline-capable.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-10 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-purple-900/20 hover:border-purple-700/30 transition-all duration-300"
              >
                <h3 className="text-2xl font-medium mb-6 bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed text-base">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how"
        className="py-40 px-8 lg:px-16 bg-black/15 relative z-10"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-medium text-center mb-24 text-white tracking-tight">
            How It Works
          </h2>

          <div className="grid md:grid-cols-4 gap-12 relative">
            {[
              {
                step: "01",
                title: "Sign Up Securely",
                desc: "Create your account. Your encryption key is derived locally from your password.",
              },
              {
                step: "02",
                title: "Upload Documents",
                desc: "Add PDFs, images, or scans — encryption happens instantly in your browser.",
              },
              {
                step: "03",
                title: "Ask Naturally",
                desc: "Type questions in plain language — AI searches only your encrypted files.",
              },
              {
                step: "04",
                title: "Get Precise Answers",
                desc: "Receive accurate responses with source references — everything stays private.",
              },
            ].map((step, i) => (
              <div
                key={i}
                className="relative flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 rounded-full bg-white/[0.05] backdrop-blur-md border border-purple-900/20 flex items-center justify-center text-purple-300 text-lg font-medium mb-6">
                  {step.step}
                </div>
                <h3 className="text-xl font-medium mb-4 text-white">
                  {step.title}
                </h3>
                <p className="text-gray-400 leading-relaxed text-base">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="py-40 px-8 lg:px-16 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-medium mb-20 text-white tracking-tight">
            Privacy by Design
          </h2>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="p-10 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-purple-900/20">
              <h3 className="text-2xl font-medium mb-6 bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                Zero-Knowledge Architecture
              </h3>
              <p className="text-gray-400 text-lg leading-relaxed">
                Your encryption keys never leave your device. We have no way to
                access your plaintext data — ever.
              </p>
            </div>

            <div className="p-10 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-purple-900/20">
              <h3 className="text-2xl font-medium mb-6 bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                Local Intelligence Only
              </h3>
              <p className="text-gray-400 text-lg leading-relaxed">
                All document processing and question answering occur in your
                browser. No data is sent to external servers for AI.
              </p>
            </div>
          </div>

          <p className="mt-16 text-xl text-gray-400">
            Your documents. Your keys. Your privacy.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 px-8 lg:px-16 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-medium mb-10 text-white tracking-tight">
            Ready to Begin?
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto">
            Protect your documents with intelligence that respects your privacy.
          </p>
          <Link
            to="/signup"
            className="inline-block px-12 py-5 bg-gradient-to-r from-amber-700 via-purple-700 to-indigo-700 hover:from-amber-600 hover:via-purple-600 hover:to-indigo-600 text-white font-medium text-lg rounded-full transition duration-300 backdrop-blur-md border border-purple-900/20 shadow-inner"
          >
            Create Your Vault
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-8 text-center text-gray-600 border-t border-purple-900/10 bg-black/60 relative z-10">
        <p>
          © {new Date().getFullYear()} VaultVani — Privacy-First Document
          Intelligence
        </p>
      </footer>
    </div>
  );
}

export default Home;
