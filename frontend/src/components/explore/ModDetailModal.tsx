"use client";

import { ExploreMod, CATEGORY_CONFIG } from "@/lib/exploreData";
import CraftingGrid from "./CraftingGrid";

interface ModDetailModalProps {
  mod: ExploreMod | null;
  onClose: () => void;
}

export default function ModDetailModal({ mod, onClose }: ModDetailModalProps) {
  if (!mod) return null;
  const cat = CATEGORY_CONFIG[mod.category];
  const hasRecipe = mod.craftingRecipe.some(s => s !== null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Modal */}
      <div className="relative mc-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0"
        onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center text-[#808080] hover:text-white bg-[#0a0a0a] border border-[#3d3d3d]"
          style={{ transition: "none" }}>
          ✕
        </button>

        {/* Header area with category bar */}
        <div className="relative h-48 bg-[#111] flex items-center justify-center overflow-hidden"
          style={{ borderBottom: `3px solid ${cat.color}` }}>
          {mod.thumbnail ? (
            <img src={mod.thumbnail} alt={mod.name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <span className="text-[48px]">{cat.icon}</span>
              <span className="text-[10px] text-[#555]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                No preview image
              </span>
            </div>
          )}

          {mod.featured && (
            <div className="absolute top-3 left-3 px-2 py-1 bg-[#d4a017] text-[#0a0a0a]"
              style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "8px" }}>
              ★ FEATURED
            </div>
          )}

          {mod.videoUrl && (
            <a href={mod.videoUrl} target="_blank" rel="noopener noreferrer"
              className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0a] border border-[#3d3d3d] text-[#d4a017] hover:text-[#f0c040]"
              style={{ fontFamily: "var(--font-pixel), monospace", fontSize: "8px", transition: "none" }}>
              ▶ Watch Video
            </a>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Title + meta */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[14px] text-[#d4a017] mb-1"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {mod.name}
              </h2>
              <div className="flex items-center gap-3 text-[8px] text-[#555]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                <span>by {mod.author}</span>
                <span>•</span>
                <span style={{ color: mod.edition === "java" ? "#55ff55" : "#5555ff" }}>
                  {mod.edition === "java" ? "Java" : "Bedrock"}
                </span>
                <span>•</span>
                <span>{new Date(mod.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[9px]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              <span className="text-[#808080]">⬇ {mod.downloads}</span>
              <span className="text-[#ff5555]">♥ {mod.likes}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-[9px] text-[#c0c0c0] mb-6 leading-relaxed"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {mod.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            <span className="px-2 py-0.5 text-[8px]"
              style={{
                fontFamily: "var(--font-pixel), monospace",
                color: cat.color,
                border: `1px solid ${cat.color}`,
                background: `${cat.color}11`,
              }}>
              {cat.label}
            </span>
            {mod.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 text-[8px] text-[#808080] border border-[#2a2a2a] bg-[#111]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                #{tag}
              </span>
            ))}
          </div>

          {/* Two-column layout: Recipe + Survival Guide */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Crafting Recipe */}
            {hasRecipe && (
              <div>
                <h3 className="text-[10px] text-[#d4a017] mb-3 flex items-center gap-2"
                  style={{ fontFamily: "var(--font-pixel), monospace" }}>
                  <span>⚒</span> Crafting Recipe
                </h3>
                <CraftingGrid recipe={mod.craftingRecipe} size="lg" />
                {/* Material list */}
                <div className="mt-3 space-y-1">
                  {Array.from(new Set(mod.craftingRecipe.filter(Boolean).map(s => s!.item))).map(item => {
                    const slot = mod.craftingRecipe.find(s => s?.item === item)!;
                    const count = mod.craftingRecipe.filter(s => s?.item === item).length;
                    return (
                      <div key={item} className="flex items-center gap-2 text-[8px] text-[#808080]"
                        style={{ fontFamily: "var(--font-pixel), monospace" }}>
                        <span>{slot.icon}</span>
                        <span className="capitalize">{item.replace(/_/g, " ")}</span>
                        <span className="text-[#555]">x{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Survival Guide */}
            {mod.survivalGuide && (
              <div>
                <h3 className="text-[10px] text-[#d4a017] mb-3 flex items-center gap-2"
                  style={{ fontFamily: "var(--font-pixel), monospace" }}>
                  <span>📖</span> How to Get in Survival
                </h3>
                <div className="mc-panel-inset p-3">
                  <p className="text-[8px] text-[#c0c0c0] leading-relaxed"
                    style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    {mod.survivalGuide}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-[#2a2a2a]">
            <button className="mc-btn px-4 py-2 text-[10px] flex items-center gap-2">
              ⬇ Download Mod
            </button>
            <button className="mc-btn px-4 py-2 text-[10px] flex items-center gap-2"
              style={{ color: "#ff5555" }}>
              ♥ Like
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
