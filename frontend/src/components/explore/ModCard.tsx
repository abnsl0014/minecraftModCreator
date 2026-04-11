"use client";

import { useState } from "react";
import { ExploreMod, CATEGORY_CONFIG } from "@/lib/exploreData";
import CraftingGrid from "./CraftingGrid";
import PixelEmoji from "@/components/PixelEmoji";

interface ModCardProps {
  mod: ExploreMod;
  onSelect?: (mod: ExploreMod) => void;
}

export default function ModCard({ mod, onSelect }: ModCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_CONFIG[mod.category];

  return (
    <div
      className="mc-panel border border-[#3d3d3d] hover:border-[#d4a017] group cursor-pointer"
      style={{ transition: "none" }}
      onClick={() => onSelect?.(mod)}
    >
      {/* Thumbnail / Media area */}
      <div className="relative h-32 sm:h-40 bg-[#111] overflow-hidden flex items-center justify-center"
        style={{ borderBottom: `2px solid ${cat.color}22` }}>

        {/* Category color bar on left */}
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: cat.color }} />

        {mod.thumbnail ? (
          <img src={mod.thumbnail} alt={mod.name} className="w-full h-full object-cover" />
        ) : mod.craftingRecipe.some(s => s !== null) ? (
          // Show crafting grid with icon above it, both centered
          <div className="flex flex-col items-center justify-center h-full py-3">
            <PixelEmoji emoji={cat.icon} size={28} />
            <div className="opacity-60 scale-75 mt-1">
              <CraftingGrid recipe={mod.craftingRecipe} size="sm" />
            </div>
          </div>
        ) : (
          // No recipe — just the icon, fully centered
          <PixelEmoji emoji={cat.icon} size={48} />
        )}

        {/* Video play overlay */}
        {mod.videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100"
            style={{ transition: "opacity 0.15s" }}>
            <div className="w-12 h-12 bg-white/20 border-2 border-white/60 flex items-center justify-center">
              <span className="text-white text-lg ml-0.5">▶</span>
            </div>
          </div>
        )}

        {/* Featured badge */}
        {mod.featured && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#d4a017] text-[#0a0a0a]"
            style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "7px" }}>
            ★ FEATURED
          </div>
        )}

      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-[11px] text-[#d4a017] font-bold group-hover:text-[#f0c040] leading-tight"
            style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
            {mod.name}
          </h3>
          <span className="shrink-0 px-1.5 py-0.5 text-[8px]"
            style={{
              fontFamily: "var(--font-pixel), monospace",
              color: cat.color,
              border: `1px solid ${cat.color}44`,
              background: `${cat.color}11`,
            }}>
            {cat.label}
          </span>
        </div>

        <p className="text-[8px] text-[#808080] mb-3 line-clamp-2 leading-relaxed"
          style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {mod.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {mod.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 text-[7px] text-[#555] border border-[#2a2a2a] bg-[#111]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              #{tag}
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between">
          <div className="text-[8px] text-[#555]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            by {mod.author}
          </div>
          <div className="flex items-center gap-3 text-[8px] text-[#555]"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            <span title="Downloads">⬇ {mod.downloads}</span>
            <span title="Likes">♥ {mod.likes}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
