"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getGallery, GalleryMod } from "@/lib/api";

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
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-white">Browse Mods</h1>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create Mod
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex bg-gray-800/60 rounded-lg p-1 border border-gray-700/50">
            {["all", "java", "bedrock"].map((e) => (
              <button
                key={e}
                onClick={() => setEdition(e)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                  edition === e
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {e === "all" ? "All Editions" : e === "java" ? "Java" : "Bedrock"}
              </button>
            ))}
          </div>
          <div className="flex bg-gray-800/60 rounded-lg p-1 border border-gray-700/50">
            {[
              { key: "recent", label: "Recent" },
              { key: "popular", label: "Popular" },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  sort === s.key
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
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
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        ) : mods.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-4">No mods found yet</p>
            <Link href="/" className="text-green-400 hover:text-green-300 transition-colors">
              Be the first to create one!
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mods.map((mod) => (
              <div
                key={mod.id}
                className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5 hover:border-gray-600/50 transition-all group"
              >
                {/* Mod icon placeholder */}
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mb-3 text-lg">
                  {mod.edition === "bedrock" ? (
                    <span className="text-blue-400">B</span>
                  ) : (
                    <span className="text-green-400">J</span>
                  )}
                </div>

                <h3 className="font-semibold text-white mb-1 group-hover:text-green-400 transition-colors">
                  {mod.name}
                </h3>
                <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                  {mod.description}
                </p>

                {/* Stats */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {mod.weapons_count > 0 && (
                    <span className="px-2 py-0.5 text-[10px] bg-red-900/30 text-red-400 rounded-full">
                      {mod.weapons_count} {mod.weapons_count === 1 ? "weapon" : "weapons"}
                    </span>
                  )}
                  {mod.tools_count > 0 && (
                    <span className="px-2 py-0.5 text-[10px] bg-yellow-900/30 text-yellow-400 rounded-full">
                      {mod.tools_count} {mod.tools_count === 1 ? "tool" : "tools"}
                    </span>
                  )}
                  {mod.armor_count > 0 && (
                    <span className="px-2 py-0.5 text-[10px] bg-blue-900/30 text-blue-400 rounded-full">
                      {mod.armor_count} armor
                    </span>
                  )}
                  {mod.food_count > 0 && (
                    <span className="px-2 py-0.5 text-[10px] bg-green-900/30 text-green-400 rounded-full">
                      {mod.food_count} food
                    </span>
                  )}
                  {mod.blocks_count > 0 && (
                    <span className="px-2 py-0.5 text-[10px] bg-purple-900/30 text-purple-400 rounded-full">
                      {mod.blocks_count} {mod.blocks_count === 1 ? "block" : "blocks"}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-gray-500">
                    by {mod.author} &middot; {new Date(mod.created_at).toLocaleDateString()}
                  </div>
                  {mod.download_url && (
                    <a
                      href={mod.download_url}
                      className="text-xs text-green-400 hover:text-green-300 font-medium transition-colors flex items-center gap-1"
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
