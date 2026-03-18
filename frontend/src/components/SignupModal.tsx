"use client";

import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSignup: () => void;
}

export function isSignedUp(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("mc_signed_up") === "true";
}

export function markSignedUp(email: string, username?: string) {
  localStorage.setItem("mc_signed_up", "true");
  localStorage.setItem("mc_email", email);
  if (username) localStorage.setItem("mc_username", username);
}

export default function SignupModal({ open, onClose, onSignup }: Props) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    markSignedUp(email.trim(), username.trim() || undefined);
    onSignup();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="mc-panel w-full max-w-[380px] mx-4 p-0 relative" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b-[3px]" style={{ borderColor: "#3d3d3d" }}>
          <h2 className="text-[14px] text-[#d4a017] text-center mb-2"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Sign Up to Create
          </h2>
          <p className="text-[8px] text-[#808080] text-center"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Free account required to build mods
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
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] text-[#808080] mb-1.5"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Username <span className="text-[#555]">(optional)</span>
            </label>
            <div className="mc-panel-inset">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Steve"
                className="w-full bg-transparent px-3 py-2.5 text-[10px] text-[#c0c0c0] focus:outline-none placeholder-[#555]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}
              />
            </div>
          </div>

          {error && (
            <p className="text-[8px] text-[#ff5555]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {error}
            </p>
          )}

          <button type="submit" className="mc-btn w-full py-3 text-[10px]">
            Create Account
          </button>

          <p className="text-[7px] text-[#555] text-center"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Already have an account?{" "}
            <button type="button" onClick={handleSubmit} className="text-[#d4a017] hover:text-[#f0c040]"
              style={{ transition: "none" }}>
              Sign in
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
