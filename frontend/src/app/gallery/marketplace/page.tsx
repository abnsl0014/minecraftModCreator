"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { searchExternalMods, ExternalMod } from "@/lib/api";

const FONT = { fontFamily: "var(--font-pixel), monospace" } as const;

function ModDetailModal({ mod, onClose }: { mod: ExternalMod | null; onClose: () => void }) {
  if (!mod) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="mc-panel w-full max-w-[500px] max-h-[80vh] overflow-y-auto p-0 relative"
        onClick={e => e.stopPropagation()}
        style={{ scrollbarWidth: "thin", scrollbarColor: "#3d3d3d #111" }}>
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b-[3px]" style={{ borderColor: "#3d3d3d" }}>
          <div className="flex gap-4 items-start">
            {mod.icon_url ? (
              <img src={mod.icon_url} alt={mod.name}
                className="w-16 h-16 rounded object-cover shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded bg-[#1a1a1a] flex items-center justify-center text-[#555] text-[20px] shrink-0">?</div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-[14px] text-[#d4a017] mb-1" style={FONT}>{mod.name}</h2>
              <p className="text-[9px] text-[#808080]" style={FONT}>by {mod.author}</p>
              <div className="flex gap-3 mt-2 text-[8px]" style={FONT}>
                <span className="text-[#55ff55]">
                  {mod.downloads >= 1000 ? `${(mod.downloads / 1000).toFixed(1)}k` : mod.downloads} downloads
                </span>
                <span className="text-[#808080]">{mod.follows} follows</span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <h3 className="text-[9px] text-[#808080] mb-2" style={FONT}>Description</h3>
            <p className="text-[10px] text-[#c0c0c0] leading-relaxed" style={FONT}>{mod.description}</p>
          </div>

          {mod.categories.length > 0 && (
            <div>
              <h3 className="text-[9px] text-[#808080] mb-2" style={FONT}>Categories</h3>
              <div className="flex flex-wrap gap-2">
                {mod.categories.map(cat => (
                  <span key={cat} className="text-[8px] text-[#d4a017] px-2 py-1 bg-[#1a1a1a] rounded" style={FONT}>{cat}</span>
                ))}
              </div>
            </div>
          )}

          {mod.game_versions.length > 0 && (
            <div>
              <h3 className="text-[9px] text-[#808080] mb-2" style={FONT}>Game Versions</h3>
              <div className="flex flex-wrap gap-1.5">
                {mod.game_versions.slice(0, 10).map(v => (
                  <span key={v} className="text-[7px] text-[#55ff55] px-1.5 py-0.5 border border-[#55ff55]/30 rounded" style={FONT}>{v}</span>
                ))}
                {mod.game_versions.length > 10 && (
                  <span className="text-[7px] text-[#555]" style={FONT}>+{mod.game_versions.length - 10} more</span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <span className="text-[7px] text-[#555] px-2 py-0.5 bg-[#1a1a1a] rounded" style={FONT}>
              {mod.source}
            </span>
            {mod.updated_at && (
              <span className="text-[7px] text-[#555]" style={FONT}>
                Updated: {new Date(mod.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t-[3px] flex gap-2" style={{ borderColor: "#3d3d3d" }}>
          <a href={mod.url} target="_blank" rel="noopener noreferrer"
            className="mc-btn flex-1 py-2.5 text-[9px] text-center" style={FONT}>
            Open on Modrinth
          </a>
          <button onClick={onClose}
            className="mc-btn px-4 py-2.5 text-[9px] text-[#808080]" style={FONT}>
            Close
          </button>
        </div>

        {/* Close X */}
        <button onClick={onClose}
          className="absolute top-3 right-3 text-[#808080] hover:text-[#c0c0c0] text-[14px]"
          style={{ ...FONT, transition: "none" }}>
          x
        </button>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const [query, setQuery] = useState("");
  const [mods, setMods] = useState<ExternalMod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [selectedMod, setSelectedMod] = useState<ExternalMod | null>(null);

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
              <button
                key={mod.id}
                onClick={() => setSelectedMod(mod)}
                className="mc-panel p-4 hover:border-[#d4a017] block text-left w-full"
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
                    View Details &#8594;
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <ModDetailModal mod={selectedMod} onClose={() => setSelectedMod(null)} />
      </div>
    </main>
  );
}
