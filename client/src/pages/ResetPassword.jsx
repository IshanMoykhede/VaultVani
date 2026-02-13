// src/pages/ResetPassword.jsx

import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");

  const token = new URLSearchParams(location.search).get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:8000/api/auth/setNewPass",
        { resetToken: token, password },
      );
      toast.success(res.data.message);
      navigate("/signin");
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* ... same ambient glow as above ... */}

      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-3xl bg-white/[0.06] border border-white/[0.08] rounded-3xl p-10 shadow-2xl shadow-black/70 ring-1 ring-inset ring-purple-900/15 transition-all duration-300 hover:ring-purple-700/25 hover:shadow-purple-900/10">
          {/* Inner glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-500/2 via-purple-500/2 to-indigo-500/2 pointer-events-none" />

          <div className="text-center mb-10 relative z-10">
            <h1 className="text-3xl font-medium tracking-tight bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
              VaultVani
            </h1>
            <p className="text-gray-400 mt-2 text-sm">Set your new password</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                New Password
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

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-amber-700 via-purple-700 to-indigo-700 hover:from-amber-600 hover:via-purple-600 hover:to-indigo-600 text-white font-medium rounded-xl transition duration-300 shadow-md hover:shadow-lg backdrop-blur-md"
            >
              Set New Password
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500 relative z-10">
            Remember your password?{" "}
            <Link
              to="/signin"
              className="text-purple-400 hover:text-purple-300 font-medium transition"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
