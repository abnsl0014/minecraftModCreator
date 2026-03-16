"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { generateMod } from "@/lib/api";

const EXAMPLE_PROMPTS = [
  "Diamond sword that shoots lightning",
  "Emerald armor with flight",
  "Food that gives night vision",
];

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { job_id } = await generateMod(prompt.trim());
      router.push(`/status/${job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* === HERO === */}
        <section className="flex flex-col items-center justify-center px-4 pt-20"
          style={{ minHeight: "calc(100vh - 56px)" }}>
          <h1 className="text-[20px] sm:text-[24px] md:text-[28px] text-[#d4a017] text-center mb-4 leading-relaxed"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Create Minecraft Mods
            <span className="block">with AI</span>
          </h1>

          <p className="text-[10px] text-[#808080] text-center mb-8 max-w-xl leading-relaxed"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Describe what you want. Download a working mod.{" "}
            <span className="text-[#55ff55]">Java</span> &amp;{" "}
            <span className="text-[#5555ff]">Bedrock</span> supported.
          </p>

          {/* Prompt input */}
          <form onSubmit={handleSubmit} className="w-full max-w-[600px] mb-6" id="hero-prompt">
            <div className="mc-panel-inset flex items-center relative">
              {!prompt && !loading && (
                <span className="absolute left-4 text-[10px] text-[#808080] pointer-events-none"
                  style={{ fontFamily: "var(--font-pixel), monospace" }}>
                  Type your mod idea...<span className="mc-blink">_</span>
                </span>
              )}
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                readOnly={loading}
                className="flex-1 bg-transparent px-4 py-3 text-[10px] text-[#c0c0c0] focus:outline-none relative z-10"
                style={{ fontFamily: "var(--font-pixel), monospace" }}
              />
              <button
                type="submit"
                disabled={!prompt.trim() || loading}
                className="mc-btn px-3 py-2 m-1 text-[12px]"
                aria-label="Generate mod"
              >
                {loading ? "..." : ">"}
              </button>
            </div>
          </form>

          {/* Error message */}
          {error && (
            <div className="mc-panel w-full max-w-[600px] mb-4 p-3 border-l-4 border-l-[#ff5555]">
              <p className="text-[8px] text-[#ff5555]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {error}
              </p>
              <button onClick={() => setError(null)}
                className="text-[8px] text-[#808080] hover:text-[#c0c0c0] mt-1"
                style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
                Dismiss
              </button>
            </div>
          )}

          {/* Example prompts */}
          <div className="flex flex-wrap gap-2 justify-center max-w-[600px] mb-12">
            {EXAMPLE_PROMPTS.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                className="mc-panel px-3 py-2 text-[8px] text-[#808080] hover:text-[#d4a017]"
                style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Demo showcase */}
          <DemoShowcase />
        </section>

        {/* Remaining sections */}
        <ShowcaseSection />
        <HowItWorksSection />
        <CapabilitiesSection />
        <FooterCTA />
      </main>
    </>
  );
}

/* ========== DEMO SHOWCASE ========== */
function DemoShowcase() {
  const [active, setActive] = useState(0);
  const touchStart = useRef(0);
  const demos = [
    { src: "/demos/demo1.svg", alt: "Custom weapons demo" },
    { src: "/demos/demo2.svg", alt: "Armor sets demo" },
    { src: "/demos/demo3.svg", alt: "Custom blocks demo" },
    { src: "/demos/demo4.svg", alt: "Food items demo" },
  ];

  const go = useCallback((dir: number) => {
    setActive(prev => (prev + dir + demos.length) % demos.length);
  }, [demos.length]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  }

  return (
    <div className="w-full max-w-[700px]" tabIndex={0} onKeyDown={handleKeyDown}
      onTouchStart={(e) => { touchStart.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const diff = e.changedTouches[0].clientX - touchStart.current;
        if (Math.abs(diff) > 50) go(diff < 0 ? 1 : -1);
      }}>
      <div className="mc-panel aspect-video flex items-center justify-center overflow-hidden">
        <img src={demos[active].src} alt={demos[active].alt} className="w-full h-full object-cover" />
      </div>
      <div className="flex justify-center gap-2 mt-4">
        {demos.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`w-3 h-3 ${i === active ? "bg-[#d4a017]" : "bg-[#3d3d3d]"}`}
            style={{ border: "2px solid #3d3d3d", transition: "none" }}
            aria-label={`Show demo ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ========== SHOWCASE SECTION ========== */
function ShowcaseSection() {
  return (
    <section className="py-20 px-4 border-t-[3px]" style={{ borderColor: "#1a1a1a" }}>
      <div className="max-w-6xl mx-auto">
        <h2 className="text-[18px] text-[#d4a017] text-center mb-2"
          style={{ fontFamily: "var(--font-pixel), monospace" }}>
          Mods Created by Players
        </h2>
        <p className="text-[10px] text-[#808080] text-center mb-10"
          style={{ fontFamily: "var(--font-pixel), monospace" }}>
          See what the community has built.
        </p>

        <ShowcaseCards />
      </div>
    </section>
  );
}

function ShowcaseCards() {
  const [mods, setMods] = useState<Array<{
    name: string; description: string; edition: string;
    weapons: number; tools: number; armor: number; food: number; blocks: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  const fallbackMods = [
    { name: "Thunder Blade Pack", description: "Lightning swords with chain damage", edition: "java", weapons: 3, tools: 0, armor: 0, food: 0, blocks: 0 },
    { name: "Crystal Armor Set", description: "Full crystal armor with glow effects", edition: "bedrock", weapons: 0, tools: 0, armor: 4, food: 0, blocks: 0 },
    { name: "Mystic Foods", description: "Enchanted foods with potion effects", edition: "java", weapons: 0, tools: 0, armor: 0, food: 5, blocks: 0 },
    { name: "Neon Blocks", description: "Glowing neon building blocks", edition: "bedrock", weapons: 0, tools: 0, armor: 0, food: 0, blocks: 8 },
    { name: "Void Tools", description: "Obsidian tools with silk touch", edition: "java", weapons: 0, tools: 4, armor: 0, food: 0, blocks: 0 },
  ];

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/gallery?limit=6&sort=recent`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (data.mods?.length) {
          setMods(data.mods.map((m: { name: string; description: string; edition: string; weapons_count: number; tools_count: number; armor_count: number; food_count: number; blocks_count: number }) => ({
            name: m.name, description: m.description, edition: m.edition,
            weapons: m.weapons_count, tools: m.tools_count, armor: m.armor_count,
            food: m.food_count, blocks: m.blocks_count,
          })));
        } else {
          setMods(fallbackMods);
        }
      })
      .catch(() => setMods(fallbackMods))
      .finally(() => setLoading(false));
  }, []);

  function getCategoryBadge(mod: typeof fallbackMods[0]) {
    if (mod.weapons > 0) return { label: "Weapons", color: "#ff5555" };
    if (mod.tools > 0) return { label: "Tools", color: "#ffaa00" };
    if (mod.armor > 0) return { label: "Armor", color: "#5555ff" };
    if (mod.food > 0) return { label: "Food", color: "#55ff55" };
    if (mod.blocks > 0) return { label: "Blocks", color: "#aa55ff" };
    return { label: "Mod", color: "#d4a017" };
  }

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="mc-panel-loading shrink-0 w-[200px] h-[160px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
      {mods.map((mod, i) => {
        const badge = getCategoryBadge(mod);
        return (
          <div key={i} className="mc-panel shrink-0 w-[200px] p-3">
            <div className="h-16 bg-[#111] mb-2 flex items-center justify-center">
              <span className="text-[16px]" style={{ color: badge.color }}>
                {badge.label === "Weapons" ? "\u2694" : badge.label === "Tools" ? "\u26CF" : badge.label === "Armor" ? "\u{1F6E1}" : badge.label === "Food" ? "\u{1F356}" : badge.label === "Blocks" ? "\u25A0" : "\u2726"}
              </span>
            </div>
            <p className="text-[10px] text-[#d4a017] mb-1 truncate"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {mod.name}
            </p>
            <p className="text-[8px] text-[#808080] mb-2 line-clamp-2"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {mod.description}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[8px] px-1.5 py-0.5" style={{
                fontFamily: "var(--font-pixel), monospace",
                color: badge.color, border: `1px solid ${badge.color}`
              }}>
                {badge.label}
              </span>
              <span className="text-[8px] px-1.5 py-0.5" style={{
                fontFamily: "var(--font-pixel), monospace",
                color: mod.edition === "java" ? "#55ff55" : "#5555ff",
                border: `1px solid ${mod.edition === "java" ? "#55ff55" : "#5555ff"}`
              }}>
                {mod.edition === "java" ? "J" : "B"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ========== HOW IT WORKS ========== */
function HowItWorksSection() {
  const steps = [
    { num: "1", title: "Describe Your Mod", desc: "Tell the AI what items, weapons, armor, or blocks you want. Be as creative as you like.", icon: "\u{1F4AC}" },
    { num: "2", title: "AI Builds It", desc: "Textures, recipes, behaviors, and pack files are generated automatically. Java .jar or Bedrock .mcaddon.", icon: "\u2692" },
    { num: "3", title: "Download & Play", desc: "Drop the file into your mods folder. Works with vanilla Minecraft — no other mods required.", icon: "\u{1F4E6}" },
  ];

  return (
    <section className="py-20 px-4 border-t-[3px]" style={{ borderColor: "#1a1a1a" }}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-[18px] text-[#d4a017] text-center mb-10"
          style={{ fontFamily: "var(--font-pixel), monospace" }}>
          How It Works
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {steps.map(s => (
            <div key={s.num} className="mc-panel p-6 border-t-[2px] border-t-[#d4a017]">
              <div className="text-[24px] text-[#d4a017] mb-3"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {s.num}
              </div>
              <div className="text-[20px] mb-3">{s.icon}</div>
              <h3 className="text-[12px] text-[#d4a017] mb-3"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {s.title}
              </h3>
              <p className="text-[9px] text-[#808080] leading-relaxed"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ========== CAPABILITIES GRID ========== */
function CapabilitiesSection() {
  const capabilities = [
    { title: "Swords & Bows", desc: "Custom damage, enchantments, special abilities, and combos", color: "#ff5555" },
    { title: "Pickaxes & Axes", desc: "Custom mining speeds, durability, and harvest levels", color: "#ffaa00" },
    { title: "Full Armor Sets", desc: "Custom protection, effects, and set bonuses", color: "#5555ff" },
    { title: "Custom Foods", desc: "Hunger restoration, potion effects, and special abilities", color: "#55ff55" },
    { title: "Placeable Blocks", desc: "Custom textures, hardness, drops, and behaviors", color: "#aa55ff" },
    { title: "AI Companions", desc: "Summonable entities with custom AI, gadgets, and abilities", color: "#d4a017" },
  ];

  return (
    <section className="py-20 px-4 border-t-[3px]" style={{ borderColor: "#1a1a1a" }}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-[18px] text-[#d4a017] text-center mb-10"
          style={{ fontFamily: "var(--font-pixel), monospace" }}>
          What You Can Create
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {capabilities.map(c => (
            <div key={c.title} className="mc-panel p-4" style={{ borderLeftColor: c.color, borderLeftWidth: "3px" }}>
              <h3 className="text-[10px] mb-2"
                style={{ fontFamily: "var(--font-pixel), monospace", color: c.color }}>
                {c.title}
              </h3>
              <p className="text-[8px] text-[#808080] leading-relaxed"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ========== FOOTER CTA ========== */
function FooterCTA() {
  return (
    <>
      <section className="py-20 px-4 border-t-[3px]" style={{ borderColor: "#1a1a1a" }}>
        <div className="max-w-2xl mx-auto text-center">
          <div className="mc-panel p-10">
            <h2 className="text-[18px] text-[#d4a017] mb-4"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Build Your First Mod
            </h2>
            <p className="text-[9px] text-[#808080] mb-6 leading-relaxed"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              No coding required. No downloads. Just describe and play.
            </p>
            <a href="/builder" className="mc-btn inline-block px-6 py-3 text-[10px]">
              Get Started
            </a>
          </div>
        </div>
      </section>

      <footer className="py-6 px-4 border-t-[3px]" style={{ borderColor: "#1a1a1a" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[8px] text-[#3d3d3d]"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            ModCrafter
          </span>
          <div className="flex gap-4">
            <a href="/gallery" className="text-[8px] text-[#808080] hover:text-[#c0c0c0]"
              style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
              Gallery
            </a>
            <a href="/builder" className="text-[8px] text-[#808080] hover:text-[#c0c0c0]"
              style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
              Builder
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer"
              className="text-[8px] text-[#808080] hover:text-[#c0c0c0]"
              style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
