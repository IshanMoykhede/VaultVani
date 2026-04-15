// src/pages/SignIn.jsx
import axios from "axios";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast"; // assuming react-hot-toast is used consistently
import { useAuth } from "../context/AuthContext";

function SignIn() {
  const { setIsAuthenticated, setUser } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/auth/signIn`,
        { email, password },
        { withCredentials: true },
      );

      toast.success(res.data.message || "Signed in successfully");
      setUser(res.data.user);
      setIsAuthenticated(true);

      // Small delay for toast visibility
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (error) {
      toast.error(error.response?.data?.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono antialiased flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Main glass card */}
        <div
          className="
          bg-gray-900/30 backdrop-blur-2xl 
          border border-white/10 rounded-3xl 
          shadow-2xl shadow-black/70 
          p-8 md:p-12
        "
        >
          {/* Logo & Title */}
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
              Sign In
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
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
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-lg font-semibold uppercase text-gray-300"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
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

            {/* Remember me */}
            <div className="flex items-center gap-3">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                className="
                  h-5 w-5 rounded border-white/30 bg-gray-900/50 
                  text-orange-500 focus:ring-orange-500/30
                "
              />
              <label
                htmlFor="remember"
                className="text-base font-medium text-gray-300"
              >
                Remember me
              </label>
            </div>

            {/* Submit Button */}
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
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Sign up link */}
          <p className="mt-8 text-center text-gray-400">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
            >
              Sign up here
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-gray-950/60 backdrop-blur-md py-5 text-center text-sm text-gray-400">
        VaultVani — Secure Access • Local Encryption
      </footer>
    </div>
  );
}

export default SignIn;
