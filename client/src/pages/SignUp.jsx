// src/pages/SignUp.jsx

import axios from "axios";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { entropyToMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { derivePBKDF2Key, encryptData } from "../services/CryptoServices";

function SignUp() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const { setIsAuthenticated, setUser, setVaultKey } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // 1️⃣ Create account (backend only handles auth)
      const res = await axios.post(
        "http://localhost:8000/api/auth/signUp",
        { userName, email, password },
        { withCredentials: true },
      );

      toast.success(res.data.message || "Account created!");

      const user = res.data.user;
      if (!user?._id) throw new Error("User ID missing");

      // 2️⃣ Generate random Vault Key (AES-256)
      const vaultKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
      );

      // Store vaultKey in context immediately (so user doesn’t need to re-unlock)
      // setVaultKey(vaultKey);

      // Export raw vault key for encryption
      const vaultKeyRaw = await crypto.subtle.exportKey("raw", vaultKey);

      // 3️⃣ Generate salt for PASSWORD encryption
      const salt = crypto.getRandomValues(new Uint8Array(16));

      // 4️⃣ Derive password key using PBKDF2
      const passwordDerivedKey = await derivePBKDF2Key(password, salt);

      // 5️⃣ Encrypt vaultKey with password-derived key
      const { encrypted: encryptedVaultKey, iv } = await encryptData(
        passwordDerivedKey,
        vaultKeyRaw,
      );

      // 6️⃣ Generate 12-word recovery phrase
      const entropy = crypto.getRandomValues(new Uint8Array(16)); // 128-bit
      const recoveryPhraseGenerated = entropyToMnemonic(entropy, wordlist);
      setRecoveryPhrase(recoveryPhraseGenerated);

      // 7️⃣ Generate recovery salt
      const recoverySalt = crypto.getRandomValues(new Uint8Array(16));

      // 8️⃣ Derive recovery key
      const recoveryDerivedKey = await derivePBKDF2Key(
        recoveryPhraseGenerated,
        recoverySalt,
      );

      // 9️⃣ Encrypt vaultKey with recovery key
      const { encrypted: encryptedVaultKeyWithRecovery, iv: recoveryIv } =
        await encryptData(recoveryDerivedKey, vaultKeyRaw);

      // 🔟 Send encrypted data to backend
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

      // Auth state
      setUser(user);
      setIsAuthenticated(true);

      // Clear sensitive password immediately
      setPassword("");

      // Show recovery modal
      setShowRecoveryModal(true);
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(
        error.response?.data?.message || error.message || "Signup failed",
      );
    }
  };

  const handleCopyPhrase = () => {
    navigator.clipboard.writeText(recoveryPhrase);
    toast.success("Recovery phrase copied!");
  };

  const handleConfirmPhrase = () => {
    toast.success("Vault setup complete!");
    setShowRecoveryModal(false);
    setTimeout(() => navigate("/dashboard"), 800);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Your background glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-40%] left-[-30%] w-[1200px] h-[1200px] bg-gradient-to-br from-purple-900/5 via-indigo-900/5 to-transparent rounded-full blur-[180px] opacity-50" />
        <div className="absolute bottom-[-40%] right-[-40%] w-[1400px] h-[1400px] bg-gradient-to-tl from-amber-900/4 via-purple-900/4 to-transparent rounded-full blur-[200px] opacity-40" />
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-3xl bg-white/[0.06] border border-white/[0.08] rounded-3xl p-10 md:p-12 shadow-2xl shadow-black/70 ring-1 ring-inset ring-purple-900/15 transition-all duration-300 hover:ring-purple-700/25 hover:shadow-purple-900/10">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-500/2 via-purple-500/2 to-indigo-500/2 pointer-events-none" />

          <div className="text-center mb-10 relative z-10">
            <h1 className="text-3xl font-medium tracking-tight bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
              VaultVani
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              Create your secure vault
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-5 py-3.5 bg-black/25 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/20 focus:bg-black/35 transition-all duration-300 backdrop-blur-sm"
                placeholder="yourusername"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3.5 bg-black/25 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/20 focus:bg-black/35 transition-all duration-300 backdrop-blur-sm"
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3.5 bg-black/25 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/20 focus:bg-black/35 transition-all duration-300 backdrop-blur-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-amber-700 via-purple-700 to-indigo-700 hover:from-amber-600 hover:via-purple-600 hover:to-indigo-600 text-white font-medium rounded-xl transition duration-300 shadow-md hover:shadow-lg backdrop-blur-md"
            >
              Create Account
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500 relative z-10">
            Already have an account?{" "}
            <Link
              to="/signin"
              className="text-purple-400 hover:text-purple-300 font-medium transition"
            >
              Sign In
            </Link>
          </p>

          <p className="mt-4 text-center text-sm relative z-10">
            <Link
              to="/forgot-password"
              className="text-purple-400 hover:text-purple-300 transition"
            >
              Forgot password?
            </Link>
          </p>
        </div>
      </div>

      {/* Recovery Phrase Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-black/60 backdrop-blur-3xl border border-purple-900/30 rounded-3xl p-8 max-w-lg w-full shadow-2xl shadow-purple-900/20">
            <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
              Your Recovery Phrase
            </h2>

            <p className="text-red-400 text-center mb-6 font-medium text-lg">
              ⚠️ IMPORTANT: Write this down NOW!
              <br />
              If you lose this phrase and forget your password, your data is
              gone forever.
            </p>

            <div className="bg-black/50 p-6 rounded-xl mb-6 break-words text-center text-lg font-mono text-gray-200 leading-relaxed">
              {recoveryPhrase}
            </div>

            <div className="flex gap-4 justify-center mb-6">
              <button
                onClick={handleCopyPhrase}
                className="px-8 py-4 bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white rounded-xl transition text-lg"
              >
                Copy Phrase
              </button>
            </div>

            <p className="text-sm text-gray-400 text-center mb-6">
              Save this phrase securely (paper, password manager, etc.).
              <br />
              You will need it if you ever forget your password.
            </p>

            <button
              onClick={handleConfirmPhrase}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium rounded-xl transition text-lg"
            >
              I Have Saved It – Continue to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SignUp;
