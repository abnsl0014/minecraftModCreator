"use client";

import { useState } from "react";
import PixelEmoji from "@/components/PixelEmoji";

function SceneCard({ title, description, color, children }: {
  title: string;
  description: string;
  color: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="mc-panel p-4 cursor-pointer"
      style={{ borderLeftColor: color, borderLeftWidth: "4px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="h-28 bg-[#111] mb-3 flex items-center justify-center relative overflow-hidden">
        {children}
        {hovered && (
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {[...Array(6)].map((_, i) => (
              <span
                key={i}
                className="absolute w-1 h-1"
                style={{
                  background: color,
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                  animation: `block-break 0.6s ease-out ${i * 0.05}s forwards`,
                  ["--bx" as string]: `${(Math.random() - 0.5) * 40}px`,
                  ["--by" as string]: `${(Math.random() - 0.5) * 40}px`,
                }}
              />
            ))}
          </div>
        )}
      </div>
      <p className="text-[10px] text-[#d4a017] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
        {title}
      </p>
      <p className="text-[8px] text-[#808080]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
        {description}
      </p>
    </div>
  );
}

export function ThunderBladeScene() {
  return (
    <SceneCard title="Thunder Blade" description="Lightning swords with chain damage and electrical effects" color="#ff5555">
      <div className="flex flex-col items-center gap-1">
        <PixelEmoji emoji="⚔️" size={48} />
        <PixelEmoji emoji="⚡" size={18} className="opacity-60" />
      </div>
    </SceneCard>
  );
}

export function CrystalArmorScene() {
  return (
    <SceneCard title="Crystal Armor Set" description="Full crystal armor with glow effects and set bonuses" color="#5555ff">
      <div className="flex gap-2 items-end">
        <PixelEmoji emoji="🪖" size={28} />
        <PixelEmoji emoji="🛡️" size={36} />
        <PixelEmoji emoji="🧊" size={28} />
        <PixelEmoji emoji="👢" size={24} />
      </div>
    </SceneCard>
  );
}

export function MysticFoodsScene() {
  return (
    <SceneCard title="Mystic Foods" description="Enchanted foods with powerful potion effects" color="#55ff55">
      <div className="flex gap-3 items-center">
        <PixelEmoji emoji="🍎" size={32} />
        <PixelEmoji emoji="🍖" size={32} />
        <PixelEmoji emoji="🎂" size={32} />
      </div>
    </SceneCard>
  );
}

export function NeonBlocksScene() {
  return (
    <SceneCard title="Neon Blocks" description="Glowing neon building blocks in multiple colors" color="#aa55ff">
      <div className="flex gap-1">
        {["#ff5555", "#55ff55", "#5555ff", "#aa55ff", "#d4a017"].map((c) => (
          <div
            key={c}
            className="w-8 h-8"
            style={{
              background: c,
              boxShadow: `0 0 8px ${c}88`,
              border: "2px solid rgba(255,255,255,0.1)",
            }}
          />
        ))}
      </div>
    </SceneCard>
  );
}
