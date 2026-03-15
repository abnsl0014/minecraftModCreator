"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const WEAPON_MATERIALS = [
  { value: "wood", label: "Wood", bg: "#BC9862" },
  { value: "stone", label: "Stone", bg: "#9A9A9A" },
  { value: "iron", label: "Iron", bg: "#D8D8D8" },
  { value: "gold", label: "Gold", bg: "#FCDB5C" },
  { value: "diamond", label: "Diamond", bg: "#4AEDD9" },
  { value: "netherite", label: "Netherite", bg: "#443333" },
  { value: "emerald", label: "Emerald", bg: "#17DD62" },
  { value: "ruby", label: "Ruby", bg: "#C81E1E" },
  { value: "amethyst", label: "Amethyst", bg: "#A050C8" },
  { value: "obsidian", label: "Obsidian", bg: "#14121E" },
  { value: "copper", label: "Copper", bg: "#C47448" },
  { value: "redstone", label: "Redstone", bg: "#B41414" },
  { value: "lapis", label: "Lapis", bg: "#1E32B4" },
];

const FOOD_MATERIALS = [
  { value: "golden", label: "Golden", bg: "#FCDB5C" },
  { value: "cooked", label: "Cooked", bg: "#B4783C" },
  { value: "raw", label: "Raw", bg: "#C85050" },
  { value: "berry", label: "Berry", bg: "#B41E3C" },
  { value: "bread", label: "Bread", bg: "#DAA520" },
  { value: "veggie", label: "Veggie", bg: "#3CB43C" },
  { value: "magical", label: "Magical", bg: "#C864FF" },
  { value: "divine", label: "Divine", bg: "#FFD700" },
];

const BLOCK_MATERIALS = [
  { value: "ore", label: "Ore", bg: "#808080" },
  { value: "stone", label: "Stone", bg: "#808080" },
  { value: "crystal", label: "Crystal", bg: "#A050C8" },
  { value: "metal", label: "Metal", bg: "#B4B4B4" },
  { value: "wood", label: "Wood", bg: "#8F6437" },
  { value: "brick", label: "Brick", bg: "#964646" },
  { value: "glowing", label: "Glowing", bg: "#64C8C8" },
  { value: "nether", label: "Nether", bg: "#501414" },
];

const STYLES = [
  { value: "classic", label: "Classic", desc: "Clean vanilla Minecraft" },
  { value: "enchanted", label: "Enchanted", desc: "Magical shimmer & sparkles" },
  { value: "battle_worn", label: "Battle-worn", desc: "Dark & scratched" },
];

export function getMaterialOptions(itemType: string) {
  if (itemType === "food") return FOOD_MATERIALS;
  if (itemType === "block") return BLOCK_MATERIALS;
  return WEAPON_MATERIALS;
}

export function useTexturePreview(itemType: string, subType: string, material: string, style: string = "classic") {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!material) return;
    const sub = subType || (itemType === "weapon" ? "sword" : itemType === "tool" ? "pickaxe" : itemType === "armor" ? "chestplate" : "");
    fetch(`${API_BASE}/api/preview-texture?item_type=${itemType}&sub_type=${sub}&material=${material}&style=${style}`)
      .then(r => r.json())
      .then(d => setPreview(d.preview))
      .catch(() => setPreview(null));
  }, [material, itemType, subType, style]);
  return preview;
}

interface Props {
  value: string;
  onChange: (material: string) => void;
  style: string;
  onStyleChange: (style: string) => void;
  itemType: "weapon" | "tool" | "armor" | "food" | "block";
  subType?: string;
}

export default function MaterialSelect({ value, onChange, style, onStyleChange, itemType, subType }: Props) {
  const preview = useTexturePreview(itemType, subType || "", value, style);
  const options = getMaterialOptions(itemType);

  return (
    <div className="space-y-3">
      <div className="flex gap-4 items-start">
        {/* Preview */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
          {preview ? (
            <img src={preview} alt="Texture preview"
              className="w-24 h-24 rounded-lg border-2 border-gray-600 bg-gray-900"
              style={{ imageRendering: "pixelated" }} />
          ) : (
            <div className="w-24 h-24 rounded-lg border-2 border-gray-700 bg-gray-900 flex items-center justify-center">
              <span className="text-gray-600 text-xs">Loading...</span>
            </div>
          )}
          <span className="text-[10px] text-gray-500">In-game texture</span>
        </div>

        <div className="flex-1 space-y-3">
          {/* Style selector */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Texture Style</label>
            <div className="flex gap-1.5">
              {STYLES.map(s => (
                <button key={s.value} type="button" onClick={() => onStyleChange(s.value)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-all ${
                    style === s.value
                      ? "border-white/60 bg-gray-700 text-white ring-1 ring-white/30"
                      : "border-gray-600 bg-gray-800/40 text-gray-400 hover:text-white hover:border-gray-500"
                  }`}>
                  <span className="font-medium">{s.label}</span>
                  <span className="block text-[9px] opacity-60 mt-0.5">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Material grid */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Material</label>
            <div className="flex flex-wrap gap-1.5">
              {options.map(mat => (
                <button key={mat.value} type="button" onClick={() => onChange(mat.value)}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border transition-all ${
                    value === mat.value
                      ? "border-white/60 bg-gray-700 text-white ring-1 ring-white/30"
                      : "border-gray-600 bg-gray-800/40 text-gray-400 hover:text-white hover:border-gray-500"
                  }`}>
                  <span className="w-3 h-3 rounded-sm border border-black/30" style={{ backgroundColor: mat.bg }} />
                  {mat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TexturePreview({ itemType, subType, material, style = "classic", size = 32 }: {
  itemType: string; subType: string; material: string; style?: string; size?: number;
}) {
  const preview = useTexturePreview(itemType, subType, material, style);
  if (!preview) return <div className="rounded border border-gray-700 bg-gray-800" style={{ width: size, height: size }} />;
  return <img src={preview} alt="item" className="rounded border border-gray-600" style={{ width: size, height: size, imageRendering: "pixelated" }} />;
}
