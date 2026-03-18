"use client";

import { CraftingSlot } from "@/lib/exploreData";

interface CraftingGridProps {
  recipe: (CraftingSlot | null)[];
  size?: "sm" | "md" | "lg";
}

export default function CraftingGrid({ recipe, size = "md" }: CraftingGridProps) {
  const cellSize = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-14 h-14" : "w-10 h-10";
  const fontSize = size === "sm" ? "text-[14px]" : size === "lg" ? "text-[22px]" : "text-[18px]";
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
              <span className={fontSize} style={{ lineHeight: 1 }}>
                {slot.icon}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
