"use client";

import { useState } from "react";
import Header from "@/components/Header";

/* ========== PIXEL SKIN DATA ========== */

// 8x8 Steve-like default skin (front view)
// Colors: skin=#c69c6d, hair=#4a3728, shirt=#00a8a8, pants=#2b2b7f, shoes=#4a3728, eyes=#fff/#1a1a1a
const STEVE_SKIN: string[][] = [
  ["#4a3728", "#4a3728", "#4a3728", "#4a3728", "#4a3728", "#4a3728", "#4a3728", "#4a3728"],
  ["#4a3728", "#c69c6d", "#c69c6d", "#c69c6d", "#c69c6d", "#c69c6d", "#c69c6d", "#4a3728"],
  ["#c69c6d", "#ffffff", "#1a1a1a", "#c69c6d", "#c69c6d", "#1a1a1a", "#ffffff", "#c69c6d"],
  ["#c69c6d", "#c69c6d", "#c69c6d", "#c8a07e", "#c8a07e", "#c69c6d", "#c69c6d", "#c69c6d"],
  ["#00a8a8", "#00a8a8", "#00a8a8", "#00a8a8", "#00a8a8", "#00a8a8", "#00a8a8", "#00a8a8"],
  ["#00a8a8", "#00a8a8", "#00a8a8", "#00a8a8", "#00a8a8", "#00a8a8", "#00a8a8", "#00a8a8"],
  ["#2b2b7f", "#2b2b7f", "#2b2b7f", "#2b2b7f", "#2b2b7f", "#2b2b7f", "#2b2b7f", "#2b2b7f"],
  ["#4a3728", "#4a3728", "#4a3728", "#0a0a0a", "#0a0a0a", "#4a3728", "#4a3728", "#4a3728"],
];

// Skin color maps for gallery skins (4x4 mini previews)
const GALLERY_SKINS = [
  {
    name: "Dragon Warrior",
    creator: "PixelKnight",
    downloads: 1243,
    colors: [
      ["#8b0000", "#8b0000", "#ff4500", "#8b0000"],
      ["#ffd700", "#ff4500", "#ff4500", "#ffd700"],
      ["#8b0000", "#8b0000", "#8b0000", "#8b0000"],
      ["#4a2800", "#4a2800", "#4a2800", "#4a2800"],
    ],
  },
  {
    name: "Ice Mage",
    creator: "FrostByte",
    downloads: 987,
    colors: [
      ["#e0f0ff", "#b0d4f1", "#b0d4f1", "#e0f0ff"],
      ["#ffffff", "#87ceeb", "#87ceeb", "#ffffff"],
      ["#4169e1", "#4169e1", "#4169e1", "#4169e1"],
      ["#191970", "#191970", "#191970", "#191970"],
    ],
  },
  {
    name: "Steampunk Engineer",
    creator: "GearHead",
    downloads: 756,
    colors: [
      ["#8b4513", "#cd853f", "#cd853f", "#8b4513"],
      ["#daa520", "#b8860b", "#b8860b", "#daa520"],
      ["#654321", "#8b6914", "#8b6914", "#654321"],
      ["#3e2723", "#3e2723", "#3e2723", "#3e2723"],
    ],
  },
  {
    name: "Neon Cyberpunk",
    creator: "NeonRider",
    downloads: 2104,
    colors: [
      ["#0a0a0a", "#ff00ff", "#00ffff", "#0a0a0a"],
      ["#1a1a2e", "#ff00ff", "#00ffff", "#1a1a2e"],
      ["#0a0a0a", "#0a0a0a", "#0a0a0a", "#0a0a0a"],
      ["#ff00ff", "#0a0a0a", "#0a0a0a", "#00ffff"],
    ],
  },
  {
    name: "Forest Elf",
    creator: "WoodlandCraft",
    downloads: 634,
    colors: [
      ["#228b22", "#90ee90", "#90ee90", "#228b22"],
      ["#f5deb3", "#f5deb3", "#f5deb3", "#f5deb3"],
      ["#006400", "#2e8b57", "#2e8b57", "#006400"],
      ["#8b4513", "#8b4513", "#8b4513", "#8b4513"],
    ],
  },
  {
    name: "Fire Demon",
    creator: "InfernoX",
    downloads: 1567,
    colors: [
      ["#1a0000", "#ff0000", "#ff0000", "#1a0000"],
      ["#ff4500", "#ff6600", "#ff6600", "#ff4500"],
      ["#8b0000", "#cc0000", "#cc0000", "#8b0000"],
      ["#1a0000", "#ff2200", "#ff2200", "#1a0000"],
    ],
  },
];

const EXAMPLE_PROMPTS = [
  "Medieval knight with red cape",
  "Space explorer with LED helmet",
  "Ninja with dark outfit",
  "Wizard with glowing robes",
];

/* ========== PIXEL GRID COMPONENTS ========== */

function SkinPreview8x8({ grid }: { grid: string[][] }) {
  return (
    <div className="inline-grid" style={{ gridTemplateColumns: "repeat(8, 1fr)", gap: 0 }}>
      {grid.flat().map((color, i) => (
        <div
          key={i}
          style={{
            width: 24,
            height: 24,
            backgroundColor: color,
            imageRendering: "pixelated",
          }}
        />
      ))}
    </div>
  );
}

function SkinPreview4x4({ grid }: { grid: string[][] }) {
  return (
    <div className="inline-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
      {grid.flat().map((color, i) => (
        <div
          key={i}
          style={{
            width: 12,
            height: 12,
            backgroundColor: color,
            imageRendering: "pixelated",
          }}
        />
      ))}
    </div>
  );
}

/* ========== MAIN PAGE ========== */

export default function SkinsPage() {
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [selectedEdition, setSelectedEdition] = useState<"bedrock" | "java">("bedrock");
  const [selectedSkin, setSelectedSkin] = useState<string | null>(null);

  function handleGenerate() {
    if (!description.trim() || generating) return;
    setGenerating(true);
    setGenerated(false);
    // Simulate generation
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 3000);
  }

  function handleUseSkin(name: string) {
    setSelectedSkin(name);
    setGenerated(true);
  }

  const pixelFont = { fontFamily: "var(--font-pixel), monospace" } as const;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-14">
        {/* ===== HEADER SECTION ===== */}
        <section className="px-4 pt-12 pb-8">
          <div className="max-w-5xl mx-auto text-center">
            <h1
              className="text-[20px] sm:text-[24px] text-[#d4a017] mb-3"
              style={pixelFont}
            >
              Custom Character Skins
            </h1>
            <p className="text-[10px] text-[#808080] leading-relaxed" style={pixelFont}>
              Design unique Minecraft skins with AI
            </p>
          </div>
        </section>

        {/* ===== SKIN CREATOR SECTION ===== */}
        <section className="px-4 pb-16">
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6">
            {/* LEFT SIDE - 40% */}
            <div className="w-full lg:w-[40%] flex flex-col gap-4">
              {/* Description textarea */}
              <div>
                <label
                  className="block text-[10px] text-[#c0c0c0] mb-2"
                  style={pixelFont}
                >
                  Describe your character
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A warrior with diamond armor and emerald eyes..."
                  rows={5}
                  className="mc-panel-inset w-full px-4 py-3 text-[10px] text-[#c0c0c0] bg-transparent focus:outline-none resize-none placeholder-[#555]"
                  style={pixelFont}
                />
              </div>

              {/* Example prompts */}
              <div>
                <p className="text-[8px] text-[#808080] mb-2" style={pixelFont}>
                  Try an example:
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setDescription(prompt)}
                      className="mc-panel px-3 py-2 text-[8px] text-[#808080] hover:text-[#d4a017]"
                      style={{ ...pixelFont, transition: "none" }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={!description.trim() || generating}
                className="mc-btn px-4 py-3 text-[10px] w-full"
              >
                {generating ? "Generating..." : "Generate Skin"}
              </button>

              {/* Generation status */}
              {generating && (
                <div className="mc-panel p-3 flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                  <p className="text-[9px] text-[#808080]" style={pixelFont}>
                    Generating<span className="mc-blink">_</span>
                  </p>
                </div>
              )}

              {generated && !generating && (
                <div className="mc-panel p-3">
                  <p className="text-[9px] text-[#55ff55]" style={pixelFont}>
                    {selectedSkin
                      ? `Loaded: ${selectedSkin}`
                      : "Skin generated successfully!"}
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT SIDE - 60% */}
            <div className="w-full lg:w-[60%] flex flex-col gap-4">
              {/* Skin preview */}
              <div className="mc-panel p-6 flex flex-col items-center">
                <p className="text-[10px] text-[#808080] mb-4" style={pixelFont}>
                  Skin Preview
                </p>
                <div
                  className="mc-panel-inset p-6 flex items-center justify-center"
                  style={{ minHeight: 240 }}
                >
                  <SkinPreview8x8 grid={STEVE_SKIN} />
                </div>
                <p className="text-[8px] text-[#555] mt-3" style={pixelFont}>
                  Front view &middot; 8x8 pixel grid
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  className="mc-btn flex-1 px-4 py-3 text-[10px]"
                  disabled={!generated}
                >
                  Download Skin
                </button>
                <button
                  className="mc-btn flex-1 px-4 py-3 text-[10px]"
                  disabled={!generated}
                >
                  Apply to Mod
                </button>
              </div>

              {/* Edition selector */}
              <div className="mc-panel p-4">
                <p className="text-[9px] text-[#808080] mb-3" style={pixelFont}>
                  Edition
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedEdition("bedrock")}
                    className={`mc-btn flex-1 px-4 py-2 text-[10px] ${
                      selectedEdition === "bedrock"
                        ? "!bg-[#222] !text-[#5555ff]"
                        : ""
                    }`}
                    style={{
                      borderColor:
                        selectedEdition === "bedrock"
                          ? "#5555ff"
                          : undefined,
                    }}
                  >
                    Bedrock
                  </button>
                  <div className="relative flex-1">
                    <button
                      onClick={() => setSelectedEdition("java")}
                      className={`mc-btn w-full px-4 py-2 text-[10px] ${
                        selectedEdition === "java"
                          ? "!bg-[#222] !text-[#55ff55]"
                          : ""
                      }`}
                      style={{
                        borderColor:
                          selectedEdition === "java"
                            ? "#55ff55"
                            : undefined,
                      }}
                    >
                      Java
                    </button>
                    <span
                      className="absolute -top-2 -right-2 text-[7px] px-1.5 py-0.5 bg-[#1a1a1a] border border-[#55ff55] text-[#55ff55]"
                      style={pixelFont}
                    >
                      SOON
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== COMMUNITY SKINS GALLERY ===== */}
        <section
          className="px-4 py-16 border-t-[3px]"
          style={{ borderColor: "#1a1a1a" }}
        >
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-[18px] text-[#d4a017] text-center mb-2"
              style={pixelFont}
            >
              Community Skins
            </h2>
            <p
              className="text-[10px] text-[#808080] text-center mb-10"
              style={pixelFont}
            >
              Browse skins created by other players.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {GALLERY_SKINS.map((skin) => (
                <div key={skin.name} className="mc-panel p-4">
                  {/* Mini pixel preview */}
                  <div className="mc-panel-inset p-3 flex items-center justify-center mb-3">
                    <SkinPreview4x4 grid={skin.colors} />
                  </div>

                  {/* Skin info */}
                  <p
                    className="text-[10px] text-[#d4a017] mb-1 truncate"
                    style={pixelFont}
                  >
                    {skin.name}
                  </p>
                  <p className="text-[8px] text-[#808080] mb-1" style={pixelFont}>
                    by {skin.creator}
                  </p>
                  <p className="text-[8px] text-[#555] mb-3" style={pixelFont}>
                    {skin.downloads.toLocaleString()} downloads
                  </p>

                  {/* Use button */}
                  <button
                    onClick={() => handleUseSkin(skin.name)}
                    className={`mc-btn w-full px-3 py-2 text-[9px] ${
                      selectedSkin === skin.name
                        ? "!text-[#55ff55] !border-[#55ff55]"
                        : ""
                    }`}
                  >
                    {selectedSkin === skin.name ? "Selected" : "Use This"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
