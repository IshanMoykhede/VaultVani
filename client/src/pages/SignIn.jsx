// src/pages/SignIn.jsx

import axios from "axios";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

function SignIn() {
  const { setIsAuthenticated, setUser } = useAuth();
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

      setTimeout(() => navigate("/dashboard"), 3000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {/* Brutal centered form container */}
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
              SIGN IN
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-10">
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
              <div className="flex items-center justify-between mb-3">
                <label
                  htmlFor="password"
                  className="block text-2xl font-black uppercase"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xl font-black uppercase text-red-600 hover:text-red-700"
                >
                  Forgot?
                </Link>
              </div>
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

            {/* Remember me */}
            <div className="flex items-center gap-4">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="
                  h-8 w-8 
                  border-4 border-black 
                  bg-white 
                  text-yellow-400 
                  focus:ring-0
                "
              />
              <label htmlFor="remember" className="text-xl font-bold uppercase">
                Remember me
              </label>
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
              Sign In
            </button>
          </form>

          {/* Sign up link */}
          <p className="mt-12 text-center text-xl font-bold uppercase">
            No account?{" "}
            <Link
              to="/signup"
              className="text-yellow-600 hover:text-yellow-700"
            >
              SIGN UP HERE
            </Link>
          </p>
        </div>
      </div>

      {/* Brutal footer strip at bottom */}
      <footer className="fixed bottom-0 left-0 right-0 border-t-4 border-black bg-white py-4 text-center text-lg font-bold uppercase">
        VaultVani — Raw Security • No Excuses
      </footer>
    </div>
  );
}

export default SignIn;
