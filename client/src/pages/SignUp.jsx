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
      const res = await axios.post(
        "http://localhost:8000/api/auth/signUp",
        { userName, email, password },
        { withCredentials: true },
      );

      toast.success(res.data.message || "Account created!");

      const user = res.data.user;
      if (!user?._id) throw new Error("User ID missing");

      const vaultKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
      );

      const vaultKeyRaw = await crypto.subtle.exportKey("raw", vaultKey);

      const salt = crypto.getRandomValues(new Uint8Array(16));
      const passwordDerivedKey = await derivePBKDF2Key(password, salt);

      const { encrypted: encryptedVaultKey, iv } = await encryptData(
        passwordDerivedKey,
        vaultKeyRaw,
      );

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
      setPassword("");

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
    <div className="min-h-screen bg-white text-black font-mono">
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div
          className="
            w-full max-w-lg
            bg-white
            border-4 border-black
            shadow-[16px_16px_0px_#000]
            p-10 md:p-14
          "
        >
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-6xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-4">
              Vault<span className="text-yellow-400">Vani</span>
            </h1>
            <p className="text-2xl font-bold uppercase tracking-widest">
              CREATE ACCOUNT
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-2xl font-black uppercase mb-3"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="
                  w-full px-6 py-5
                  text-xl font-bold
                  bg-white
                  border-4 border-black
                  shadow-[8px_8px_0px_#000]
                  focus:shadow-[12px_12px_0px_#000]
                  focus:outline-none
                  transition-all
                "
                placeholder="YOURUSERNAME"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-2xl font-black uppercase mb-3"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="
                  w-full px-6 py-5
                  text-xl font-bold
                  bg-white
                  border-4 border-black
                  shadow-[8px_8px_0px_#000]
                  focus:shadow-[12px_12px_0px_#000]
                  focus:outline-none
                  transition-all
                "
                placeholder="YOU@EXAMPLE.COM"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-2xl font-black uppercase mb-3"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="
                  w-full px-6 py-5
                  text-xl font-bold
                  bg-white
                  border-4 border-black
                  shadow-[8px_8px_0px_#000]
                  focus:shadow-[12px_12px_0px_#000]
                  focus:outline-none
                  transition-all
                "
                placeholder="••••••••"
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="
                w-full py-6
                text-3xl font-black uppercase
                bg-yellow-400
                border-4 border-black
                shadow-[12px_12px_0px_#000]
                hover:shadow-[16px_16px_0px_#000]
                hover:bg-black
                hover:text-yellow-400
                transition-all
              "
            >
              Create Vault
            </button>
          </form>

          {/* Links */}
          <div className="mt-12 text-center space-y-4 text-xl font-bold uppercase">
            <p>
              Already have account?{" "}
              <Link
                to="/signin"
                className="text-yellow-600 hover:text-yellow-700"
              >
                SIGN IN
              </Link>
            </p>
            <p>
              <Link
                to="/forgot-password"
                className="text-red-600 hover:text-red-700"
              >
                Forgot password?
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Recovery Phrase Modal – brutal warning style */}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-6">
          <div
            className="
              bg-white
              text-black
              border-4 border-black
              shadow-[16px_16px_0px_#000]
              p-10 md:p-14
              max-w-2xl w-full
            "
          >
            <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-center mb-8 leading-tight">
              RECOVERY PHRASE
            </h2>

            <div className="text-center mb-10">
              <p className="text-3xl font-black uppercase text-red-600 mb-4">
                WRITE THIS DOWN RIGHT NOW
              </p>
              <p className="text-2xl font-bold">
                LOSE THIS → LOSE YOUR DATA FOREVER
              </p>
            </div>

            <div className="border-4 border-black p-8 mb-10 text-center text-2xl font-mono font-bold break-all bg-white">
              {recoveryPhrase}
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-10">
              <button
                onClick={handleCopyPhrase}
                className="
                  px-10 py-6
                  text-2xl font-black uppercase
                  bg-yellow-400
                  border-4 border-black
                  shadow-[10px_10px_0px_#000]
                  hover:shadow-[14px_14px_0px_#000]
                  hover:bg-black
                  hover:text-yellow-400
                  transition-all
                "
              >
                Copy Phrase
              </button>
            </div>

            <p className="text-xl font-bold text-center mb-10 uppercase">
              Store this somewhere safe.
              <br />
              Paper. Metal. Not screenshot. Not cloud.
            </p>

            <button
              onClick={handleConfirmPhrase}
              className="
                w-full py-6
                text-3xl font-black uppercase
                bg-black
                text-white
                border-4 border-black
                shadow-[12px_12px_0px_#000]
                hover:shadow-[16px_16px_0px_#000]
                hover:bg-yellow-400
                hover:text-black
                transition-all
              "
            >
              I Saved It – Go To Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Brutal footer strip */}
      <footer className="fixed bottom-0 left-0 right-0 border-t-4 border-black bg-white py-4 text-center text-lg font-bold uppercase">
        VaultVani — Brutal Security • No Mercy
      </footer>
    </div>
  );
}

export default SignUp;
