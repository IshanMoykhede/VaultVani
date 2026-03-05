// src/components/PasswordPrompt.jsx
import { useState } from "react";

export default function PasswordPrompt({ onUnlock, onCancel }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUnlock = async () => {
    if (!password.trim()) {
      setError("Enter password");
      return;
    }

    setLoading(true);
    setError("");

    const key = await onUnlock(password); // pass password to parent

    setLoading(false);

    if (!key) {
      setError("Wrong password or unlock failed");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-6 border-black shadow-[16px_16px_0_#000] p-10 max-w-lg w-full">
        <h2 className="text-4xl font-black uppercase mb-8 text-center border-b-4 border-red-600 pb-4">
          UNLOCK VAULT
        </h2>

        <p className="text-xl font-bold mb-6 text-center">
          Enter password to decrypt this file
        </p>

        {error && (
          <p className="text-red-600 font-bold text-center mb-6 border-l-8 border-red-600 pl-4">
            {error}
          </p>
        )}

        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          placeholder="Your password..."
          disabled={loading}
          className="
            w-full px-6 py-5 text-xl font-black uppercase
            border-4 border-black shadow-[8px_8px_0_#000]
            focus:shadow-[12px_12px_0_#000] focus:outline-none
            disabled:opacity-50
          "
        />

        <div className="flex gap-6 mt-8">
          <button
            onClick={onCancel}
            disabled={loading}
            className="
              flex-1 px-8 py-5 text-xl font-black uppercase
              bg-gray-300 text-black border-4 border-black shadow-[8px_8px_0_#000]
              hover:bg-gray-400 transition-all disabled:opacity-50
            "
          >
            CANCEL
          </button>

          <button
            onClick={handleUnlock}
            disabled={loading}
            className="
              flex-1 px-8 py-5 text-xl font-black uppercase
              bg-black text-white border-4 border-black shadow-[8px_8px_0_#000]
              hover:bg-green-600 hover:shadow-[12px_12px_0_#000] transition-all
              disabled:opacity-50 flex items-center justify-center gap-3
            "
          >
            {loading ? "UNLOCKING..." : "UNLOCK & DOWNLOAD"}
            {loading && <span className="animate-spin">⚡</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
