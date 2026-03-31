"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ModCard from "@/components/explore/ModCard";
import ModDetailModal from "@/components/explore/ModDetailModal";
import SubmitModModal from "@/components/explore/SubmitModModal";
import PixelEmoji from "@/components/PixelEmoji";
import { ExploreMod, CATEGORY_CONFIG } from "@/lib/exploreData";
import { getGalleryMods, getMyMods, GalleryMod, MyMod } from "@/lib/api";
import { isAuthenticated } from "@/lib/supabase";
import AdBanner from "@/components/AdBanner";

type Tab = "explore" | "featured" | "community" | "my-mods";
type CategoryFilter = "all" | ExploreMod["category"];
type SortKey = "recent" | "popular" | "downloads";

/** Map a GalleryMod from the API into the ExploreMod shape used by ModCard / ModDetailModal */
function toExploreMod(g: GalleryMod): ExploreMod {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    author: g.author,
    edition: g.edition,
    category: g.item_count > 0 ? "weapon" : g.block_count > 0 ? "block" : "tool",
    thumbnail: null,
    videoUrl: null,
    screenshots: [],
    craftingRecipe: Array(9).fill(null),
    survivalGuide: "",
    downloads: 0,
    likes: 0,
    status: "approved",
    featured: false,
    createdAt: g.created_at,
    tags: [g.edition, g.model_used],
    download_url: g.download_url,
  };
}

export default function ExplorePage() {
  const [tab, setTab] = useState<Tab>("explore");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<SortKey>("popular");
  const [search, setSearch] = useState("");
  const [selectedMod, setSelectedMod] = useState<ExploreMod | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);

  const [mods, setMods] = useState<GalleryMod[]>([]);
  const [myMods, setMyMods] = useState<MyMod[]>([]);
  const [totalMods, setTotalMods] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  // Check auth state
  useEffect(() => {
    isAuthenticated().then(setLoggedIn);
  }, []);

  // Fetch mods from API whenever sort or tab changes
  useEffect(() => {
    let cancelled = false;
    async function fetchMods() {
      try {
        setLoading(true);
        if (tab === "my-mods") {
          const data = await getMyMods();
          if (!cancelled) {
            setMyMods(data.mods);
            setTotalMods(data.total);
          }
        } else {
          const editionParam = "all";
          const data = await getGalleryMods(sort, editionParam);
          if (!cancelled) {
            setMods(data.mods);
            setTotalMods(data.total);
          }
        }
      } catch (err) {
        console.error("Failed to fetch gallery:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchMods();
    return () => { cancelled = true; };
  }, [sort, tab]);

  const allMods = useMemo(() => mods.map(toExploreMod), [mods]);

  const filteredMods = useMemo(() => {
    let list = [...allMods];

    // Tab filter
    if (tab === "featured") {
      list = list.filter(m => m.featured);
    } else if (tab === "community") {
      list = list.filter(m => !m.featured);
    }

    // Category filter
    if (category !== "all") {
      list = list.filter(m => m.category === category);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.tags.some(t => t.includes(q)) ||
        m.author.toLowerCase().includes(q)
      );
    }

    // Sort (client-side secondary sort)
    if (sort === "popular") {
      list.sort((a, b) => b.likes - a.likes);
    } else if (sort === "downloads") {
      list.sort((a, b) => b.downloads - a.downloads);
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [allMods, tab, category, sort, search]);

  const featuredMods = allMods.filter(m => m.featured);

  return (
    <main className="min-h-screen px-3 sm:px-4 py-6 pt-18 sm:pt-20">
      <Header />
      <div className="max-w-6xl mx-auto">

        {/* Page header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="text-[#808080] hover:text-white shrink-0" style={{ transition: "none" }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="text-[14px] sm:text-[16px] text-[#d4a017] truncate"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Explore Mods
              </h1>
              <p className="text-[8px] text-[#555] mt-1"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {totalMods} mods available
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowSubmit(true)}
              className="mc-btn px-3 py-2 text-[8px] sm:text-[9px] flex items-center gap-1">
              <span className="hidden sm:inline">+</span> Submit
            </button>
            <Link href="/gallery/admin"
              className="mc-btn px-2 sm:px-3 py-2 text-[8px] sm:text-[9px]"
              style={{ color: "#808080" }}>
              Admin
            </Link>
          </div>
        </div>

        {/* Tabs: Explore / Featured / Community */}
        <div className="flex items-center gap-0 mb-4 mc-panel p-1 overflow-x-auto w-full sm:w-fit" style={{ scrollbarWidth: "none" }}>
          {([
            { key: "explore" as Tab, label: "Explore" },
            { key: "featured" as Tab, label: "Featured" },
            { key: "community" as Tab, label: "Community" },
            ...(loggedIn ? [{ key: "my-mods" as Tab, label: "My Mods" }] : []),
          ]).map(t => (
            <button key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 sm:px-4 py-2 text-[9px] whitespace-nowrap shrink-0 ${
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

        {/* Search */}
        <div className="mc-panel-inset flex items-center mb-3">
          <span className="pl-3 text-[#555] text-[10px]">🔍</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search mods..."
            className="flex-1 px-2 py-2 text-[9px] text-[#c0c0c0] bg-transparent focus:outline-none"
            style={{ fontFamily: "var(--font-pixel), monospace" }} />
        </div>

        {/* Category filter */}
        <div className="flex overflow-x-auto mc-panel p-1 mb-3" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          <button
            onClick={() => setCategory("all")}
            className={`px-2.5 py-1.5 text-[8px] shrink-0 whitespace-nowrap ${
              category === "all" ? "bg-[#3d3d3d] text-white" : "text-[#555] hover:text-[#808080]"
            }`}
            style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
            All
          </button>
          {(Object.entries(CATEGORY_CONFIG) as [ExploreMod["category"], typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][]).map(([key, config]) => (
            <button key={key}
              onClick={() => setCategory(key)}
              className={`px-2.5 py-1.5 text-[8px] shrink-0 whitespace-nowrap ${
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
        <div className="flex overflow-x-auto mc-panel p-1 mb-6" style={{ scrollbarWidth: "none" }}>
          {([
            { key: "popular" as SortKey, label: "Most Liked" },
            { key: "downloads" as SortKey, label: "Most Downloaded" },
            { key: "recent" as SortKey, label: "Recent" },
          ]).map(s => (
            <button key={s.key}
              onClick={() => setSort(s.key)}
              className={`px-2.5 py-1.5 text-[8px] shrink-0 whitespace-nowrap ${
                sort === s.key ? "bg-[#3d3d3d] text-white" : "text-[#555] hover:text-[#808080]"
              }`}
              style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
              {s.label}
            </button>
          ))}
        </div>

        <AdBanner slot="gallery-feed" className="my-4" />

        {/* My Mods tab content */}
        {tab === "my-mods" ? (
          loading ? (
            <div className="text-center py-20">
              <p className="text-[10px] text-[#808080]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Loading your mods...
              </p>
            </div>
          ) : myMods.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[32px] mb-4">🔨</p>
              <p className="text-[10px] text-[#808080] mb-2"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                You haven&apos;t created any mods yet
              </p>
              <Link href="/create"
                className="mc-btn px-4 py-2 text-[9px] inline-block mt-3"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Create Your First Mod
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {myMods.map(mod => {
                const exploreMod = toExploreMod(mod);
                return (
                  <div key={mod.id} className="relative">
                    <div className={`absolute top-2 right-2 z-10 px-2 py-0.5 text-[7px] rounded ${
                      mod.status === "complete" ? "bg-green-900/80 text-green-400" :
                      mod.status === "failed" ? "bg-red-900/80 text-red-400" :
                      "bg-yellow-900/80 text-yellow-400"
                    }`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                      {mod.status === "complete" ? "READY" : mod.status === "failed" ? "FAILED" : mod.status.toUpperCase()}
                    </div>
                    <ModCard mod={exploreMod} onSelect={setSelectedMod} />
                  </div>
                );
              })}
            </div>
          )
        ) :

        /* Loading state */
        loading ? (
          <div className="text-center py-20">
            <p className="text-[10px] text-[#808080] mb-2"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Loading mods...
            </p>
          </div>
        ) : filteredMods.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[32px] mb-4">🔍</p>
            <p className="text-[10px] text-[#808080] mb-2"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              No mods found
            </p>
            <p className="text-[8px] text-[#555]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {search ? "Try different search terms" : "No mods yet. Be the first to create one!"}
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
              {totalMods}
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
