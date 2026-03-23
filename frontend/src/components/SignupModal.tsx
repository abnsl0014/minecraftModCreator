"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  open: boolean;
  onClose: () => void;
  onSignup: () => void;
}

export async function isSignedUp(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export default function SignupModal({ open, onClose, onSignup }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signup" | "login">("signup");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
      }
      onSignup();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (oauthError) {
        setError(oauthError.message);
      }
    } catch {
      setError("Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="mc-panel w-full max-w-[380px] mx-4 p-0 relative" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b-[3px]" style={{ borderColor: "#3d3d3d" }}>
          <h2 className="text-[14px] text-[#d4a017] text-center mb-2"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {mode === "signup" ? "Sign Up to Create" : "Welcome Back"}
          </h2>
          <p className="text-[8px] text-[#808080] text-center"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {mode === "signup" ? "Free account required to build mods" : "Sign in to your account"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[9px] text-[#808080] mb-1.5"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Email *
            </label>
            <div className="mc-panel-inset">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@example.com"
                className="w-full bg-transparent px-3 py-2.5 text-[10px] text-[#c0c0c0] focus:outline-none placeholder-[#555]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}
                autoFocus
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] text-[#808080] mb-1.5"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Password *
            </label>
            <div className="mc-panel-inset">
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Min 6 characters"
                className="w-full bg-transparent px-3 py-2.5 text-[10px] text-[#c0c0c0] focus:outline-none placeholder-[#555]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <p className="text-[8px] text-[#ff5555]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {error}
            </p>
          )}

          <button type="submit" className="mc-btn w-full py-3 text-[10px]" disabled={loading}>
            {loading ? "..." : mode === "signup" ? "Create Account" : "Sign In"}
          </button>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mc-btn w-full py-3 text-[10px] flex items-center justify-center gap-2"
            style={{ borderColor: "#3d3d3d" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>{loading ? "..." : "Continue with Google"}</span>
          </button>

          {/* Toggle mode */}
          <p className="text-[7px] text-[#555] text-center"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
            <button
              type="button"
              onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }}
              className="text-[#d4a017] hover:text-[#f0c040]"
              style={{ transition: "none" }}
            >
              {mode === "signup" ? "Sign in" : "Sign up"}
            </button>
          </p>
        </form>

        {/* Close button */}
        <button onClick={onClose}
          className="absolute top-3 right-3 text-[#808080] hover:text-[#c0c0c0] text-[14px]"
          style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
          x
        </button>
      </div>
    </div>
  );
}
