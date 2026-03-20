"use client";

import { useState, useMemo } from "react";
import PixelEmoji from "@/components/PixelEmoji";

const MATERIALS: { id: string; icon: string; label: string }[] = [
  { id: "minecraft:redstone", icon: "\uD83D\uDD34", label: "Redstone" },
  { id: "minecraft:diamond", icon: "\uD83D\uDC8E", label: "Diamond" },
  { id: "minecraft:cobblestone", icon: "\u26F0\uFE0F", label: "Cobblestone" },
  { id: "minecraft:gold_ingot", icon: "\uD83D\uDC9B", label: "Gold Ingot" },
  { id: "minecraft:emerald", icon: "\uD83D\uDC9A", label: "Emerald" },
  { id: "minecraft:blaze_rod", icon: "\uD83D\uDD25", label: "Blaze Rod" },
  { id: "minecraft:iron_ingot", icon: "\uD83D\uDFE4", label: "Iron Ingot" },
  { id: "minecraft:quartz", icon: "\u26A1", label: "Quartz" },
  { id: "minecraft:bone", icon: "\uD83E\uDDB4", label: "Bone" },
  { id: "minecraft:nether_star", icon: "\u2B50", label: "Nether Star" },
  { id: "minecraft:leather", icon: "\uD83D\uDFEB", label: "Leather" },
  { id: "minecraft:feather", icon: "\uD83E\uDEB6", label: "Feather" },
  { id: "minecraft:amethyst_shard", icon: "\uD83D\uDC9C", label: "Amethyst" },
  { id: "minecraft:lapis_lazuli", icon: "\uD83D\uDD35", label: "Lapis" },
  { id: "minecraft:copper_ingot", icon: "\uD83D\uDFE0", label: "Copper" },
  { id: "minecraft:oak_planks", icon: "\uD83E\uDEB5", label: "Oak Planks" },
  { id: "minecraft:netherite_ingot", icon: "\uD83E\uDDF1", label: "Netherite" },
  { id: "minecraft:string", icon: "\uD83D\uDD78\uFE0F", label: "String" },
  { id: "minecraft:obsidian", icon: "\u2B1B", label: "Obsidian" },
  { id: "minecraft:ender_pearl", icon: "\uD83E\uDD5A", label: "Ender Pearl" },
  { id: "minecraft:gunpowder", icon: "\uD83D\uDD36", label: "Gunpowder" },
  { id: "minecraft:apple", icon: "\uD83C\uDF4E", label: "Apple" },
];

const MATERIAL_MAP = new Map(MATERIALS.map((m) => [m.id, m]));

interface Props {
  recipe: string[];
  onChange: (recipe: string[]) => void;
}

export default function RecipeGrid({ recipe, onChange }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSlotClick = (index: number) => {
    const newRecipe = [...recipe];
    if (newRecipe[index]) {
      // Slot is occupied -- clear it
      newRecipe[index] = "";
    } else if (selected) {
      // Place selected material
      newRecipe[index] = selected;
    }
    onChange(newRecipe);
  };

  const clearRecipe = () => {
    onChange(Array(9).fill(""));
  };

  const summary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const slot of recipe) {
      if (!slot) continue;
      counts.set(slot, (counts.get(slot) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([id, count]) => {
      const mat = MATERIAL_MAP.get(id);
      return {
        id,
        icon: mat?.icon ?? "?",
        label: mat?.label ?? id.replace("minecraft:", ""),
        count,
      };
    });
  }, [recipe]);

  const hasAnyItem = recipe.some((s) => s !== "");

  return (
    <div style={{ fontFamily: "var(--font-pixel), monospace" }}>
      {/* Title */}
      <p
        className="text-[11px] mb-3"
        style={{ color: "#d4a017" }}
      >
        Crafting Recipe{" "}
        <span style={{ color: "#808080" }}>(click slots to place materials)</span>
      </p>

      {/* Material selector bar */}
      <div
        className="mc-panel-inset mb-3 overflow-x-auto"
        style={{ padding: "6px 8px" }}
      >
        <div className="flex gap-1" style={{ minWidth: "max-content" }}>
          {MATERIALS.map((mat) => {
            const isSelected = selected === mat.id;
            return (
              <button
                key={mat.id}
                type="button"
                title={mat.label}
                onClick={() =>
                  setSelected(isSelected ? null : mat.id)
                }
                className="flex items-center justify-center transition-all"
                style={{
                  width: 32,
                  height: 32,
                  fontSize: 16,
                  lineHeight: 1,
                  background: isSelected ? "#2a2206" : "#1a1a1a",
                  border: isSelected
                    ? "2px solid #d4a017"
                    : "2px solid #2a2a2a",
                  borderRadius: 2,
                  cursor: "pointer",
                  boxShadow: isSelected
                    ? "0 0 6px rgba(212, 160, 23, 0.4)"
                    : "none",
                }}
              >
                <PixelEmoji emoji={mat.icon} size={16} resolution={8} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected indicator */}
      {selected && (
        <p className="text-[9px] mb-2" style={{ color: "#c0c0c0" }}>
          Selected:{" "}
          <span style={{ color: "#d4a017" }}>
            <PixelEmoji emoji={MATERIAL_MAP.get(selected)?.icon ?? ""} size={14} resolution={7} />{" "}
            {MATERIAL_MAP.get(selected)?.label}
          </span>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="ml-2 underline"
            style={{ color: "#808080", fontSize: 9, cursor: "pointer", background: "none", border: "none", fontFamily: "inherit" }}
          >
            deselect
          </button>
        </p>
      )}

      {/* 3x3 Crafting Grid */}
      <div className="mc-panel-inset inline-block p-2">
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => {
            const itemId = recipe[i] || "";
            const mat = itemId ? MATERIAL_MAP.get(itemId) : null;
            const canPlace = !itemId && !!selected;

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSlotClick(i)}
                className="flex items-center justify-center transition-all"
                style={{
                  width: 48,
                  height: 48,
                  background: mat ? "#1e1e1e" : "#111",
                  border: mat
                    ? "2px solid #3a3a3a"
                    : canPlace
                    ? "2px dashed #3a3a3a"
                    : "2px solid #222",
                  borderRadius: 2,
                  cursor: mat ? "pointer" : canPlace ? "copy" : "default",
                  fontSize: 22,
                  lineHeight: 1,
                }}
                title={
                  mat
                    ? `${mat.label} (click to remove)`
                    : selected
                    ? `Place ${MATERIAL_MAP.get(selected)?.label}`
                    : "Select a material first"
                }
              >
                {mat ? (
                  <PixelEmoji emoji={mat.icon} size={24} resolution={8} />
                ) : canPlace ? (
                  <span style={{ opacity: 0.15, fontSize: 18 }}>+</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom row: Clear + Summary */}
      <div className="mt-3 flex flex-wrap items-start gap-4">
        {/* Clear button */}
        {hasAnyItem && (
          <button
            type="button"
            onClick={clearRecipe}
            className="text-[10px] underline"
            style={{
              color: "#808080",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-pixel), monospace",
              padding: 0,
            }}
          >
            Clear recipe
          </button>
        )}

        {/* Material summary */}
        {summary.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {summary.map((s) => (
              <span
                key={s.id}
                className="text-[9px]"
                style={{ color: "#c0c0c0" }}
              >
                <PixelEmoji emoji={s.icon} size={12} resolution={6} /> {s.label}{" "}
                <span style={{ color: "#808080" }}>x{s.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
