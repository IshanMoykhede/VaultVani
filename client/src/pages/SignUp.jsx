// src/pages/SignUp.jsx
import axios from "axios";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { entropyToMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { derivePBKDF2Key, encryptData } from "../services/CryptoServices";

function SignUp() {
  const navigate = useNavigate();
  const { setIsAuthenticated, setUser, setVaultKey } = useAuth();

  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        "http://localhost:8000/api/auth/signUp",
        { userName, email, password },
        { withCredentials: true },
      );

      toast.success(res.data.message || "Account created successfully");

      const user = res.data.user;
      if (!user?._id) throw new Error("User ID missing");

      // Generate vault key
      const vaultKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
      );

      const vaultKeyRaw = await crypto.subtle.exportKey("raw", vaultKey);

      // Derive from password
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const passwordDerivedKey = await derivePBKDF2Key(password, salt);

      const { encrypted: encryptedVaultKey, iv } = await encryptData(
        passwordDerivedKey,
        vaultKeyRaw,
      );

      // Generate recovery phrase
      const entropy = crypto.getRandomValues(new Uint8Array(16));
      const recoveryPhraseGenerated = entropyToMnemonic(entropy, wordlist);
      setRecoveryPhrase(recoveryPhraseGenerated);

      const recoverySalt = crypto.getRandomValues(new Uint8Array(16));
      const recoveryDerivedKey = await derivePBKDF2Key(
        recoveryPhraseGenerated,
        recoverySalt,
      );

      const { encrypted: encryptedVaultKeyWithRecovery, iv: recoveryIv } =
        await encryptData(recoveryDerivedKey, vaultKeyRaw);

      // Send crypto setup to backend
      await axios.post(
        "http://localhost:8000/api/auth/crypto/setup",
        {
          salt: Array.from(salt),
          encryptedVaultKey: Array.from(encryptedVaultKey),
          iv: Array.from(iv),
          recoverySalt: Array.from(recoverySalt),
          encryptedVaultKeyWithRecovery: Array.from(
            encryptedVaultKeyWithRecovery,
          ),
          recoveryIv: Array.from(recoveryIv),
        },
        { withCredentials: true },
      );

      setUser(user);
      setIsAuthenticated(true);
      setVaultKey(vaultKey); // optional — depending on your context usage
      setPassword("");

      setShowRecoveryModal(true);
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(
        error.response?.data?.message || error.message || "Signup failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPhrase = () => {
    navigator.clipboard.writeText(recoveryPhrase);
    toast.success("Recovery phrase copied to clipboard");
  };

  const handleConfirmPhrase = () => {
    toast.success("Vault setup complete — welcome!");
    setShowRecoveryModal(false);
    setTimeout(() => navigate("/dashboard"), 1000);
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono antialiased flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Main signup card */}
        <div
          className="
          bg-gray-900/30 backdrop-blur-2xl 
          border border-white/10 rounded-3xl 
          shadow-2xl shadow-black/70 
          p-8 md:p-12
        "
        >
          {/* Header */}
          <div className="text-center mb-10">
            <h1
              className="
              text-5xl md:text-6xl font-black uppercase tracking-tight 
              bg-gradient-to-r from-orange-400 via-orange-300 to-orange-400 
              bg-clip-text text-transparent leading-none mb-3
            "
            >
              VaultVani
            </h1>
            <p className="text-xl md:text-2xl font-semibold text-orange-400/90 uppercase tracking-wide">
              Create Account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-lg font-semibold uppercase mb-2 text-gray-300"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="yourusername"
                required
                disabled={loading}
                className="
                  w-full px-5 py-4 text-base bg-gray-900/50 
                  border border-white/10 rounded-2xl 
                  focus:border-orange-500/50 focus:outline-none 
                  placeholder-gray-500 transition-all duration-200
                  shadow-inner shadow-black/30
                "
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-lg font-semibold uppercase mb-2 text-gray-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
                className="
                  w-full px-5 py-4 text-base bg-gray-900/50 
                  border border-white/10 rounded-2xl 
                  focus:border-orange-500/50 focus:outline-none 
                  placeholder-gray-500 transition-all duration-200
                  shadow-inner shadow-black/30
                "
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-lg font-semibold uppercase mb-2 text-gray-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="
                  w-full px-5 py-4 text-base bg-gray-900/50 
                  border border-white/10 rounded-2xl 
                  focus:border-orange-500/50 focus:outline-none 
                  placeholder-gray-500 transition-all duration-200
                  shadow-inner shadow-black/30
                "
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-4 mt-4 rounded-2xl text-lg font-black uppercase
                bg-orange-600/90 text-white border border-orange-400/30
                hover:bg-orange-500 hover:border-orange-300/50
                hover:shadow-orange-900/50 transition-all duration-300
                shadow-lg shadow-orange-900/40 disabled:opacity-50
                disabled:cursor-not-allowed flex items-center justify-center gap-3
              "
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                  Creating Vault...
                </>
              ) : (
                "Create Vault"
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-8 text-center space-y-3 text-gray-400 text-base">
            <p>
              Already have an account?{" "}
              <Link
                to="/signin"
                className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
            <p>
              <Link
                to="/forgot-password"
                className="text-orange-400/80 hover:text-orange-300 transition-colors"
              >
                Forgot password?
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Recovery Phrase Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div
            className="
            bg-gray-900/40 backdrop-blur-2xl 
            border border-white/10 rounded-3xl 
            shadow-2xl shadow-black/70 
            p-8 md:p-12 max-w-lg w-full
          "
          >
            <h2
              className="
              text-3xl md:text-4xl font-black uppercase 
              text-orange-400 text-center mb-6 leading-tight
            "
            >
              Recovery Phrase
            </h2>

            <div className="text-center mb-8">
              <p className="text-xl font-bold text-red-400 mb-3 uppercase tracking-wide">
                Critical: Save this now
              </p>
              <p className="text-base text-gray-300">
                Losing this phrase = permanent loss of access to your vault
              </p>
            </div>

            <div
              className="
              bg-gray-950/60 border border-white/10 rounded-2xl 
              p-6 mb-8 text-center text-lg font-mono break-all text-orange-200
            "
            >
              {recoveryPhrase}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button
                onClick={handleCopyPhrase}
                className="
                  px-8 py-4 rounded-2xl font-semibold text-base
                  bg-orange-600/90 text-white border border-orange-400/30
                  hover:bg-orange-500 hover:border-orange-300/50
                  transition-all duration-300 shadow-lg shadow-orange-900/40
                "
              >
                Copy Phrase
              </button>
            </div>

            <p className="text-sm text-gray-400 text-center mb-8">
              Store securely offline (paper, metal plate, etc.)
              <br />
              Never screenshot, never store in cloud or notes app.
            </p>

            <button
              onClick={handleConfirmPhrase}
              className="
                w-full py-5 rounded-2xl text-lg font-black uppercase
                bg-orange-600/90 text-white border border-orange-400/30
                hover:bg-orange-500 hover:border-orange-300/50
                hover:shadow-orange-900/50 transition-all duration-300
                shadow-lg shadow-orange-900/40
              "
            >
              I've Saved It — Enter Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-gray-950/60 backdrop-blur-md py-5 text-center text-sm text-gray-400">
        VaultVani — Secure Vault Creation • Your Keys, Your Rules
      </footer>
    </div>
  );
}

export default SignUp;
