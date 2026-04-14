import { useState } from "react";
import { FaLock, FaUnlock, FaShieldAlt } from "react-icons/fa";

export default function VaultUnlockModal({ onUnlock, isLoading }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter your vault password");
      return;
    }
    setError("");
    onUnlock(password);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-hidden">
      {/* Dynamic Blurred Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-500" />

      {/* Glassmorphism Modal Content */}
      <div className="relative w-full max-w-md bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl shadow-black/50 overflow-hidden group animate-in zoom-in-95 duration-300">
        
        {/* Subtle Gradient Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-orange-500/20 rounded-full blur-[80px] group-hover:bg-orange-500/30 transition-all duration-700" />
        
        <div className="relative flex flex-col items-center">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-orange-900/20 transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
            <FaShieldAlt className="text-4xl text-white" />
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white mb-3">Vault Locked</h2>
          <p className="text-zinc-400 text-center mb-10 leading-relaxed font-medium">
            Your documents are protected by end-to-end encryption. Enter your password to access your vault.
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Secure Password"
                className={`w-full bg-zinc-950/50 border ${error ? 'border-red-500/50' : 'border-white/10'} focus:border-orange-500/50 rounded-2xl px-6 py-4 text-white placeholder-zinc-600 focus:outline-none transition-all placeholder:font-sans`}
                autoFocus
                disabled={isLoading}
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-600">
                <FaLock className="text-lg" />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm font-medium text-center animate-in slide-in-from-top-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:from-zinc-800 disabled:to-zinc-800 py-4.5 rounded-2xl text-white font-bold text-lg tracking-wide shadow-xl shadow-orange-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Decrypting...
                </>
              ) : (
                <>
                  <FaUnlock className="text-sm opacity-80" />
                  Unlock Vault
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-xs text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            AES-GCM 256-bit Secure
          </p>
        </div>
      </div>
    </div>
  );
}
