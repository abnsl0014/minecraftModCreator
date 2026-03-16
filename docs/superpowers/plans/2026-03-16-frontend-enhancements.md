# Frontend Enhancements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Java "Coming Soon" state, a Lovable-style `/create` chat interface, and creative Minecraft pixel-art characters to the landing page.

**Architecture:** Three independent features touching frontend only. Feature 1 (Java Coming Soon) modifies ModForm and hero subtitle. Feature 2 (Chat Interface) adds a new `/create` route with split-pane layout and dummy AI responses. Feature 3 (Creative Landing Page) adds CSS pixel-art characters, floating particles, and interactive demo cards to the homepage.

**Tech Stack:** Next.js 15, React, Tailwind CSS v4, CSS pixel art (div grids), CSS keyframe animations

---

## Chunk 1: Java Edition "Coming Soon" + New CSS Animations

### Task 1: Add shake and tooltip keyframes to globals.css

**Files:**
- Modify: `frontend/src/app/globals.css:77-97` (append after existing keyframes)

- [ ] **Step 1: Add new CSS keyframes and utility classes**

Append to `frontend/src/app/globals.css`:

```css
/* === Java Coming Soon === */
@keyframes mc-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-3px); }
  40% { transform: translateX(3px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
}

.mc-shake {
  animation: mc-shake 0.3s ease-in-out;
}

.mc-tooltip-smooth {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 8px !important;
  padding: 8px 14px;
  font-size: 11px;
  color: #d1d5db;
  font-family: system-ui, -apple-system, sans-serif;
  white-space: nowrap;
  z-index: 50;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  animation: mc-tooltip-smooth-fade 3s ease-in-out forwards;
}

.mc-tooltip-smooth::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #374151;
}

@keyframes mc-tooltip-smooth-fade {
  0% { opacity: 0; transform: translateX(-50%) translateY(4px); }
  10% { opacity: 1; transform: translateX(-50%) translateY(0); }
  80% { opacity: 1; }
  100% { opacity: 0; }
}

/* === Floating Particles === */
@keyframes float-up {
  0% { transform: translateY(0) translateX(0); opacity: 0.6; }
  50% { opacity: 0.4; }
  100% { transform: translateY(-400px) translateX(20px); opacity: 0; }
}

@keyframes float-up-reverse {
  0% { transform: translateY(0) translateX(0); opacity: 0.6; }
  50% { opacity: 0.4; }
  100% { transform: translateY(-400px) translateX(-20px); opacity: 0; }
}

/* === Character Animations === */
@keyframes idle-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes walk-cycle {
  0% { transform: translateX(-100px); }
  100% { transform: translateX(calc(100vw + 100px)); }
}

@keyframes block-break {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0) translate(var(--bx), var(--by)); opacity: 0; }
}

@keyframes xp-float {
  0% { transform: translateY(0) scale(1); opacity: 0.8; }
  100% { transform: translateY(-60px) scale(0.5); opacity: 0; }
}

@keyframes torch-flicker {
  0%, 100% { box-shadow: 0 0 4px 1px rgba(212, 160, 23, 0.3); }
  50% { box-shadow: 0 0 8px 2px rgba(212, 160, 23, 0.6); }
}

/* === Chat Interface === */
@keyframes bounce-dots {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}

.typing-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: #808080;
  animation: bounce-dots 1.2s ease-in-out infinite;
}

.typing-dot:nth-child(2) { animation-delay: 0.15s; }
.typing-dot:nth-child(3) { animation-delay: 0.3s; }
```

- [ ] **Step 2: Verify CSS compiles**

Run: `cd c:/Users/nc157/Projects/minecraftModCreator/frontend && npx next build --no-lint 2>&1 | head -20`
Expected: No CSS parse errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat: add CSS keyframes for shake, tooltip, particles, characters, and chat"
```

---

### Task 2: Add Java "Coming Soon" to ModForm edition selector

**Files:**
- Modify: `frontend/src/components/ModForm.tsx:200-330`

- [ ] **Step 1: Add shake state and tooltip to ModForm**

In `ModForm.tsx`, add state variables after the existing state declarations (after line ~209):

```tsx
const [javaShake, setJavaShake] = useState(false);
const [javaTooltip, setJavaTooltip] = useState(false);
```

- [ ] **Step 2: Replace the Java edition button**

Replace the Java edition button (lines 322-324) from:

```tsx
<button type="button" onClick={() => setEdition("java")}
  className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${edition === "java" ? "bg-green-600 text-white shadow-lg shadow-green-600/25" : "bg-gray-800/50 text-gray-400 hover:text-white border border-gray-700"}`}>
  Java Edition<span className="block text-xs opacity-70">.jar (Desktop)</span>
</button>
```

To:

```tsx
<button type="button" onClick={() => {
    setJavaShake(true);
    setJavaTooltip(true);
    setTimeout(() => setJavaShake(false), 300);
    setTimeout(() => setJavaTooltip(false), 3000);
  }}
  className={`relative px-5 py-2.5 rounded-lg font-medium text-sm bg-gray-800/30 text-gray-500 border border-gray-700/50 cursor-not-allowed ${javaShake ? "mc-shake" : ""}`}>
  <span className="flex items-center gap-2">
    <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
    Java Edition
  </span>
  <span className="block text-xs opacity-50">.jar (Desktop)</span>
  <span className="absolute -top-2 -right-2 bg-yellow-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
    SOON
  </span>
  {javaTooltip && (
    <span className="mc-tooltip-smooth">
      Java Edition is coming soon! Bedrock is fully supported.
    </span>
  )}
</button>
```

- [ ] **Step 3: Force edition to bedrock on mount**

Ensure `useState<"java" | "bedrock">("bedrock")` is the default (already is, line 206). No change needed — just verify.

- [ ] **Step 4: Verify visually**

Run: `cd c:/Users/nc157/Projects/minecraftModCreator/frontend && npm run dev`
Open `/builder` — confirm Java button is dimmed with lock icon, "SOON" badge, shake on click, tooltip appears and fades.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ModForm.tsx
git commit -m "feat: add Java Edition Coming Soon state to ModForm"
```

---

### Task 3: Update hero subtitle with Java "(soon)"

**Files:**
- Modify: `frontend/src/app/page.tsx:47-52`

- [ ] **Step 1: Update the subtitle text**

Replace the subtitle paragraph (lines 47-52):

```tsx
<p className="text-[10px] text-[#808080] text-center mb-8 max-w-xl leading-relaxed"
  style={{ fontFamily: "var(--font-pixel), monospace" }}>
  Describe what you want. Download a working mod.{" "}
  <span className="text-[#55ff55]">Java</span> &amp;{" "}
  <span className="text-[#5555ff]">Bedrock</span> supported.
</p>
```

With:

```tsx
<p className="text-[10px] text-[#808080] text-center mb-8 max-w-xl leading-relaxed"
  style={{ fontFamily: "var(--font-pixel), monospace" }}>
  Describe what you want. Download a working mod.{" "}
  <span className="text-[#55ff55]">Java</span>
  <span className="text-[#555555] text-[8px]"> (soon)</span> &amp;{" "}
  <span className="text-[#5555ff]">Bedrock</span> supported.
</p>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: add (soon) suffix to Java in hero subtitle"
```

---

## Chunk 2: `/create` Chat Interface

### Task 4: Create dummy response data

**Files:**
- Create: `frontend/src/lib/dummyResponses.ts`

- [ ] **Step 1: Create the dummy responses file**

Create `frontend/src/lib/dummyResponses.ts`:

```typescript
export interface ItemData {
  name: string;
  category: "weapon" | "tool" | "armor" | "food" | "block";
  icon: string;
  stats: Record<string, string | number>;
  description: string;
}

export interface DummyResponse {
  keywords: string[];
  text: string;
  items: ItemData[];
}

export const DUMMY_RESPONSES: DummyResponse[] = [
  {
    keywords: ["sword", "blade", "lightning", "thunder"],
    text: "I'll create a Thunder Blade for you! Here's what I'm building — a powerful sword infused with lightning energy.",
    items: [
      {
        name: "Thunder Blade",
        category: "weapon",
        icon: "\u2694\uFE0F",
        stats: { Damage: 20, Speed: 1.6, Effects: "Lightning Strike" },
        description: "A diamond sword crackling with electric energy. Summons lightning on critical hits.",
      },
    ],
  },
  {
    keywords: ["armor", "set", "crystal", "diamond"],
    text: "Building a full Crystal Armor set! Each piece provides unique passive effects when worn together.",
    items: [
      {
        name: "Crystal Helmet",
        category: "armor",
        icon: "\u{1FA96}",
        stats: { Defense: 8, Effect: "Night Vision" },
        description: "A shimmering crystal helmet that lets you see in the dark.",
      },
      {
        name: "Crystal Chestplate",
        category: "armor",
        icon: "\u{1F6E1}\uFE0F",
        stats: { Defense: 12, Effect: "Regeneration" },
        description: "Crystal-forged body armor with regenerative properties.",
      },
      {
        name: "Crystal Leggings",
        category: "armor",
        icon: "\u{1F9CA}",
        stats: { Defense: 8, Effect: "Speed" },
        description: "Lightweight crystal leggings that boost movement speed.",
      },
      {
        name: "Crystal Boots",
        category: "armor",
        icon: "\u{1F462}",
        stats: { Defense: 5, Effect: "Jump Boost" },
        description: "Crystal boots that let you leap higher.",
      },
    ],
  },
  {
    keywords: ["damage", "upgrade", "more", "stronger", "powerful"],
    text: "Upgraded! I've boosted the damage and added extra effects. This should pack a serious punch now.",
    items: [
      {
        name: "Thunder Blade+",
        category: "weapon",
        icon: "\u2694\uFE0F",
        stats: { Damage: 30, Speed: 1.8, Effects: "Lightning + Fire" },
        description: "An upgraded Thunder Blade with devastating damage and dual elemental effects.",
      },
    ],
  },
  {
    keywords: ["pickaxe", "mine", "mining", "tool", "drill"],
    text: "Crafting a powerful mining tool! This pickaxe will tear through stone like butter.",
    items: [
      {
        name: "Void Pickaxe",
        category: "tool",
        icon: "\u26CF\uFE0F",
        stats: { Speed: 12, Durability: 3000, "Harvest Level": "Obsidian" },
        description: "An obsidian pickaxe that mines at incredible speed with auto-smelt.",
      },
    ],
  },
  {
    keywords: ["food", "apple", "eat", "hunger", "potion"],
    text: "Cooking up something special! This food item will keep you going through any adventure.",
    items: [
      {
        name: "Divine Apple",
        category: "food",
        icon: "\u{1F34E}",
        stats: { Hunger: 20, Effects: "Regen + Absorption + Resistance" },
        description: "A golden apple radiating divine energy. Restores full hunger and grants powerful buffs.",
      },
    ],
  },
  {
    keywords: ["block", "glow", "neon", "light", "build"],
    text: "Creating some awesome building blocks! These will light up any build.",
    items: [
      {
        name: "Neon Block",
        category: "block",
        icon: "\u25A0",
        stats: { Light: 15, Hardness: "Stone" },
        description: "A vibrant glowing block that emits maximum light. Comes in multiple colors.",
      },
      {
        name: "Crystal Block",
        category: "block",
        icon: "\u{1F48E}",
        stats: { Light: 10, Hardness: "Iron" },
        description: "A translucent crystal block with a soft inner glow.",
      },
    ],
  },
  {
    keywords: ["gun", "rpg", "shoot", "projectile", "rifle"],
    text: "Building a custom projectile weapon! This will launch explosive rounds at your enemies.",
    items: [
      {
        name: "Nether Launcher",
        category: "weapon",
        icon: "\u{1F4A5}",
        stats: { Damage: 35, "Fire Rate": "1/s", Effects: "Explosion + Fire" },
        description: "An RPG-style launcher that fires explosive nether fireballs.",
      },
    ],
  },
];

export const FALLBACK_RESPONSE: DummyResponse = {
  keywords: [],
  text: "I've created something interesting based on your idea! Check out the preview.",
  items: [
    {
      name: "Mystery Item",
      category: "weapon",
      icon: "\u2728",
      stats: { Damage: 15, Effects: "Random" },
      description: "A mysterious item forged from your imagination. Who knows what it can do?",
    },
  ],
};

export function findResponse(input: string): DummyResponse {
  const lower = input.toLowerCase();
  const match = DUMMY_RESPONSES.find((r) =>
    r.keywords.some((kw) => lower.includes(kw))
  );
  return match || FALLBACK_RESPONSE;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/dummyResponses.ts
git commit -m "feat: add dummy response data for chat interface"
```

---

### Task 5: Create ChatInterface component

**Files:**
- Create: `frontend/src/components/ChatInterface.tsx`

- [ ] **Step 1: Create the ChatInterface component**

Create `frontend/src/components/ChatInterface.tsx`:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { findResponse, ItemData } from "@/lib/dummyResponses";

interface Message {
  role: "user" | "ai";
  text: string;
  items?: ItemData[];
}

const CATEGORY_COLORS: Record<string, string> = {
  weapon: "#ff5555",
  tool: "#ffaa00",
  armor: "#5555ff",
  food: "#55ff55",
  block: "#aa55ff",
};

function ItemCard({ item }: { item: ItemData }) {
  return (
    <div className="mc-panel p-3 flex gap-3" style={{ borderLeftColor: CATEGORY_COLORS[item.category], borderLeftWidth: "4px" }}>
      <div className="text-[24px] shrink-0 w-10 h-10 flex items-center justify-center bg-[#111]">
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#d4a017] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {item.name}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1">
          {Object.entries(item.stats).map(([key, val]) => (
            <span key={key} className="text-[8px] text-[#c0c0c0]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              <span className="text-[#808080]">{key}:</span> {val}
            </span>
          ))}
        </div>
        <p className="text-[8px] text-[#808080]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {item.description}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="mc-panel inline-block px-4 py-2">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  );
}

export default function ChatInterface({ initialPrompt }: { initialPrompt?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [modName, setModName] = useState("My Custom Mod");
  const [toastVisible, setToastVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "preview">("chat");
  const hasSubmittedInitial = useRef(false);

  const allItems = messages.filter((m) => m.role === "ai" && m.items).flatMap((m) => m.items!);

  function submitPrompt(text: string) {
    if (!text.trim() || typing) return;

    const userMsg: Message = { role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    // Simulate AI delay
    setTimeout(() => {
      const response = findResponse(text);
      const aiMsg: Message = { role: "ai", text: response.text, items: response.items };
      setMessages((prev) => [...prev, aiMsg]);
      setTyping(false);
    }, 1200 + Math.random() * 800);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitPrompt(input);
  }

  // Auto-submit initial prompt from URL
  useEffect(() => {
    if (initialPrompt && !hasSubmittedInitial.current) {
      hasSubmittedInitial.current = true;
      submitPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function handleGenerate() {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  }

  // Chat pane
  const chatPane = (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: "#3d3d3d #111" }}>
        {messages.length === 0 && !typing && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-[12px] text-[#d4a017] mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Describe your mod
            </p>
            <p className="text-[8px] text-[#808080] max-w-[250px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Tell me what items, weapons, armor, or tools you want, and I&apos;ll build it for you.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] ${msg.role === "user" ? "mc-panel-inset" : "mc-panel"} px-3 py-2`}>
              <p className="text-[9px] text-[#c0c0c0]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {msg.text}
              </p>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <TypingIndicator />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t-[3px]" style={{ borderColor: "#3d3d3d" }}>
        <div className="mc-panel-inset flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe items, weapons, armor..."
            className="flex-1 bg-transparent px-3 py-2 text-[9px] text-[#c0c0c0] focus:outline-none placeholder-[#555]"
            style={{ fontFamily: "var(--font-pixel), monospace" }}
            disabled={typing}
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            className="mc-btn px-3 py-1.5 m-1 text-[10px]"
          >
            &gt;
          </button>
        </div>
      </form>
    </div>
  );

  // Preview pane
  const previewPane = (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: "thin", scrollbarColor: "#3d3d3d #111" }}>
        {/* Mod header */}
        <div className="flex items-center gap-3 mb-2">
          <input
            type="text"
            value={modName}
            onChange={(e) => setModName(e.target.value)}
            className="bg-transparent text-[12px] text-[#d4a017] focus:outline-none focus:border-b-2 focus:border-[#d4a017] flex-1"
            style={{ fontFamily: "var(--font-pixel), monospace" }}
          />
          <span className="text-[8px] px-2 py-1 bg-[#5555ff]/20 text-[#5555ff] border border-[#5555ff]/40"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Bedrock
          </span>
        </div>

        {allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[20px] mb-3 opacity-30">{"\u{1F4E6}"}</p>
            <p className="text-[9px] text-[#808080]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Items will appear here as you describe your mod.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[8px] text-[#808080]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {allItems.length} {allItems.length === 1 ? "item" : "items"}
            </p>
            <div className="grid grid-cols-1 gap-3">
              {allItems.map((item, i) => (
                <ItemCard key={i} item={item} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Generate button */}
      {allItems.length > 0 && (
        <div className="p-4 border-t-[3px]" style={{ borderColor: "#3d3d3d" }}>
          <button onClick={handleGenerate} className="mc-btn w-full py-3 text-[10px]"
            style={{ color: "#d4a017" }}>
            Generate Add-On ({allItems.length} {allItems.length === 1 ? "item" : "items"})
          </button>
          <p className="text-[7px] text-[#555] text-center mt-2"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Not happy? Keep chatting to refine your mod.
          </p>
        </div>
      )}

      {/* Toast */}
      {toastVisible && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 mc-panel px-4 py-2 border-l-4 border-l-[#55ff55] z-50">
          <p className="text-[8px] text-[#55ff55]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Add-on generated! Download starting...
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Mobile tabs */}
      <div className="md:hidden flex border-b-[3px]" style={{ borderColor: "#3d3d3d" }}>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-2 text-[10px] text-center ${activeTab === "chat" ? "text-[#d4a017] bg-[#1a1a1a]" : "text-[#808080]"}`}
          style={{ fontFamily: "var(--font-pixel), monospace" }}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`flex-1 py-2 text-[10px] text-center ${activeTab === "preview" ? "text-[#d4a017] bg-[#1a1a1a]" : "text-[#808080]"}`}
          style={{ fontFamily: "var(--font-pixel), monospace" }}
        >
          Preview {allItems.length > 0 && `(${allItems.length})`}
        </button>
      </div>

      {/* Desktop: split pane, Mobile: tabbed */}
      <div className="flex-1 flex overflow-hidden">
        <div className={`md:w-[40%] md:border-r-[3px] md:block ${activeTab === "chat" ? "block" : "hidden"} w-full`}
          style={{ borderColor: "#3d3d3d" }}>
          {chatPane}
        </div>
        <div className={`md:w-[60%] md:block ${activeTab === "preview" ? "block" : "hidden"} w-full relative bg-[#111]`}>
          {previewPane}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ChatInterface.tsx
git commit -m "feat: add ChatInterface component with split-pane chat + preview"
```

---

### Task 6: Create /create route page

**Files:**
- Create: `frontend/src/app/create/layout.tsx`
- Create: `frontend/src/app/create/page.tsx`

Note: The `create/` directory needs to be created first (`mkdir -p frontend/src/app/create`).

- [ ] **Step 1: Create the route layout with metadata**

Create `frontend/src/app/create/layout.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create - ModCrafter",
  description: "Create Minecraft mods through conversation",
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 2: Create the route page**

Create `frontend/src/app/create/page.tsx`:

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Header from "@/components/Header";
import ChatInterface from "@/components/ChatInterface";

function CreateContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt") || undefined;

  return <ChatInterface initialPrompt={initialPrompt} />;
}

export default function CreatePage() {
  return (
    <>
      <Header />
      <main className="pt-14">
        <Suspense fallback={
          <div className="h-[calc(100vh-56px)] flex items-center justify-center">
            <p className="text-[10px] text-[#808080]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Loading...<span className="mc-blink">_</span>
            </p>
          </div>
        }>
          <CreateContent />
        </Suspense>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/create/layout.tsx frontend/src/app/create/page.tsx
git commit -m "feat: add /create route page with metadata and Suspense wrapper"
```

---

### Task 7: Add "Create" nav link to Header + secondary CTA on homepage

**Files:**
- Modify: `frontend/src/components/Header.tsx:29-44` (desktop nav)
- Modify: `frontend/src/components/Header.tsx:57-73` (mobile menu)
- Modify: `frontend/src/app/page.tsx:97-110` (after example prompts, before DemoShowcase)

- [ ] **Step 1: Add "Create" link to Header desktop nav**

In `Header.tsx`, add a Create link between Gallery and Builder in the desktop nav (after line 34):

```tsx
<Link href="/create"
  className="text-[10px] text-[#808080] hover:text-[#c0c0c0]"
  style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
  Create
</Link>
```

- [ ] **Step 2: Add "Create" link to Header mobile menu**

In `Header.tsx`, add a Create link in the mobile dropdown (after Gallery, before Builder):

```tsx
<Link href="/create" onClick={() => setMenuOpen(false)}
  className="text-[10px] text-[#808080] hover:text-[#c0c0c0]"
  style={{ fontFamily: "var(--font-pixel), monospace" }}>
  Create
</Link>
```

- [ ] **Step 3: Add secondary CTA on homepage**

In `page.tsx`, after the example prompts section (after the closing `</div>` of the flex wrap around line 110), add:

```tsx
<p className="text-[8px] text-[#555] mb-12"
  style={{ fontFamily: "var(--font-pixel), monospace" }}>
  or{" "}
  <a href="/create" className="text-[#d4a017] hover:text-[#f0c040]" style={{ transition: "none" }}>
    try conversational mode →
  </a>
</p>
```

And remove the `mb-12` from the example prompts `<div>` (change `mb-12` to `mb-4`).

- [ ] **Step 4: Add "Create" link to footer**

In `page.tsx`, add a Create link in the footer between Gallery and Builder:

```tsx
<a href="/create" className="text-[8px] text-[#808080] hover:text-[#c0c0c0]"
  style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
  Create
</a>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Header.tsx frontend/src/app/page.tsx
git commit -m "feat: add Create nav link and secondary CTA linking to /create"
```

---

## Chunk 3: Creative Landing Page — Pixel Characters & Particles

### Task 8: Create PixelCharacters component

**Files:**
- Create: `frontend/src/components/PixelCharacters.tsx`

- [ ] **Step 1: Create pixel-art character components**

Create `frontend/src/components/PixelCharacters.tsx`:

```tsx
"use client";

// CSS Pixel Art characters — pure divs, no images
// Each character is a grid of colored cells

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

// Steve — 8x16 pixel character
const STEVE_PIXELS: (string | null)[][] = [
  // Hair (rows 0-1)
  [null, "#4a3728", "#4a3728", "#4a3728", "#4a3728", "#4a3728", "#4a3728", null],
  ["#4a3728", "#4a3728", "#4a3728", "#4a3728", "#4a3728", "#4a3728", "#4a3728", "#4a3728"],
  // Face (rows 2-4)
  ["#c8946e", "#c8946e", "#c8946e", "#c8946e", "#c8946e", "#c8946e", "#c8946e", "#c8946e"],
  ["#c8946e", "#fff", "#4a3728", "#c8946e", "#c8946e", "#4a3728", "#fff", "#c8946e"],
  ["#c8946e", "#c8946e", "#c8946e", "#b07858", "#b07858", "#c8946e", "#c8946e", "#c8946e"],
  // Neck
  [null, null, "#c8946e", "#c8946e", "#c8946e", "#c8946e", null, null],
  // Shirt (rows 6-10)
  [null, "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", null],
  ["#c8946e", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#c8946e"],
  ["#c8946e", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#c8946e"],
  [null, "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", null],
  [null, null, "#3a9cd5", "#3a9cd5", "#3a9cd5", "#3a9cd5", null, null],
  // Pants (rows 11-13)
  [null, null, "#2a2a6e", "#2a2a6e", "#2a2a6e", "#2a2a6e", null, null],
  [null, null, "#2a2a6e", "#2a2a6e", "#2a2a6e", "#2a2a6e", null, null],
  [null, null, "#2a2a6e", null, null, "#2a2a6e", null, null],
  // Shoes (rows 14-15)
  [null, "#555", "#555", null, null, "#555", "#555", null],
  [null, "#555", "#555", null, null, "#555", "#555", null],
];

// Creeper — 8x16 pixel character
const CREEPER_PIXELS: (string | null)[][] = [
  // Top of head
  ["#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c"],
  ["#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c"],
  // Eyes
  ["#4ca64c", "#111", "#111", "#4ca64c", "#4ca64c", "#111", "#111", "#4ca64c"],
  ["#4ca64c", "#111", "#111", "#4ca64c", "#4ca64c", "#111", "#111", "#4ca64c"],
  // Mouth
  ["#4ca64c", "#4ca64c", "#111", "#111", "#111", "#111", "#4ca64c", "#4ca64c"],
  ["#4ca64c", "#111", "#111", "#4ca64c", "#4ca64c", "#111", "#111", "#4ca64c"],
  ["#4ca64c", "#111", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#111", "#4ca64c"],
  // Body
  [null, "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", null],
  [null, "#3d8a3d", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#3d8a3d", null],
  [null, "#3d8a3d", "#4ca64c", "#4ca64c", "#4ca64c", "#4ca64c", "#3d8a3d", null],
  [null, "#3d8a3d", "#3d8a3d", "#4ca64c", "#4ca64c", "#3d8a3d", "#3d8a3d", null],
  // Legs
  ["#3d8a3d", "#3d8a3d", "#3d8a3d", null, null, "#3d8a3d", "#3d8a3d", "#3d8a3d"],
  ["#3d8a3d", "#3d8a3d", "#3d8a3d", null, null, "#3d8a3d", "#3d8a3d", "#3d8a3d"],
  ["#2d6e2d", "#2d6e2d", "#2d6e2d", null, null, "#2d6e2d", "#2d6e2d", "#2d6e2d"],
  ["#2d6e2d", "#2d6e2d", "#2d6e2d", null, null, "#2d6e2d", "#2d6e2d", "#2d6e2d"],
  ["#2d6e2d", "#2d6e2d", "#2d6e2d", null, null, "#2d6e2d", "#2d6e2d", "#2d6e2d"],
];

// Enderman — 6x20 (tall and thin)
const ENDERMAN_PIXELS: (string | null)[][] = [
  // Head
  [null, "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", null],
  ["#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e"],
  ["#1a1a2e", "#d455ff", "#1a1a2e", "#1a1a2e", "#d455ff", "#1a1a2e"],
  ["#1a1a2e", "#d455ff", "#1a1a2e", "#1a1a2e", "#d455ff", "#1a1a2e"],
  ["#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e"],
  // Neck
  [null, null, "#1a1a2e", "#1a1a2e", null, null],
  // Body
  [null, "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", null],
  [null, "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", null],
  [null, "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", null],
  [null, "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", null],
  // Arms (extend outward)
  ["#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e"],
  // Lower body
  [null, "#1a1a2e", "#1a1a2e", "#1a1a2e", "#1a1a2e", null],
  [null, null, "#1a1a2e", "#1a1a2e", null, null],
  // Legs (long)
  [null, null, "#1a1a2e", "#1a1a2e", null, null],
  [null, "#1a1a2e", null, null, "#1a1a2e", null],
  [null, "#1a1a2e", null, null, "#1a1a2e", null],
  [null, "#1a1a2e", null, null, "#1a1a2e", null],
  [null, "#1a1a2e", null, null, "#1a1a2e", null],
  ["#1a1a2e", "#1a1a2e", null, null, "#1a1a2e", "#1a1a2e"],
  ["#1a1a2e", "#1a1a2e", null, null, "#1a1a2e", "#1a1a2e"],
];

// Chicken — 8x6 tiny
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/PixelCharacters.tsx
git commit -m "feat: add CSS pixel-art character components (Steve, Creeper, Enderman, Chicken)"
```

---

### Task 9: Create FloatingParticles component

**Files:**
- Create: `frontend/src/components/FloatingParticles.tsx`

- [ ] **Step 1: Create the floating particles component**

Create `frontend/src/components/FloatingParticles.tsx`:

```tsx
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
  // CSS pixel-art landscape: grass blocks at bottom, dark sky, floating blocks
  const GRASS_COLORS = ["#4a8c2a", "#5a9e36", "#4a8c2a", "#3d7a22", "#5a9e36", "#4a8c2a"];
  const DIRT_COLOR = "#8b6c42";
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Floating blocks in sky */}
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
      {/* Grass/dirt strip at bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex h-4 opacity-30 hidden md:flex">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col"
          >
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/FloatingParticles.tsx
git commit -m "feat: add FloatingParticles and XPOrbs ambient components"
```

---

### Task 10: Create PixelScenes component for demo showcase

**Files:**
- Create: `frontend/src/components/PixelScenes.tsx`

- [ ] **Step 1: Create interactive demo scene cards**

Create `frontend/src/components/PixelScenes.tsx`:

```tsx
"use client";

import { useState } from "react";

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
        <span className="text-[40px]">{"\u2694\uFE0F"}</span>
        <span className="text-[14px] opacity-60">{"\u26A1"}</span>
      </div>
    </SceneCard>
  );
}

export function CrystalArmorScene() {
  return (
    <SceneCard title="Crystal Armor Set" description="Full crystal armor with glow effects and set bonuses" color="#5555ff">
      <div className="flex gap-2 items-end">
        <span className="text-[24px]">{"\u{1FA96}"}</span>
        <span className="text-[32px]">{"\u{1F6E1}\uFE0F"}</span>
        <span className="text-[24px]">{"\u{1F9CA}"}</span>
        <span className="text-[20px]">{"\u{1F462}"}</span>
      </div>
    </SceneCard>
  );
}

export function MysticFoodsScene() {
  return (
    <SceneCard title="Mystic Foods" description="Enchanted foods with powerful potion effects" color="#55ff55">
      <div className="flex gap-3 items-center">
        <span className="text-[28px]">{"\u{1F34E}"}</span>
        <span className="text-[28px]">{"\u{1F356}"}</span>
        <span className="text-[28px]">{"\u{1F370}"}</span>
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/PixelScenes.tsx
git commit -m "feat: add interactive pixel scene cards for demo showcase"
```

---

### Task 11: Integrate all creative elements into the landing page

**Files:**
- Modify: `frontend/src/app/page.tsx` (hero, DemoShowcase, section accents, footer)

- [ ] **Step 1: Add imports at top of page.tsx**

Add these imports after the existing imports (after line 6):

```tsx
import { Steve, Creeper, Enderman, Chicken } from "@/components/PixelCharacters";
import { FloatingParticles, HeroBackground, XPOrbs } from "@/components/FloatingParticles";
import { ThunderBladeScene, CrystalArmorScene, MysticFoodsScene, NeonBlocksScene } from "@/components/PixelScenes";
```

- [ ] **Step 2: Add characters and particles to hero section**

Wrap the hero `<section>` content in a `relative` container, and add Steve, Creeper, and FloatingParticles.

Change the hero section opening tag to:
```tsx
<section className="flex flex-col items-center justify-center px-4 pt-20 relative overflow-hidden"
  style={{ minHeight: "calc(100vh - 56px)" }}>
  <HeroBackground />
  <FloatingParticles />
```

Add Steve and Creeper around the hero prompt form. After the `</form>` tag (line ~80) and before the error section, insert:

```tsx
{/* Pixel characters flanking the form */}
<div className="absolute left-[5%] lg:left-[15%] top-1/2 -translate-y-1/2">
  <Steve />
</div>
<div className="absolute right-[5%] lg:right-[15%] top-1/2 -translate-y-1/2">
  <Creeper />
</div>
```

- [ ] **Step 3: Replace DemoShowcase with pixel scene cards**

Replace the `DemoShowcase` function (lines 127-169) with:

```tsx
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
```

- [ ] **Step 4: Add Chicken accent to ShowcaseSection**

In the `ShowcaseSection` function, add a chicken walking across the bottom. After the closing `</div>` of `max-w-6xl` and before `</section>`, add:

```tsx
<div className="relative h-6 mt-8 overflow-hidden">
  <Chicken />
</div>
```

- [ ] **Step 5: Add Creeper peek to HowItWorksSection**

In `HowItWorksSection`, make the heading container relative and add a small Creeper peek. Replace the `<h2>` heading with:

```tsx
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
```

Wrap the section's `max-w-4xl` div content in a flex-col items-center to center the relative heading properly.

- [ ] **Step 6: Add Enderman to CapabilitiesSection**

In `CapabilitiesSection`, make the container relative and add an Enderman. After the opening `<div className="max-w-4xl mx-auto">`, add:

```tsx
<div className="absolute right-0 top-20 opacity-40 hidden lg:block">
  <Enderman />
</div>
```

And add `relative` to the `max-w-4xl mx-auto` div.

- [ ] **Step 6b: Add block-break particles to capability cards on hover**

In `CapabilitiesSection`, convert each capability card to a stateful component with hover-triggered block-break particles. Replace the card `div` with:

```tsx
{capabilities.map(c => (
  <CapabilityCard key={c.title} title={c.title} desc={c.desc} color={c.color} />
))}
```

Add this component above `CapabilitiesSection`:

```tsx
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
      <p className="text-[8px] text-[#808080] leading-relaxed"
        style={{ fontFamily: "var(--font-pixel), monospace" }}>
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
```

Note: `page.tsx` already imports `useState` at the top.

- [ ] **Step 7: Add XP Orbs to FooterCTA**

In `FooterCTA`, make the mc-panel relative and add XPOrbs. Add `relative overflow-hidden` to the `mc-panel p-10` div, and insert `<XPOrbs />` as its first child.

- [ ] **Step 8: Add torch flicker to section borders**

Add the torch-flicker animation to section top borders. For each section (`ShowcaseSection`, `HowItWorksSection`, `CapabilitiesSection`, `FooterCTA`), add to the section element's style:

```tsx
style={{ borderColor: "#1a1a1a", animation: "torch-flicker 3s ease-in-out infinite" }}
```

- [ ] **Step 9: Verify visually**

Run: `cd c:/Users/nc157/Projects/minecraftModCreator/frontend && npm run dev`
Open `/` — verify:
- Pixel-art background landscape with grass strip and floating blocks (desktop only)
- Steve and Creeper flank the hero input (desktop only)
- Floating particles drift upward across the hero
- 4 interactive demo cards with hover effects
- Chicken walks across Showcase section
- Creeper peeks near "How It Works"
- Enderman appears near "What You Can Create"
- XP orbs float in footer CTA
- Subtle gold glow on section borders

- [ ] **Step 10: Delete old demo SVG files**

```bash
rm -f frontend/public/demos/demo1.svg frontend/public/demos/demo2.svg frontend/public/demos/demo3.svg frontend/public/demos/demo4.svg
```

- [ ] **Step 11: Commit**

```bash
git add frontend/src/app/page.tsx
git rm --ignore-unmatch frontend/public/demos/demo1.svg frontend/public/demos/demo2.svg frontend/public/demos/demo3.svg frontend/public/demos/demo4.svg
git commit -m "feat: integrate pixel characters, particles, and interactive demos into landing page"
```

---

## Final Verification

### Task 12: Full build verification

- [ ] **Step 1: Run production build**

```bash
cd c:/Users/nc157/Projects/minecraftModCreator/frontend && npx next build --no-lint
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Test all routes**

Manual checklist:
- `/` — landing page with characters, particles, demo cards
- `/create` — chat interface, send a message, see preview
- `/create?prompt=diamond+sword` — auto-submits prompt
- `/builder` — Java button shows "Coming Soon"
- `/gallery` — unchanged, still works
- Mobile responsive: all features degrade gracefully

- [ ] **Step 3: Final commit if any fixes needed**
