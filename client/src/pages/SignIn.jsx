// src/pages/SignIn.jsx

import axios from "axios";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { derivePBKDF2Key } from "../services/CryptoServices";

function SignIn() {
  const { setIsAuthenticated, setUser, unlockVaultKey } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:8000/api/auth/signIn",
        { email, password },
        { withCredentials: true },
      );

      toast.success(res.data.message);
      setUser(res.data.user);
      setIsAuthenticated(true);

      // NEW: Unlock vault key after login
      await unlockVaultKey(res.data.user._id);

      setTimeout(() => navigate("/dashboard"), 3000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
      setTimeout(() => navigate("/"), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Ambient glow background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-40%] left-[-30%] w-[1200px] h-[1200px] bg-gradient-to-br from-purple-900/5 via-indigo-900/5 to-transparent rounded-full blur-[180px] opacity-50" />
        <div className="absolute bottom-[-40%] right-[-40%] w-[1400px] h-[1400px] bg-gradient-to-tl from-amber-900/4 via-purple-900/4 to-transparent rounded-full blur-[200px] opacity-40" />
      </div>

      {/* Frosted glass container */}
      <div className="relative z-10 w-full max-w-md">
        <div
          className="
            backdrop-blur-3xl 
            bg-white/[0.06] 
            border border-white/[0.08] 
            rounded-3xl 
            p-10 md:p-12 
            shadow-2xl 
            shadow-black/70 
            ring-1 
            ring-inset 
            ring-purple-900/15 
            transition-all 
            duration-300 
            hover:ring-purple-700/25 
            hover:shadow-purple-900/10
          "
        >
          {/* Inner soft radial frost glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-500/2 via-purple-500/2 to-indigo-500/2 pointer-events-none" />

          {/* Title */}
          <div className="text-center mb-10 relative z-10">
            <h1 className="text-3xl font-medium tracking-tight bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
              VaultVani
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              Sign in to your secure vault
            </p>
          </div>

          {/* Form */}
          <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
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
                className="
                  w-full px-5 py-3.5 
                  bg-black/25 
                  border border-white/10 
                  rounded-xl 
                  text-white 
                  placeholder-gray-500 
                  focus:outline-none 
                  focus:border-purple-500/40 
                  focus:ring-2 
                  focus:ring-purple-500/20 
                  focus:bg-black/35 
                  transition-all duration-300 
                  backdrop-blur-sm
                "
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-300"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-purple-400 hover:text-purple-300 transition"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="
                  w-full px-5 py-3.5 
                  bg-black/25 
                  border border-white/10 
                  rounded-xl 
                  text-white 
                  placeholder-gray-500 
                  focus:outline-none 
                  focus:border-purple-500/40 
                  focus:ring-2 
                  focus:ring-purple-500/20 
                  focus:bg-black/35 
                  transition-all duration-300 
                  backdrop-blur-sm
                "
                placeholder="••••••••"
                required
              />
            </div>

            {/* Remember me */}
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-700 bg-black/40 text-purple-600 focus:ring-purple-500/30"
              />
              <label htmlFor="remember" className="ml-3 text-sm text-gray-400">
                Remember me
              </label>
            </div>

            <button
              type="submit"
              className="
                w-full py-4 
                bg-gradient-to-r from-amber-700 via-purple-700 to-indigo-700 
                hover:from-amber-600 hover:via-purple-600 hover:to-indigo-600 
                text-white font-medium 
                rounded-xl 
                transition duration-300 
                shadow-md hover:shadow-lg 
                backdrop-blur-md
              "
            >
              Sign In
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500 relative z-10">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-purple-400 hover:text-purple-300 font-medium transition"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
