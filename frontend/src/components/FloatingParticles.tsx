"use client";

const ITEMS = [
  { emoji: "\u2694\uFE0F", delay: 0, duration: 10, left: 10 },
  { emoji: "\u{1F48E}", delay: 2, duration: 12, left: 25 },
  { emoji: "\u26CF\uFE0F", delay: 4, duration: 9, left: 45 },
  { emoji: "\u{1F6E1}\uFE0F", delay: 1, duration: 14, left: 60 },
  { emoji: "\u{1F34E}", delay: 3, duration: 11, left: 75 },
  { emoji: "\u2728", delay: 5, duration: 13, left: 88 },
];

export function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {ITEMS.map((item, i) => (
        <span
          key={i}
          className={`absolute text-[12px] opacity-0 ${i >= 3 ? "hidden md:block" : ""}`}
          style={{
            left: `${item.left}%`,
            bottom: "0%",
            animation: `${i % 2 === 0 ? "float-up" : "float-up-reverse"} ${item.duration}s linear ${item.delay}s infinite`,
          }}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  );
}

export function HeroBackground() {
  const GRASS_COLORS = ["#4a8c2a", "#5a9e36", "#4a8c2a", "#3d7a22", "#5a9e36", "#4a8c2a"];
  const DIRT_COLOR = "#8b6c42";
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {[
        { left: "8%", top: "20%", color: "#555", size: 12 },
        { left: "85%", top: "15%", color: "#6b5e4f", size: 10 },
        { left: "50%", top: "8%", color: "#555", size: 8 },
        { left: "25%", top: "30%", color: "#4a8c2a", size: 10 },
        { left: "72%", top: "25%", color: "#6b5e4f", size: 12 },
      ].map((block, i) => (
        <div
          key={i}
          className="absolute opacity-20 hidden md:block"
          style={{
            left: block.left,
            top: block.top,
            width: block.size,
            height: block.size,
            background: block.color,
            border: "1px solid rgba(255,255,255,0.1)",
            animation: `idle-bob ${2 + i * 0.5}s ease-in-out ${i * 0.3}s infinite`,
          }}
        />
      ))}
      <div className="absolute bottom-0 left-0 right-0 hidden md:flex h-4 opacity-30">
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col">
            <div className="h-1" style={{ background: GRASS_COLORS[i % GRASS_COLORS.length] }} />
            <div className="flex-1" style={{ background: DIRT_COLOR }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function XPOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="absolute w-2 h-2 bg-[#55ff55] opacity-0"
          style={{
            left: `${30 + i * 15}%`,
            bottom: "10px",
            boxShadow: "0 0 6px 2px rgba(85, 255, 85, 0.5)",
            animation: `xp-float 3s ease-out ${i * 0.8}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
