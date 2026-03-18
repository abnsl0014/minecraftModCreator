"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a] border-b-[3px]"
      style={{ borderColor: "#3d3d3d" }}>
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-[12px] tracking-widest text-[#d4a017]"
          style={{ fontFamily: "var(--font-pixel), monospace" }}>
          MODCRAFTER
        </Link>

        <nav className="hidden sm:flex items-center gap-6">
          <Link href="/gallery"
            className="text-[10px] text-[#808080] hover:text-[#c0c0c0]"
            style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
            Explore
          </Link>
          <Link href="/gallery/marketplace"
            className="text-[10px] text-[#808080] hover:text-[#c0c0c0]"
            style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
            Marketplace
          </Link>
          <Link href="/create"
            className="text-[10px] text-[#808080] hover:text-[#c0c0c0]"
            style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
            Create
          </Link>
          <Link href="/builder"
            className="text-[10px] text-[#808080] hover:text-[#c0c0c0]"
            style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
            Builder
          </Link>
          <a href="#hero-prompt"
            className="mc-btn text-[10px] px-3 py-1.5">
            Get Started
          </a>
        </nav>

        <button
          className="sm:hidden flex flex-col gap-1 p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className="block w-5 h-[3px] bg-[#d4a017]" />
          <span className="block w-5 h-[3px] bg-[#d4a017]" />
          <span className="block w-5 h-[3px] bg-[#d4a017]" />
        </button>
      </div>

      {menuOpen && (
        <div ref={menuRef} className="sm:hidden mc-panel mx-4 mb-2 p-4 flex flex-col gap-4">
          <Link href="/gallery" onClick={() => setMenuOpen(false)}
            className="text-[10px] text-[#808080] hover:text-[#c0c0c0]"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Explore
          </Link>
          <Link href="/gallery/marketplace" onClick={() => setMenuOpen(false)}
            className="text-[10px] text-[#808080] hover:text-[#c0c0c0]"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Marketplace
          </Link>
          <Link href="/create" onClick={() => setMenuOpen(false)}
            className="text-[10px] text-[#808080] hover:text-[#c0c0c0]"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Create
          </Link>
          <Link href="/builder" onClick={() => setMenuOpen(false)}
            className="text-[10px] text-[#808080] hover:text-[#c0c0c0]"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Builder
          </Link>
          <a href="#hero-prompt" onClick={() => setMenuOpen(false)}
            className="mc-btn text-[10px] px-3 py-1.5 text-center">
            Get Started
          </a>
        </div>
      )}
    </header>
  );
}
