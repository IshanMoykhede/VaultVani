// src/pages/ForgotPassword.jsx
import axios from "axios";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { entropyToMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import {
  derivePBKDF2Key,
  encryptData,
  decryptData,
} from "../services/CryptoServices";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRecoveryPhrase, setNewRecoveryPhrase] = useState(""); // ← NEW
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleRecoverVaultKey = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/auth/recovery-material`,
        { email },
        { withCredentials: true },
      );

      const { recoverySalt, encryptedVaultKeyWithRecovery, recoveryIv } =
        res.data;

      const recoveryDerived = await derivePBKDF2Key(
        recoveryPhrase,
        new Uint8Array(recoverySalt),
      );
      const decryptedRaw = await decryptData(
        recoveryDerived,
        new Uint8Array(encryptedVaultKeyWithRecovery),
        new Uint8Array(recoveryIv),
      );

      const recoveredVaultKey = await crypto.subtle.importKey(
        "raw",
        decryptedRaw,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
      );

      window.recoveredVaultKey = recoveredVaultKey;
      setStep(2);
      toast.success("Vault key recovered successfully");
    } catch (err) {
      toast.error("Invalid recovery phrase or email");
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const vaultKey = window.recoveredVaultKey;
      if (!vaultKey) throw new Error("Vault key not recovered");

      const newSalt = crypto.getRandomValues(new Uint8Array(16));
      const newPasswordDerived = await derivePBKDF2Key(newPassword, newSalt);

      const vaultKeyRaw = await crypto.subtle.exportKey("raw", vaultKey);
      const { encrypted: newEncrypted, iv: newIv } = await encryptData(
        newPasswordDerived,
        vaultKeyRaw,
      );

      // === NEW RECOVERY PHRASE ===
      const newEntropy = crypto.getRandomValues(new Uint8Array(16));
      const generatedNewPhrase = entropyToMnemonic(newEntropy, wordlist);
      const newRecoverySalt = crypto.getRandomValues(new Uint8Array(16));
      const newRecoveryDerived = await derivePBKDF2Key(
        generatedNewPhrase,
        newRecoverySalt,
      );
      const { encrypted: newRecEncrypted, iv: newRecIv } = await encryptData(
        newRecoveryDerived,
        vaultKeyRaw,
      );

      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/auth/update-vault-keys`,
        {
          email,
          password: newPassword, // ← Send plain password (backend will hash it)
          salt: Array.from(newSalt),
          encryptedVaultKey: Array.from(newEncrypted),
          iv: Array.from(newIv),
          recoverySalt: Array.from(newRecoverySalt),
          encryptedVaultKeyWithRecovery: Array.from(newRecEncrypted),
          recoveryIv: Array.from(newRecIv),
        },
        { withCredentials: true },
      );

      // Save the new phrase to show in Step 3
      setNewRecoveryPhrase(generatedNewPhrase);

      toast.success("Password changed successfully!");
      setStep(3);
    } catch (err) {
      toast.error("Failed to update password");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyNewPhrase = () => {
    navigator.clipboard.writeText(newRecoveryPhrase);
    toast.success("New recovery phrase copied!");
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono antialiased flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
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
            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tight bg-gradient-to-r from-orange-400 via-orange-300 to-orange-400 bg-clip-text text-transparent leading-none mb-3">
              VaultVani
            </h1>
            <p className="text-xl md:text-2xl font-semibold text-orange-400/90 uppercase tracking-wide">
              Recover Vault
            </p>
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <form onSubmit={handleRecoverVaultKey} className="space-y-6">
              {/* Email & Recovery Phrase inputs (same as before) */}
              <div>
                <label className="block text-lg font-semibold uppercase mb-2 text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 text-base bg-gray-900/50 border border-white/10 rounded-2xl focus:border-orange-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-lg font-semibold uppercase mb-2 text-gray-300">
                  Recovery Phrase
                </label>
                <textarea
                  placeholder="Enter your 12-word recovery phrase"
                  value={recoveryPhrase}
                  onChange={(e) => setRecoveryPhrase(e.target.value)}
                  className="w-full h-32 px-5 py-4 bg-gray-900/50 border border-white/10 rounded-2xl font-mono"
                  rows={4}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-4 rounded-2xl text-lg font-black uppercase bg-orange-600/90 text-white border border-orange-400/30 hover:bg-orange-500"
              >
                {loading ? "Recovering..." : "Recover Vault Key"}
              </button>
            </form>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <form onSubmit={handleSetNewPassword} className="space-y-6">
              <div>
                <label className="block text-lg font-semibold uppercase mb-2 text-gray-300">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-5 py-4 text-base bg-gray-900/50 border border-white/10 rounded-2xl"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-4 rounded-2xl text-lg font-black uppercase bg-orange-600/90 text-white border border-orange-400/30 hover:bg-orange-500"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          {/* Step 3 — NEW RECOVERY PHRASE SHOWN HERE */}
          {step === 3 && (
            <div className="text-center">
              <h1 className="text-4xl font-black text-green-400 mb-6">
                ✅ Success!
              </h1>
              <p className="text-lg text-gray-300 mb-8">
                Your vault is now secured with the new password.
              </p>

              <div className="text-center mb-8">
                <p className="text-xl font-bold text-red-400 mb-3 uppercase tracking-wide">
                  Critical: Save this new recovery phrase
                </p>
                <p className="text-base text-gray-300">
                  Losing this = permanent loss of access
                </p>
              </div>

              <div className="bg-gray-950/60 border border-white/10 rounded-2xl p-6 mb-8 text-center text-lg font-mono break-all text-orange-200">
                {newRecoveryPhrase}
              </div>

              <button
                onClick={handleCopyNewPhrase}
                className="px-8 py-4 rounded-2xl font-semibold text-base bg-orange-600/90 text-white border border-orange-400/30 hover:bg-orange-500 mb-6"
              >
                Copy New Recovery Phrase
              </button>

              <button
                onClick={() => navigate("/dashboard")}
                className="w-full py-5 rounded-2xl text-lg font-black uppercase bg-orange-600/90 text-white border border-orange-400/30 hover:bg-orange-500"
              >
                I've Saved It — Go to Dashboard
              </button>
            </div>
          )}

          {/* Links */}
          <div className="mt-8 text-center space-y-3 text-gray-400 text-base">
            <p>
              Remembered your password?{" "}
              <Link
                to="/signin"
                className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
            <p>
              Don’t have an account?{" "}
              <Link
                to="/signup"
                className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-gray-950/60 backdrop-blur-md py-5 text-center text-sm text-gray-400">
        VaultVani — Secure Vault Recovery • Your Keys, Your Rules
      </footer>
    </div>
  );
}
