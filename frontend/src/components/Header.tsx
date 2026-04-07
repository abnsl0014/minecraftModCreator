"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/api";

const NAV_LINKS = [
  { href: "/gallery", label: "Explore" },
  { href: "/gallery/marketplace", label: "Marketplace" },
  { href: "/create", label: "Create" },
  { href: "/create/skins", label: "Skins" },
  { href: "/pricing", label: "Tokens" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const loggedIn = !!data.session;
      setAuthed(loggedIn);
      if (loggedIn) {
        getUserProfile().then(p => {
          setTokenBalance(p.token_balance);
          setIsAdmin(!!p.is_admin);
        }).catch(() => {});
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const loggedIn = !!session;
      setAuthed(loggedIn);
      if (loggedIn) {
        getUserProfile().then(p => {
          setTokenBalance(p.token_balance);
          setIsAdmin(!!p.is_admin);
        }).catch(() => {});
      } else {
        setTokenBalance(null);
        setIsAdmin(false);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  function isActive(href: string) {
    if (href === "/gallery") return pathname === "/gallery";
    if (href === "/create") return pathname === "/create";
    return pathname.startsWith(href);
  }

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

        <nav className="hidden sm:flex items-center gap-5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[10px] ${
                isActive(link.href)
                  ? "text-[#d4a017]"
                  : "text-[#808080] hover:text-[#c0c0c0]"
              }`}
              style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}
            >
              {link.label}
            </Link>
          ))}
          {authed && (
            <Link
              href="/gallery/my-submissions"
              className={`text-[10px] ${isActive("/gallery/my-submissions") ? "text-[#d4a017]" : "text-[#808080] hover:text-[#c0c0c0]"}`}
              style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}
            >
              My Submissions
            </Link>
          )}
          {authed && isAdmin && (
            <Link
              href="/gallery/admin"
              className={`text-[10px] ${isActive("/gallery/admin") ? "text-[#d4a017]" : "text-[#808080] hover:text-[#c0c0c0]"}`}
              style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}
            >
              Admin
            </Link>
          )}
          {authed && tokenBalance !== null ? (
            <Link href="/pricing"
              className="mc-btn text-[10px] px-3 py-1.5 flex items-center gap-2"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              <span className="text-[#d4a017]">{tokenBalance}</span>
              <span className="text-[#808080]">tokens</span>
            </Link>
          ) : (
            <a href="#hero-prompt"
              className="mc-btn text-[10px] px-3 py-1.5">
              Get Started
            </a>
          )}
          {authed && (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
              }}
              className="text-[10px] text-[#808080] hover:text-red-400 px-2 py-1 border border-[#3d3d3d] hover:border-red-400"
              style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}
            >
              Sign Out
            </button>
          )}
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
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`text-[10px] ${
                isActive(link.href)
                  ? "text-[#d4a017]"
                  : "text-[#808080] hover:text-[#c0c0c0]"
              }`}
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              {link.label}
            </Link>
          ))}
          {authed && (
            <Link
              href="/gallery/my-submissions"
              onClick={() => setMenuOpen(false)}
              className={`text-[10px] ${isActive("/gallery/my-submissions") ? "text-[#d4a017]" : "text-[#808080] hover:text-[#c0c0c0]"}`}
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              My Submissions
            </Link>
          )}
          {authed && isAdmin && (
            <Link
              href="/gallery/admin"
              onClick={() => setMenuOpen(false)}
              className={`text-[10px] ${isActive("/gallery/admin") ? "text-[#d4a017]" : "text-[#808080] hover:text-[#c0c0c0]"}`}
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              Admin
            </Link>
          )}
          {authed && tokenBalance !== null ? (
            <Link href="/pricing" onClick={() => setMenuOpen(false)}
              className="mc-btn text-[10px] px-3 py-1.5 text-center flex items-center justify-center gap-2"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              <span className="text-[#d4a017]">{tokenBalance}</span>
              <span className="text-[#808080]">tokens</span>
            </Link>
          ) : (
            <a href="#hero-prompt" onClick={() => setMenuOpen(false)}
              className="mc-btn text-[10px] px-3 py-1.5 text-center">
              Get Started
            </a>
          )}
          {authed && (
            <button
              onClick={async () => {
                setMenuOpen(false);
                await supabase.auth.signOut();
                router.push("/");
              }}
              className="text-[10px] text-[#808080] hover:text-red-400 px-2 py-1 border border-[#3d3d3d] hover:border-red-400 text-center"
              style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}
            >
              Sign Out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
