"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ModCard from "@/components/explore/ModCard";
import ModDetailModal from "@/components/explore/ModDetailModal";
import SubmitModModal from "@/components/explore/SubmitModModal";
import PixelEmoji from "@/components/PixelEmoji";
import { ExploreMod, MOCK_EXPLORE_MODS, CATEGORY_CONFIG } from "@/lib/exploreData";

type Tab = "explore" | "featured" | "community";
type CategoryFilter = "all" | ExploreMod["category"];
type SortKey = "recent" | "popular" | "downloads";

export default function ExplorePage() {
  const [tab, setTab] = useState<Tab>("explore");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<SortKey>("popular");
  const [search, setSearch] = useState("");
  const [selectedMod, setSelectedMod] = useState<ExploreMod | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);

  const allMods = MOCK_EXPLORE_MODS.filter(m => m.status === "approved");

  const filteredMods = useMemo(() => {
    let mods = [...allMods];

    // Tab filter
    if (tab === "featured") {
      mods = mods.filter(m => m.featured);
    } else if (tab === "community") {
      mods = mods.filter(m => !m.featured);
    }

    // Category filter
    if (category !== "all") {
      mods = mods.filter(m => m.category === category);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      mods = mods.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.tags.some(t => t.includes(q)) ||
        m.author.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sort === "popular") {
      mods.sort((a, b) => b.likes - a.likes);
    } else if (sort === "downloads") {
      mods.sort((a, b) => b.downloads - a.downloads);
    } else {
      mods.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return mods;
  }, [allMods, tab, category, sort, search]);

  const featuredMods = allMods.filter(m => m.featured);

  return (
    <main className="min-h-screen px-4 py-8 pt-20">
      <Header />
      <div className="max-w-6xl mx-auto">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[#808080] hover:text-white" style={{ transition: "none" }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-[16px] text-[#d4a017]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Explore Mods
              </h1>
              <p className="text-[8px] text-[#555] mt-1"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {allMods.length} mods available
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSubmit(true)}
              className="mc-btn px-4 py-2 text-[9px] flex items-center gap-2">
              + Submit Your Mod
            </button>
            <Link href="/gallery/admin"
              className="mc-btn px-3 py-2 text-[9px]"
              style={{ color: "#808080" }}>
              Admin
            </Link>
          </div>
        </div>

        {/* Tabs: Explore / Featured / Community */}
        <div className="flex items-center gap-0 mb-6 mc-panel p-1 w-fit">
          {([
            { key: "explore" as Tab, label: "Explore" },
            { key: "featured" as Tab, label: "Featured" },
            { key: "community" as Tab, label: "Community" },
          ]).map(t => (
            <button key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-[9px] ${
                tab === t.key
                  ? "bg-[#3d3d3d] text-[#d4a017]"
                  : "text-[#555] hover:text-[#808080]"
              }`}
              style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Featured banner (only on explore tab) */}
        {tab === "explore" && featuredMods.length > 0 && (
          <div className="mb-8">
            <h2 className="text-[10px] text-[#d4a017] mb-3 flex items-center gap-2"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              <span>★</span> Marketplace Picks
              <Link href="/gallery/marketplace"
                className="text-[8px] text-[#555] hover:text-[#808080] ml-auto"
                style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
                View All →
              </Link>
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
              {featuredMods.map(mod => (
                <div key={mod.id} className="shrink-0 w-[280px]">
                  <ModCard mod={mod} onSelect={setSelectedMod} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="mc-panel-inset flex items-center flex-1 min-w-[200px] max-w-[300px]">
            <span className="pl-3 text-[#555] text-[10px]">🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search mods..."
              className="flex-1 px-2 py-2 text-[9px] text-[#c0c0c0] bg-transparent focus:outline-none"
              style={{ fontFamily: "var(--font-pixel), monospace" }} />
          </div>

          {/* Category filter */}
          <div className="flex mc-panel p-1">
            <button
              onClick={() => setCategory("all")}
              className={`px-2.5 py-1.5 text-[8px] ${
                category === "all" ? "bg-[#3d3d3d] text-white" : "text-[#555] hover:text-[#808080]"
              }`}
              style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
              All
            </button>
            {(Object.entries(CATEGORY_CONFIG) as [ExploreMod["category"], typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][]).map(([key, config]) => (
              <button key={key}
                onClick={() => setCategory(key)}
                className={`px-2.5 py-1.5 text-[8px] ${
                  category === key ? "bg-[#3d3d3d]" : "hover:text-[#808080]"
                }`}
                style={{
                  fontFamily: "var(--font-pixel), monospace",
                  transition: "none",
                  color: category === key ? config.color : "#555",
                }}>
                <PixelEmoji emoji={config.icon} size={14} resolution={7} /> {config.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex mc-panel p-1">
            {([
              { key: "popular" as SortKey, label: "Most Liked" },
              { key: "downloads" as SortKey, label: "Most Downloaded" },
              { key: "recent" as SortKey, label: "Recent" },
            ]).map(s => (
              <button key={s.key}
                onClick={() => setSort(s.key)}
                className={`px-2.5 py-1.5 text-[8px] ${
                  sort === s.key ? "bg-[#3d3d3d] text-white" : "text-[#555] hover:text-[#808080]"
                }`}
                style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mod grid */}
        {filteredMods.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[32px] mb-4">🔍</p>
            <p className="text-[10px] text-[#808080] mb-2"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              No mods found
            </p>
            <p className="text-[8px] text-[#555]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {search ? "Try different search terms" : "Be the first to submit one!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMods.map(mod => (
              <ModCard key={mod.id} mod={mod} onSelect={setSelectedMod} />
            ))}
          </div>
        )}

        {/* Stats footer */}
        <div className="mt-12 pt-6 border-t border-[#1a1a1a] flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-[14px] text-[#d4a017]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {allMods.length}
            </div>
            <div className="text-[7px] text-[#555] mt-1"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Total Mods
            </div>
          </div>
          <div className="text-center">
            <div className="text-[14px] text-[#ff5555]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {allMods.reduce((sum, m) => sum + m.likes, 0)}
            </div>
            <div className="text-[7px] text-[#555] mt-1"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Total Likes
            </div>
          </div>
          <div className="text-center">
            <div className="text-[14px] text-[#55ff55]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {allMods.reduce((sum, m) => sum + m.downloads, 0).toLocaleString()}
            </div>
            <div className="text-[7px] text-[#555] mt-1"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Downloads
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ModDetailModal mod={selectedMod} onClose={() => setSelectedMod(null)} />
      <SubmitModModal
        open={showSubmit}
        onClose={() => setShowSubmit(false)}
        onSubmitted={() => setShowSubmit(false)}
      />
    </main>
  );
}
