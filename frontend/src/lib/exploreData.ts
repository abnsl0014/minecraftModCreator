// Mock data and types for the Explore/Showcase feature
// Frontend-only: uses localStorage for submissions, mock data for display

export interface CraftingSlot {
  item: string;    // e.g. "redstone", "diamond", "stick", "chest"
  icon: string;    // emoji or short label
}

export interface ExploreMod {
  id: string;
  name: string;
  description: string;
  author: string;
  edition: "java" | "bedrock";
  category: "weapon" | "armor" | "food" | "block" | "tool" | "ability";
  thumbnail: string | null;       // image URL or null
  videoUrl: string | null;        // video URL or null
  screenshots: string[];          // additional images
  craftingRecipe: (CraftingSlot | null)[];  // 9 slots (3x3 grid), null = empty
  survivalGuide: string;          // how to get/craft in survival
  downloads: number;
  likes: number;
  status: "approved" | "pending" | "rejected";
  featured: boolean;              // marketplace pick
  createdAt: string;
  tags: string[];
  download_url?: string | null;   // Supabase storage URL for download
}

export interface ModSubmission {
  id: string;
  name: string;
  description: string;
  author: string;
  edition: "java" | "bedrock";
  category: ExploreMod["category"];
  thumbnail: string | null;
  videoUrl: string;
  screenshots: string[];
  craftingRecipe: (CraftingSlot | null)[];
  survivalGuide: string;
  tags: string[];
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

// Category colors matching existing design system
export const CATEGORY_CONFIG: Record<ExploreMod["category"], { label: string; color: string; icon: string }> = {
  weapon: { label: "Weapons", color: "#ff5555", icon: "⚔" },
  tool:   { label: "Tools",   color: "#ffaa00", icon: "⛏" },
  armor:  { label: "Armor",   color: "#5555ff", icon: "🛡" },
  food:   { label: "Food",    color: "#55ff55", icon: "🍖" },
  block:  { label: "Blocks",  color: "#aa55ff", icon: "■" },
  ability:{ label: "Abilities", color: "#d4a017", icon: "✦" },
};

// Crafting material icons
export const MATERIAL_ICONS: Record<string, string> = {
  redstone: "🔴",
  diamond: "💎",
  iron_ingot: "🪨",
  gold_ingot: "🟡",
  emerald: "💚",
  stick: "🪵",
  string: "🧵",
  chest: "📦",
  ender_pearl: "🟣",
  blaze_rod: "🔥",
  nether_star: "⭐",
  obsidian: "⬛",
  glass: "🔲",
  leather: "🟤",
  bone: "🦴",
  gunpowder: "💨",
  glowstone: "✨",
  netherite: "⬛",
  amethyst: "🔮",
  copper: "🟠",
  lapis: "🔵",
  coal: "⚫",
  apple: "🍎",
  bread: "🍞",
  empty: "",
};

// Community submissions (mock pending)
export const MOCK_PENDING_SUBMISSIONS: ModSubmission[] = [
  {
    id: "sub-1",
    name: "Rainbow Sword",
    description: "A sword that changes color with each hit and applies random potion effects.",
    author: "ColorFan99",
    edition: "bedrock",
    category: "weapon",
    thumbnail: null,
    videoUrl: "",
    screenshots: [],
    craftingRecipe: [
      null, { item: "diamond", icon: "💎" }, null,
      null, { item: "emerald", icon: "💚" }, null,
      null, { item: "stick", icon: "🪵" }, null,
    ],
    survivalGuide: "Mine diamonds and emeralds. Craft a stick from planks. Each hit applies a random effect!",
    tags: ["sword", "rainbow", "effects"],
    status: "pending",
    submittedAt: "2026-03-15T18:00:00Z",
  },
  {
    id: "sub-2",
    name: "Gravity Boots",
    description: "Boots that let you walk on walls and ceilings. Double-jump to toggle gravity direction.",
    author: "PhysicsNerd",
    edition: "bedrock",
    category: "armor",
    thumbnail: null,
    videoUrl: "",
    screenshots: [],
    craftingRecipe: [
      null, null, null,
      { item: "obsidian", icon: "⬛" }, null, { item: "obsidian", icon: "⬛" },
      { item: "ender_pearl", icon: "🟣" }, null, { item: "ender_pearl", icon: "🟣" },
    ],
    survivalGuide: "Get obsidian with diamond pickaxe. Farm ender pearls. Double jump to flip gravity!",
    tags: ["boots", "gravity", "movement"],
    status: "pending",
    submittedAt: "2026-03-16T10:00:00Z",
  },
];

// LocalStorage helpers for submissions
const SUBMISSIONS_KEY = "modcrafter_submissions";

export function getLocalSubmissions(): ModSubmission[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(SUBMISSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveSubmission(submission: ModSubmission): void {
  const existing = getLocalSubmissions();
  existing.push(submission);
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(existing));
}

export function updateSubmissionStatus(id: string, status: ModSubmission["status"]): void {
  const existing = getLocalSubmissions();
  const updated = existing.map(s => s.id === id ? { ...s, status } : s);
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(updated));
}

export function generateId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
