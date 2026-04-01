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

