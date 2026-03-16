"use client";

const PIXEL_SIZE = 4;

function PixelGrid({ pixels, cols, size = PIXEL_SIZE }: { pixels: (string | null)[][]; cols: number; size?: number }) {
  return (
    <div
      className="inline-grid pointer-events-none"
      aria-hidden="true"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${size}px)`,
        imageRendering: "pixelated",
      }}
    >
      {pixels.flat().map((color, i) => (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            background: color || "transparent",
          }}
        />
      ))}
    </div>
  );
}

const STEVE_PIXELS: (string | null)[][] = [
  [null, "#4a3728", "#4a3728", "#4a3728", "#4a3728", "#4a3728", "#4a3728", null],
  ["#4a3728", "#4a3728", "#4a3728", "#4a3728", "#4a3728", "#4a3728", "#4a3728", "#4a3728"],
  ["#c8946e", "#c8946e", "#c8946e", "#c8946e", "#c8946e", "#c8946e", "#c8946e", "#c8946e"],
  ["#c8946e", "#fff", "#4a3728", "#c8946e", "#c8946e", "#4a3728", "#fff", "#c8946e"],
  ["#c8946e", "#c8946e", "#c8946e", "#b07858", "#b07858", "#c8946e", "#c8946e", "#c8946e"],
  [null, null, "#c8946e", "#c8946e", "#c8946e", "#c8946e", null, null],
  [null, "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", null],
  ["#c8946e", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#c8946e"],
  ["#c8946e", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#c8946e"],
  [null, "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", null],
  [null, null, "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", null, null],
  [null, null, "#2a2a6e", "#2a2a6e", "#2a2a6e", "#2a2a6e", null, null],
  [null, null, "#2a2a6e", "#2a2a6e", "#2a2a6e", "#2a2a6e", null, null],
  [null, null, "#2a2a6e", null, null, "#2a2a6e", null, null],
  [null, "#555", "#555", null, null, "#555", "#555", null],
  [null, "#555", "#555", null, null, "#555", "#555", null],
];

const CREEPER_PIXELS: (string | null)[][] = [
  ["#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c"],
  ["#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c"],
  ["#4ca64c", "#111", "#111", "#4ca64c", "#4ca64c", "#111", "#111", "#4ca64c"],
  ["#4ca64c", "#111", "#111", "#4ca64c", "#4ca64c", "#111", "#111", "#4ca64c"],
  ["#4ca64c", "#4ca64c", "#111", "#111", "#111", "#111", "#4ca64c", "#4ca64c"],
  ["#4ca64c", "#111", "#111", "#4ca64c", "#4ca64c", "#111", "#111", "#4ca64c"],
  ["#4ca64c", "#111", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#111", "#4ca64c"],
  [null, "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", null],
  [null, "#3d8a3d", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#3d8a3d", null],
  [null, "#3d8a3d", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#3d8a3d", null],
  [null, "#3d8a3d", "#3d8a3d", "#4ca64c", "#4ca64c", "#3d8a3d", "#3d8a3d", null],
  ["#3d8a3d", "#3d8a3d", "#3d8a3d", null, null, "#3d8a3d", "#3d8a3d", "#3d8a3d"],
  ["#3d8a3d", "#3d8a3d", "#3d8a3d", null, null, "#3d8a3d", "#3d8a3d", "#3d8a3d"],
  ["#2d6e2d", "#2d6e2d", "#2d6e2d", null, null, "#2d6e2d", "#2d6e2d", "#2d6e2d"],
  ["#2d6e2d", "#2d6e2d", "#2d6e2d", null, null, "#2d6e2d", "#2d6e2d", "#2d6e2d"],
  ["#2d6e2d", "#2d6e2d", "#2d6e2d", null, null, "#2d6e2d", "#2d6e2d", "#2d6e2d"],
];

const ENDERMAN_PIXELS: (string | null)[][] = [
  [null, "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", null],
  ["#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e"],
  ["#1a1a2e", "#d455ff", "#1a1a2e", "#1a1a2e", "#d455ff", "#1a1a2e"],
  ["#1a1a2e", "#d455ff", "#1a1a2e", "#1a1a2e", "#d455ff", "#1a1a2e"],
  ["#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e"],
  [null, null, "#1a1a2e", "#1a1a2e", null, null],
  [null, "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", null],
  [null, "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", null],
  [null, "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", null],
  [null, "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", null],
  ["#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e"],
  [null, "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", null],
  [null, null, "#1a1a2e", "#1a1a2e", null, null],
  [null, null, "#1a1a2e", "#1a1a2e", null, null],
  [null, "#1a1a2e", null, null, "#1a1a2e", null],
  [null, "#1a1a2e", null, null, "#1a1a2e", null],
  [null, "#1a1a2e", null, null, "#1a1a2e", null],
  [null, "#1a1a2e", null, null, "#1a1a2e", null],
  ["#1a1a2e", "#1a1a2e", null, null, "#1a1a2e", "#1a1a2e"],
  ["#1a1a2e", "#1a1a2e", null, null, "#1a1a2e", "#1a1a2e"],
];

const CHICKEN_PIXELS: (string | null)[][] = [
  [null, null, "#ff3333", null, null, null, null, null],
  [null, "#fff", "#fff", "#fff", null, null, null, null],
  ["#fff", "#111", "#fff", "#fff", "#fff", null, null, null],
  [null, "#fff", "#ff8800", "#fff", "#fff", "#fff", "#fff", null],
  [null, null, "#fff", "#fff", "#fff", null, null, null],
  [null, null, "#ff8800", null, "#ff8800", null, null, null],
];

export function Steve({ className = "" }: { className?: string }) {
  return (
    <div className={`hidden md:block ${className}`} style={{ animation: "idle-bob 2s ease-in-out infinite" }}>
      <PixelGrid pixels={STEVE_PIXELS} cols={8} size={5} />
    </div>
  );
}

export function Creeper({ className = "" }: { className?: string }) {
  return (
    <div className={`hidden md:block ${className}`} style={{ animation: "idle-bob 2s ease-in-out infinite 0.5s" }}>
      <PixelGrid pixels={CREEPER_PIXELS} cols={8} size={5} />
    </div>
  );
}

export function Enderman({ className = "" }: { className?: string }) {
  return (
    <div className={`hidden md:block ${className}`} style={{ animation: "idle-bob 2.5s ease-in-out infinite" }}>
      <PixelGrid pixels={ENDERMAN_PIXELS} cols={6} size={4} />
    </div>
  );
}

export function Chicken({ className = "" }: { className?: string }) {
  return (
    <div className={`hidden md:block ${className}`} style={{ animation: "walk-cycle 12s linear infinite" }}>
      <PixelGrid pixels={CHICKEN_PIXELS} cols={8} size={3} />
    </div>
  );
}
