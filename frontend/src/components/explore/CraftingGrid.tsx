"use client";

import { CraftingSlot } from "@/lib/exploreData";
import PixelEmoji from "@/components/PixelEmoji";

interface CraftingGridProps {
  recipe: (CraftingSlot | null)[];
  size?: "sm" | "md" | "lg";
}

export default function CraftingGrid({ recipe, size = "md" }: CraftingGridProps) {
  const cellSize = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-14 h-14" : "w-10 h-10";
  const emojiSize = size === "sm" ? 14 : size === "lg" ? 28 : 20;
  const gap = size === "sm" ? "gap-0.5" : "gap-1";

  return (
    <div className="mc-panel-inset inline-block p-2">
      <div className={`grid grid-cols-3 ${gap}`}>
        {recipe.map((slot, i) => (
          <div
            key={i}
            className={`${cellSize} bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center`}
            title={slot?.item || "empty"}
          >
            {slot && (
              <PixelEmoji emoji={slot.icon} size={emojiSize} resolution={8} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
