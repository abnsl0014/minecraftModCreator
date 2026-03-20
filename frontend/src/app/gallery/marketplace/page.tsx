"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ModCard from "@/components/explore/ModCard";
import ModDetailModal from "@/components/explore/ModDetailModal";
import PixelEmoji from "@/components/PixelEmoji";
import { ExploreMod, MOCK_EXPLORE_MODS, CATEGORY_CONFIG } from "@/lib/exploreData";

export default function MarketplacePage() {
  const [selectedMod, setSelectedMod] = useState<ExploreMod | null>(null);

  const featuredMods = MOCK_EXPLORE_MODS.filter(m => m.status === "approved" && m.featured);
  const allApproved = MOCK_EXPLORE_MODS.filter(m => m.status === "approved");

  // Group by category
  const byCategory = Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
    key: key as ExploreMod["category"],
    config,
    mods: allApproved.filter(m => m.category === key),
  })).filter(g => g.mods.length > 0);

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
              <h1 className="text-[16px] text-[#d4a017]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                ★ Marketplace
              </h1>
              <p className="text-[8px] text-[#555] mt-1"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Curated picks — the best mods handpicked by the team
              </p>
            </div>
          </div>
        </div>

        {/* Hero featured section */}
        <div className="mc-panel p-6 mb-8 relative overflow-hidden"
          style={{ borderTopColor: "#d4a017", borderTopWidth: "3px" }}>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-5 text-[80px] text-[#d4a017]"
            style={{ lineHeight: 1 }}>
            ★
          </div>
          <h2 className="text-[12px] text-[#d4a017] mb-2"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Staff Picks
          </h2>
          <p className="text-[8px] text-[#808080] mb-6"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Hand-selected mods that showcase the best of what the community has built.
            More marketplace features coming soon.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredMods.map(mod => (
              <ModCard key={mod.id} mod={mod} onSelect={setSelectedMod} />
            ))}
          </div>
        </div>

        {/* Browse by category */}
        <h2 className="text-[12px] text-[#d4a017] mb-6"
          style={{ fontFamily: "var(--font-pixel), monospace" }}>
          Browse by Category
        </h2>

        {byCategory.map(({ key, config, mods }) => (
          <div key={key} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <PixelEmoji emoji={config.icon} size={18} resolution={8} />
              <h3 className="text-[10px]"
                style={{ fontFamily: "var(--font-pixel), monospace", color: config.color }}>
                {config.label}
              </h3>
              <span className="text-[8px] text-[#3d3d3d]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                ({mods.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mods.map(mod => (
                <ModCard key={mod.id} mod={mod} onSelect={setSelectedMod} />
              ))}
            </div>
          </div>
        ))}

        {/* Coming soon banner */}
        <div className="mc-panel p-6 text-center mt-8 border-t-2 border-t-[#d4a017]">
          <p className="text-[11px] text-[#d4a017] mb-2"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Marketplace Coming Soon
          </p>
          <p className="text-[8px] text-[#808080] leading-relaxed max-w-md mx-auto"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            We&apos;re building a full marketplace where you can buy, sell, and trade mods.
            Pricing, creator payouts, and collections — all in the works.
          </p>
        </div>
      </div>

      <ModDetailModal mod={selectedMod} onClose={() => setSelectedMod(null)} />
    </main>
  );
}
