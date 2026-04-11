"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { generateMod } from "@/lib/api";
import { Steve, Creeper, Enderman, Chicken } from "@/components/PixelCharacters";
import { FloatingParticles, HeroBackground, XPOrbs } from "@/components/FloatingParticles";
import { ThunderBladeScene, CrystalArmorScene, MysticFoodsScene, NeonBlocksScene } from "@/components/PixelScenes";
import SignupModal from "@/components/SignupModal";
import { supabase } from "@/lib/supabase";
import PixelEmoji from "@/components/PixelEmoji";
import AdSlot from "@/components/AdSlot";

const EXAMPLE_PROMPTS = [
  "Diamond sword that shoots lightning",
  "Emerald armor with flight",
  "Food that gives night vision",
  "Netherite pickaxe that mines 3x3",
  "Glowing neon blocks in 8 colors",
  "Golden apple with regeneration",
];

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("mc_model_preference") || "gpt-oss-120b";
    }
    return "gpt-oss-120b";
  });

  function handleModelChange(model: string) {
    setSelectedModel(model);
    localStorage.setItem("mc_model_preference", model);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setAuthChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
      setAuthChecked(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  function handleInputInteraction() {
    if (authChecked && !authed) {
      setShowSignup(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authChecked) return;
    if (!authed) {
      setShowSignup(true);
      return;
    }
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { job_id } = await generateMod(prompt.trim(), undefined, undefined, undefined, selectedModel);
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
        <section className="flex flex-col items-center justify-center px-4 pt-20 relative overflow-hidden"
          style={{ minHeight: "calc(100vh - 56px)" }}>
          <HeroBackground />
          <FloatingParticles />

          {/* Pixel characters flanking the form */}
          <div className="absolute left-[5%] lg:left-[15%] top-1/2 -translate-y-1/2">
            <Steve />
          </div>
          <div className="absolute right-[5%] lg:right-[15%] top-1/2 -translate-y-1/2">
            <Creeper />
          </div>

          <h1 className="text-[20px] sm:text-[24px] md:text-[28px] text-[#d4a017] text-center mb-4 leading-relaxed"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Create Minecraft Mods
            <span className="block">with AI</span>
          </h1>

          <p className="text-[14px] text-[#808080] text-center mb-8 max-w-xl leading-relaxed"
            style={{ fontFamily: "var(--font-pixel-body), monospace" }}>
            Describe what you want. Download a working{" "}
            <span className="text-[#55ff55]">Java Forge</span> mod.
          </p>

          {/* Model toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => handleModelChange("gpt-oss-120b")}
              className={`px-4 py-2 rounded-lg text-[9px] font-semibold transition ${
                selectedModel === "gpt-oss-120b"
                  ? "bg-[#00ff88] text-black"
                  : "bg-[#1a1a2e] text-gray-400 border border-gray-700 hover:border-[#00ff88]/50"
              }`}
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              GPT-OSS 120B (Fast)
            </button>
            <button
              type="button"
              disabled
              title="Sonnet 4.6 is coming soon"
              className="relative px-4 py-2 rounded-lg text-[9px] font-semibold bg-[#1a1a2e] text-gray-600 border border-gray-800 cursor-not-allowed opacity-60"
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              Sonnet 4.6 (Quality)
              <span
                className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded bg-[#d4a017] text-black text-[7px] font-bold"
                style={{ fontFamily: "var(--font-pixel), monospace" }}
              >
                SOON
              </span>
            </button>
          </div>

          {/* Token cost hint */}
          <p className="text-[8px] text-[#555] mb-3"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Cost: <span className="text-[#55ff55]">1 token</span> per mod · <a href="/pricing" className="text-[#d4a017] hover:text-[#f0c040]" style={{ transition: "none" }}>View pricing →</a>
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
                onFocus={handleInputInteraction}
                readOnly={loading || (authChecked && !authed)}
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
          <div className="flex flex-wrap gap-2 justify-center max-w-[600px] mb-4">
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

          <p className="text-[8px] text-[#555] mb-8"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            or{" "}
            <a href="/create" className="text-[#d4a017] hover:text-[#f0c040]" style={{ transition: "none" }}>
              try conversational mode →
            </a>
          </p>

          <AdSlot slot="home-hero" className="mt-8 max-w-2xl mx-auto" />

          {/* Mods counter */}
          <ModsCounter />

          {/* Demo showcase */}
          <DemoShowcase />
        </section>

        <SignupModal
          open={showSignup}
          onClose={() => setShowSignup(false)}
          onSignup={() => {
            setShowSignup(false);
            router.push("/builder");
          }}
        />

        {/* Remaining sections */}
        <VideoShowcase />
        <ShowcaseSection />
        <HowItWorksSection />
        <CapabilitiesSection />
        <FooterCTA />
      </main>
    </>
  );
}

/* ========== MODS COUNTER ========== */
function ModsCounter() {
  const [count, setCount] = useState(0);
  const target = 262289;

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      <span className="text-[16px] sm:text-[20px] text-[#55ff55]"
        style={{ fontFamily: "var(--font-pixel), monospace" }}>
        {count.toLocaleString()}
      </span>
      <span className="text-[9px] text-[#808080]"
        style={{ fontFamily: "var(--font-pixel), monospace" }}>
        mods created
      </span>
      <span style={{ animation: "idle-bob 2s ease-in-out infinite" }}><PixelEmoji emoji="⭐" size={16} /></span>
    </div>
  );
}

/* ========== DEMO SHOWCASE ========== */
function DemoShowcase() {
  return (
    <div className="w-full max-w-[800px] grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <ThunderBladeScene />
      <CrystalArmorScene />
      <MysticFoodsScene />
      <NeonBlocksScene />
    </div>
  );
}

/* ========== VIDEO SHOWCASE ========== */
function VideoShowcase() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section className="py-16 px-4 border-t-[3px]" style={{ borderColor: "#1a1a1a" }}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-[18px] text-[#d4a017] text-center mb-3"
          style={{ fontFamily: "var(--font-pixel), monospace" }}>
          See It In Action
        </h2>
        <p className="text-[10px] text-[#808080] text-center mb-8"
          style={{ fontFamily: "var(--font-pixel), monospace" }}>
          Watch how easy it is to create your own Minecraft mods.
        </p>

        <div className="mc-video-container">
          {!isPlaying ? (
            <div className="mc-video-placeholder" onClick={() => setIsPlaying(true)}>
              {/* Play button overlay */}
              <div className="mc-panel p-6 mb-4" style={{ background: "rgba(26, 26, 26, 0.9)" }}>
                <span className="text-[40px]">▶</span>
              </div>
              <p className="text-[10px] text-[#d4a017]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Click to play demo
              </p>
              <p className="text-[8px] text-[#808080] mt-2"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Create a full mod in under 60 seconds
              </p>

              {/* Decorative pixel elements */}
              <div className="absolute top-4 left-4 flex gap-2">
                <PixelEmoji emoji="⚔️" size={16} className="opacity-30" />
                <PixelEmoji emoji="🛡️" size={16} className="opacity-30" />
                <PixelEmoji emoji="💎" size={16} className="opacity-30" />
              </div>
              <div className="absolute bottom-4 right-4 flex gap-2">
                <PixelEmoji emoji="🔥" size={16} className="opacity-30" />
                <PixelEmoji emoji="⭐" size={16} className="opacity-30" />
                <PixelEmoji emoji="🎮" size={16} className="opacity-30" />
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#111]">
              <div className="text-center">
                <p className="text-[12px] text-[#d4a017] mb-2"
                  style={{ fontFamily: "var(--font-pixel), monospace" }}>
                  Demo Video
                </p>
                <p className="text-[9px] text-[#808080]"
                  style={{ fontFamily: "var(--font-pixel), monospace" }}>
                  Video coming soon — embed your YouTube/Vimeo URL here
                </p>
                <button
                  onClick={() => setIsPlaying(false)}
                  className="mc-btn mt-4 text-[9px] px-4 py-2"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ========== SHOWCASE SECTION ========== */
function ShowcaseSection() {
  return (
    <section className="py-20 px-4 border-t-[3px]" style={{ borderColor: "#1a1a1a", animation: "torch-flicker 3s ease-in-out infinite" }}>
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
      <div className="relative h-6 mt-8 overflow-hidden">
        <Chicken />
      </div>
    </section>
  );
}

function ShowcaseCards() {
  const [mods, setMods] = useState<Array<{
    name: string; description: string;
    weapons: number; tools: number; armor: number; food: number; blocks: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  const fallbackMods = [
    { name: "Thunder Blade Pack", description: "Lightning swords with chain damage", weapons: 3, tools: 0, armor: 0, food: 0, blocks: 0 },
    { name: "Crystal Armor Set", description: "Full crystal armor with glow effects", weapons: 0, tools: 0, armor: 4, food: 0, blocks: 0 },
    { name: "Mystic Foods", description: "Enchanted foods with potion effects", weapons: 0, tools: 0, armor: 0, food: 5, blocks: 0 },
    { name: "Neon Blocks", description: "Glowing neon building blocks", weapons: 0, tools: 0, armor: 0, food: 0, blocks: 8 },
    { name: "Void Tools", description: "Obsidian tools with silk touch", weapons: 0, tools: 4, armor: 0, food: 0, blocks: 0 },
  ];

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/gallery?limit=6&sort=recent`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (data.mods?.length) {
          setMods(data.mods.map((m: { name: string; description: string; weapons_count: number; tools_count: number; armor_count: number; food_count: number; blocks_count: number }) => ({
            name: m.name, description: m.description,
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
              <PixelEmoji emoji={badge.label === "Weapons" ? "⚔" : badge.label === "Tools" ? "⛏" : badge.label === "Armor" ? "🛡" : badge.label === "Food" ? "🍖" : badge.label === "Blocks" ? "🟪" : "✦"} size={20} />
            </div>
            <p className="text-[10px] text-[#d4a017] mb-1 truncate"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {mod.name}
            </p>
            <p className="text-[13px] text-[#808080] mb-2 line-clamp-2"
              style={{ fontFamily: "var(--font-pixel-body), monospace" }}>
              {mod.description}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[8px] px-1.5 py-0.5" style={{
                fontFamily: "var(--font-pixel), monospace",
                color: badge.color, border: `1px solid ${badge.color}`
              }}>
                {badge.label}
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
    { num: "2", title: "AI Builds It", desc: "Textures, recipes, behaviors, and source files are generated automatically as a Java Forge project.", icon: "\u2692" },
    { num: "3", title: "Download & Play", desc: "Drop the file into your mods folder. Works with vanilla Minecraft — no other mods required.", icon: "\u{1F4E6}" },
  ];

  return (
    <section className="py-20 px-4 border-t-[3px]" style={{ borderColor: "#1a1a1a", animation: "torch-flicker 3s ease-in-out infinite" }}>
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        <div className="relative inline-block">
          <h2 className="text-[18px] text-[#d4a017] text-center mb-10"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            How It Works
          </h2>
          <div className="absolute -right-10 top-0 opacity-50 scale-50 hidden md:block"
            style={{ animation: "idle-bob 2s ease-in-out infinite" }}>
            <Creeper />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          {steps.map(s => (
            <div key={s.num} className="mc-panel p-6 border-t-[2px] border-t-[#d4a017]">
              <div className="text-[24px] text-[#d4a017] mb-3"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {s.num}
              </div>
              <div className="mb-3"><PixelEmoji emoji={s.icon} size={28} /></div>
              <h3 className="text-[12px] text-[#d4a017] mb-3"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {s.title}
              </h3>
              <p className="text-[14px] text-[#808080] leading-relaxed"
                style={{ fontFamily: "var(--font-pixel-body), monospace" }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ========== CAPABILITY CARD ========== */
function CapabilityCard({ title, desc, color }: { title: string; desc: string; color: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="mc-panel p-4 relative overflow-hidden"
      style={{ borderLeftColor: color, borderLeftWidth: "3px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      <h3 className="text-[10px] mb-2"
        style={{ fontFamily: "var(--font-pixel), monospace", color }}>
        {title}
      </h3>
      <p className="text-[13px] text-[#808080] leading-relaxed"
        style={{ fontFamily: "var(--font-pixel-body), monospace" }}>
        {desc}
      </p>
      {hovered && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {[...Array(5)].map((_, i) => (
            <span key={i} className="absolute w-1 h-1"
              style={{
                background: color,
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                animation: `block-break 0.6s ease-out ${i * 0.05}s forwards`,
                ["--bx" as string]: `${(Math.random() - 0.5) * 40}px`,
                ["--by" as string]: `${(Math.random() - 0.5) * 40}px`,
              }} />
          ))}
        </div>
      )}
    </div>
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
    { title: "Custom Skins", desc: "Player skins and texture packs for characters and mobs", color: "#d4a017" },
  ];

  return (
    <section className="py-20 px-4 border-t-[3px]" style={{ borderColor: "#1a1a1a", animation: "torch-flicker 3s ease-in-out infinite" }}>
      <div className="max-w-4xl mx-auto relative">
        <div className="absolute right-0 top-20 opacity-40 hidden lg:block">
          <Enderman />
        </div>
        <h2 className="text-[18px] text-[#d4a017] text-center mb-10"
          style={{ fontFamily: "var(--font-pixel), monospace" }}>
          What You Can Create
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {capabilities.map(c => (
            <CapabilityCard key={c.title} title={c.title} desc={c.desc} color={c.color} />
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
      <section className="py-20 px-4 border-t-[3px]" style={{ borderColor: "#1a1a1a", animation: "torch-flicker 3s ease-in-out infinite" }}>
        <div className="max-w-2xl mx-auto text-center">
          <div className="mc-panel p-10 relative overflow-hidden">
            <XPOrbs />
            <h2 className="text-[18px] text-[#d4a017] mb-4"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Build Your First Mod
            </h2>
            <p className="text-[15px] text-[#808080] mb-6 leading-relaxed"
              style={{ fontFamily: "var(--font-pixel-body), monospace" }}>
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
          <div className="flex flex-wrap gap-4">
            <a href="/gallery" className="text-[8px] text-[#808080] hover:text-[#c0c0c0]"
              style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
              Explore
            </a>
            <a href="/gallery/marketplace" className="text-[8px] text-[#808080] hover:text-[#c0c0c0]"
              style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
              Marketplace
            </a>
            <a href="/create" className="text-[8px] text-[#808080] hover:text-[#c0c0c0]"
              style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
              Create
            </a>
            <a href="/create/skins" className="text-[8px] text-[#808080] hover:text-[#c0c0c0]"
              style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
              Skins
            </a>
            <a href="/pricing" className="text-[8px] text-[#d4a017] hover:text-[#f0c040]"
              style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
              Tokens
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
