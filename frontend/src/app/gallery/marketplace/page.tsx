"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { searchExternalMods, ExternalMod } from "@/lib/api";

const FONT = { fontFamily: "var(--font-pixel), monospace" } as const;

export default function MarketplacePage() {
  const [query, setQuery] = useState("");
  const [mods, setMods] = useState<ExternalMod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await searchExternalMods(query, "modrinth", 24);
        if (!cancelled) setMods(data.mods);
      } catch (err) {
        console.error("Browse failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [query]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(searchInput);
  }

  return (
    <main className="min-h-screen px-4 py-8 pt-20">
      <Header />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/gallery" className="text-[#808080] hover:text-white" style={{ transition: "none" }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-[16px] text-[#d4a017]" style={FONT}>
                Mod Browser
              </h1>
              <p className="text-[8px] text-[#555] mt-1" style={FONT}>
                Browse thousands of mods from Modrinth
              </p>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-8 flex gap-2">
          <div className="mc-panel-inset flex items-center flex-1">
            <span className="pl-3 text-[#555] text-[10px]">&#128269;</span>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search Minecraft mods..."
              className="flex-1 px-3 py-3 text-[10px] text-[#c0c0c0] bg-transparent focus:outline-none"
              style={FONT}
            />
          </div>
          <button type="submit" className="mc-btn px-6 py-3 text-[9px]">
            Search
          </button>
        </form>

        {/* Results */}
        {loading ? (
          <div className="text-center py-20">
            <p className="text-[10px] text-[#808080]" style={FONT}>
              Loading mods from Modrinth...
            </p>
          </div>
        ) : mods.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[10px] text-[#808080] mb-2" style={FONT}>
              No mods found
            </p>
            <p className="text-[8px] text-[#555]" style={FONT}>
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mods.map(mod => (
              <a
                key={mod.id}
                href={mod.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mc-panel p-4 hover:border-[#d4a017] block"
                style={{ transition: "none" }}
              >
                <div className="flex gap-3 mb-3">
                  {mod.icon_url ? (
                    <img
                      src={mod.icon_url}
                      alt={mod.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-[#1a1a1a] flex items-center justify-center text-[#555] text-[16px]">
                      ?
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[10px] text-[#d4a017] truncate" style={FONT}>
                      {mod.name}
                    </h3>
                    <p className="text-[8px] text-[#808080]" style={FONT}>
                      by {mod.author}
                    </p>
                  </div>
                </div>

                <p className="text-[8px] text-[#c0c0c0] leading-relaxed mb-3 line-clamp-2" style={FONT}>
                  {mod.description}
                </p>

                <div className="flex items-center gap-3 text-[7px] text-[#555]" style={FONT}>
                  <span className="text-[#55ff55]">
                    {mod.downloads >= 1000 ? `${(mod.downloads / 1000).toFixed(1)}k` : mod.downloads} downloads
                  </span>
                  <span>
                    {mod.follows} follows
                  </span>
                  {mod.categories.length > 0 && (
                    <span className="text-[#808080]">
                      {mod.categories.slice(0, 2).join(", ")}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[7px] text-[#555] px-2 py-0.5 bg-[#1a1a1a] rounded" style={FONT}>
                    modrinth
                  </span>
                  <span className="text-[7px] text-[#808080]" style={FONT}>
                    View on Modrinth &#8594;
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
