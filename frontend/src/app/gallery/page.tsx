"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getGallery, GalleryMod } from "@/lib/api";
import Header from "@/components/Header";

export default function GalleryPage() {
  const [mods, setMods] = useState<GalleryMod[]>([]);
  const [loading, setLoading] = useState(true);
  const [edition, setEdition] = useState("all");
  const [sort, setSort] = useState("recent");

  useEffect(() => {
    setLoading(true);
    getGallery(sort, edition)
      .then((data) => setMods(data.mods))
      .catch(() => setMods([]))
      .finally(() => setLoading(false));
  }, [sort, edition]);

  return (
    <main className="min-h-screen px-4 py-8 pt-20">
      <Header />
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-[#808080] hover:text-white"
              style={{ transition: "none" }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              Browse Mods
            </h1>
          </div>
          <Link href="/" className="mc-btn text-sm font-medium">
            Create Mod
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex mc-panel p-1 border border-[#3d3d3d]">
            {["all", "java", "bedrock"].map((e) => (
              <button
                key={e}
                onClick={() => setEdition(e)}
                className={`px-3 py-1.5 text-xs font-medium capitalize ${
                  edition === e
                    ? "bg-[#3d3d3d] text-white"
                    : "text-[#808080] hover:text-white"
                }`}
                style={{ transition: "none" }}
              >
                {e === "all" ? "All Editions" : e === "java" ? "Java" : "Bedrock"}
              </button>
            ))}
          </div>
          <div className="flex mc-panel p-1 border border-[#3d3d3d]">
            {[
              { key: "recent", label: "Recent" },
              { key: "popular", label: "Popular" },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`px-3 py-1.5 text-xs font-medium ${
                  sort === s.key
                    ? "bg-[#3d3d3d] text-white"
                    : "text-[#808080] hover:text-white"
                }`}
                style={{ transition: "none" }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex space-x-1">
              <div className="w-2.5 h-2.5 bg-[#d4a017] animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2.5 h-2.5 bg-[#d4a017] animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2.5 h-2.5 bg-[#d4a017] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        ) : mods.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#808080] text-lg mb-4">No mods found yet</p>
            <Link
              href="/"
              className="text-[#d4a017] hover:text-[#f0c040]"
              style={{ transition: "none" }}
            >
              Be the first to create one!
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mods.map((mod) => (
              <div
                key={mod.id}
                className="mc-panel border border-[#3d3d3d] p-5 hover:border-[#d4a017] group"
                style={{ transition: "none" }}
              >
                {/* Mod icon placeholder */}
                <div className="w-12 h-12 bg-[#3d3d3d] flex items-center justify-center mb-3 text-lg">
                  {mod.edition === "bedrock" ? (
                    <span className="text-blue-400">B</span>
                  ) : (
                    <span className="text-[#d4a017]">J</span>
                  )}
                </div>

                <h3
                  className="font-semibold text-white mb-1 group-hover:text-[#d4a017]"
                  style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}
                >
                  {mod.name}
                </h3>
                <p className="text-xs text-[#808080] mb-3 line-clamp-2">
                  {mod.description}
                </p>

                {/* Stats */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {mod.weapons_count > 0 && (
                    <span className="px-2 py-0.5 text-[10px] bg-red-900/30 text-red-400">
                      {mod.weapons_count} {mod.weapons_count === 1 ? "weapon" : "weapons"}
                    </span>
                  )}
                  {mod.tools_count > 0 && (
                    <span className="px-2 py-0.5 text-[10px] bg-yellow-900/30 text-yellow-400">
                      {mod.tools_count} {mod.tools_count === 1 ? "tool" : "tools"}
                    </span>
                  )}
                  {mod.armor_count > 0 && (
                    <span className="px-2 py-0.5 text-[10px] bg-blue-900/30 text-blue-400">
                      {mod.armor_count} armor
                    </span>
                  )}
                  {mod.food_count > 0 && (
                    <span className="px-2 py-0.5 text-[10px] bg-green-900/30 text-[#d4a017]">
                      {mod.food_count} food
                    </span>
                  )}
                  {mod.blocks_count > 0 && (
                    <span className="px-2 py-0.5 text-[10px] bg-purple-900/30 text-purple-400">
                      {mod.blocks_count} {mod.blocks_count === 1 ? "block" : "blocks"}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-[#808080]">
                    by {mod.author} &middot; {new Date(mod.created_at).toLocaleDateString()}
                  </div>
                  {mod.download_url && (
                    <a
                      href={mod.download_url}
                      className="text-xs text-[#d4a017] hover:text-[#f0c040] font-medium flex items-center gap-1"
                      style={{ transition: "none" }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
