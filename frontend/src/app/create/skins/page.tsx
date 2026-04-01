"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import { generateSkin } from "@/lib/api";

const EXAMPLE_PROMPTS = [
  "Medieval knight with iron armor and red cape",
  "Ninja with black outfit and glowing eyes",
  "Cyberpunk hacker with neon visor",
  "Fire demon with obsidian skin and lava cracks",
  "Space marine in white and blue suit",
  "Viking warrior with fur cloak and horned helmet",
  "Wizard with purple robes and golden staff",
  "Robot with chrome plating and LED eyes",
];

const GALLERY_SKINS = [
  { name: "Dragon Warrior", style: "Red armor, dragon scale texture, gold trim" },
  { name: "Ice Mage", style: "Frost blue robes, white hair, crystal staff" },
  { name: "Steampunk Engineer", style: "Brown leather, brass goggles, gear belt" },
  { name: "Neon Cyberpunk", style: "Black bodysuit, magenta and cyan neon lines" },
  { name: "Forest Elf", style: "Green tunic, blonde hair, leaf crown" },
  { name: "Fire Demon", style: "Dark red skin, orange eyes, obsidian horns" },
];

/* ========== 3D SKIN VIEWER ========== */

function SkinViewer3D({
  skinUrl,
  width = 300,
  height = 400,
}: {
  skinUrl: string | null;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    let viewer: any = null;

    import("skinview3d").then((skinview3d) => {
      if (!canvasRef.current) return;

      // Clean up previous viewer
      if (viewerRef.current) {
        viewerRef.current.dispose();
      }

      viewer = new skinview3d.SkinViewer({
        canvas: canvasRef.current,
        width,
        height,
        skin: skinUrl || undefined,
      });

      // Set up idle animation
      viewer.animation = new skinview3d.IdleAnimation();
      viewer.animation.speed = 0.5;

      // Camera controls
      viewer.controls.enableRotate = true;
      viewer.controls.enableZoom = true;
      viewer.zoom = 0.9;

      // Background
      viewer.background = 0x1a1a2e;

      viewerRef.current = viewer;
    });

    return () => {
      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
    };
  }, [skinUrl, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width,
        height,
        imageRendering: "pixelated",
        borderRadius: 4,
      }}
    />
  );
}

/* ========== MAIN PAGE ========== */

export default function SkinsPage() {
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [skinTexture, setSkinTexture] = useState<string | null>(null);
  const [skinId, setSkinId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState("gpt-oss-120b");

  const handleGenerate = useCallback(async () => {
    if (!description.trim() || generating) return;
    setGenerating(true);
    setError(null);
    setSkinTexture(null);

    try {
      const result = await generateSkin(description, model);
      if (result.texture) {
        setSkinTexture(result.texture);
        setSkinId(result.skin_id);
      } else {
        setError("Generation failed — try a different description or model.");
      }
    } catch (e: any) {
      setError(e.message || "Failed to generate skin");
    } finally {
      setGenerating(false);
    }
  }, [description, generating, model]);

  const handleDownload = useCallback(() => {
    if (!skinTexture) return;
    const link = document.createElement("a");
    link.href = skinTexture;
    link.download = `skin-${skinId || "custom"}.png`;
    link.click();
  }, [skinTexture, skinId]);

  const handleGalleryClick = useCallback((style: string) => {
    setDescription(style);
  }, []);

  const pixelFont = { fontFamily: "var(--font-pixel), monospace" } as const;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-14">
        {/* ===== HEADER ===== */}
        <section className="px-4 pt-12 pb-8">
          <div className="max-w-5xl mx-auto text-center">
            <h1
              className="text-[20px] sm:text-[24px] text-[#d4a017] mb-3"
              style={pixelFont}
            >
              AI Skin Generator
            </h1>
            <p
              className="text-[10px] text-[#808080] leading-relaxed"
              style={pixelFont}
            >
              Describe a character and get a downloadable Minecraft skin
            </p>
          </div>
        </section>

        {/* ===== MAIN CONTENT ===== */}
        <section className="px-4 pb-16">
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6">
            {/* LEFT — Input */}
            <div className="w-full lg:w-[40%] flex flex-col gap-4">
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
                  placeholder="A knight in shining diamond armor with a red cape..."
                  rows={5}
                  className="mc-panel-inset w-full px-4 py-3 text-[10px] text-[#c0c0c0] bg-transparent focus:outline-none resize-none placeholder-[#555]"
                  style={pixelFont}
                />
              </div>

              {/* Example prompts */}
              <div>
                <p
                  className="text-[8px] text-[#808080] mb-2"
                  style={pixelFont}
                >
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

              {/* Model selector */}
              <div className="mc-panel p-3">
                <p
                  className="text-[9px] text-[#808080] mb-2"
                  style={pixelFont}
                >
                  AI Model
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setModel("gpt-oss-120b")}
                    className={`mc-btn flex-1 px-3 py-2 text-[9px] ${
                      model === "gpt-oss-120b"
                        ? "bg-[#222]! text-[#55ff55]! border-[#55ff55]!"
                        : ""
                    }`}
                    style={pixelFont}
                  >
                    GPT-OSS 120B
                  </button>
                  <button
                    onClick={() => setModel("sonnet-4.6")}
                    className={`mc-btn flex-1 px-3 py-2 text-[9px] ${
                      model === "sonnet-4.6"
                        ? "bg-[#222]! text-[#d4a017]! border-[#d4a017]!"
                        : ""
                    }`}
                    style={pixelFont}
                  >
                    Sonnet 4.6
                  </button>
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={!description.trim() || generating}
                className="mc-btn px-4 py-3 text-[10px] w-full"
              >
                {generating ? "Generating Skin..." : "Generate Skin"}
              </button>

              {/* Status */}
              {generating && (
                <div className="mc-panel p-3 flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                  <p
                    className="text-[9px] text-[#808080]"
                    style={pixelFont}
                  >
                    Generating 64x64 skin texture
                    <span className="mc-blink">_</span>
                  </p>
                </div>
              )}

              {error && (
                <div className="mc-panel p-3">
                  <p
                    className="text-[9px] text-[#ff5555]"
                    style={pixelFont}
                  >
                    {error}
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT — 3D Preview */}
            <div className="w-full lg:w-[60%] flex flex-col gap-4">
              <div className="mc-panel p-6 flex flex-col items-center">
                <p
                  className="text-[10px] text-[#808080] mb-4"
                  style={pixelFont}
                >
                  3D Skin Preview
                </p>
                <div className="mc-panel-inset p-4 flex items-center justify-center">
                  {skinTexture ? (
                    <SkinViewer3D skinUrl={skinTexture} width={300} height={400} />
                  ) : (
                    <div
                      className="flex flex-col items-center justify-center text-center"
                      style={{ width: 300, height: 400 }}
                    >
                      <p
                        className="text-[10px] text-[#555] mb-2"
                        style={pixelFont}
                      >
                        No skin generated yet
                      </p>
                      <p
                        className="text-[8px] text-[#444]"
                        style={pixelFont}
                      >
                        Describe a character and click Generate
                      </p>
                    </div>
                  )}
                </div>
                {skinTexture && (
                  <p
                    className="text-[8px] text-[#555] mt-3"
                    style={pixelFont}
                  >
                    Drag to rotate &middot; Scroll to zoom
                  </p>
                )}
              </div>

              {/* Download + Raw texture */}
              {skinTexture && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleDownload}
                    className="mc-btn flex-1 px-4 py-3 text-[10px]"
                  >
                    Download Skin (.png)
                  </button>
                  <div className="mc-panel flex-1 p-3 flex items-center gap-3">
                    <img
                      src={skinTexture}
                      alt="Raw skin texture"
                      className="border border-[#333]"
                      style={{
                        width: 64,
                        height: 64,
                        imageRendering: "pixelated",
                      }}
                    />
                    <div>
                      <p
                        className="text-[9px] text-[#c0c0c0]"
                        style={pixelFont}
                      >
                        Raw Texture
                      </p>
                      <p
                        className="text-[8px] text-[#555]"
                        style={pixelFont}
                      >
                        64x64 PNG skin file
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ===== QUICK GALLERY ===== */}
        <section
          className="px-4 py-16 border-t-[3px]"
          style={{ borderColor: "#1a1a1a" }}
        >
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-[18px] text-[#d4a017] text-center mb-2"
              style={pixelFont}
            >
              Quick Styles
            </h2>
            <p
              className="text-[10px] text-[#808080] text-center mb-10"
              style={pixelFont}
            >
              Click a style to use it as your prompt
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {GALLERY_SKINS.map((skin) => (
                <button
                  key={skin.name}
                  onClick={() => handleGalleryClick(skin.style)}
                  className="mc-panel p-4 text-left hover:border-[#d4a017] transition-colors"
                >
                  <p
                    className="text-[10px] text-[#d4a017] mb-1"
                    style={pixelFont}
                  >
                    {skin.name}
                  </p>
                  <p
                    className="text-[8px] text-[#808080]"
                    style={pixelFont}
                  >
                    {skin.style}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
