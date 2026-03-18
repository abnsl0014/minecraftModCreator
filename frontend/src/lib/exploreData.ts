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

// Mock data — featured/official mods
export const MOCK_EXPLORE_MODS: ExploreMod[] = [
  {
    id: "thunder-blade",
    name: "Thunder Blade",
    description: "Lightning swords with chain damage and electrical effects. Strike enemies and watch the lightning arc between nearby mobs.",
    author: "ModCrafter",
    edition: "bedrock",
    category: "weapon",
    thumbnail: null,
    videoUrl: null,
    screenshots: [],
    craftingRecipe: [
      null, { item: "diamond", icon: "💎" }, null,
      null, { item: "diamond", icon: "💎" }, null,
      null, { item: "blaze_rod", icon: "🔥" }, null,
    ],
    survivalGuide: "Find diamonds at Y-level -59 to 16. Defeat Blazes in the Nether for Blaze Rods. Combine on a crafting table.",
    downloads: 1240,
    likes: 89,
    status: "approved",
    featured: true,
    createdAt: "2026-03-10T12:00:00Z",
    tags: ["sword", "lightning", "combat", "chain-damage"],
  },
  {
    id: "crystal-armor",
    name: "Crystal Armor Set",
    description: "Full crystal armor with glow effects and set bonuses. Wearing the complete set grants night vision and slow falling.",
    author: "ModCrafter",
    edition: "bedrock",
    category: "armor",
    thumbnail: null,
    videoUrl: null,
    screenshots: [],
    craftingRecipe: [
      { item: "amethyst", icon: "🔮" }, { item: "amethyst", icon: "🔮" }, { item: "amethyst", icon: "🔮" },
      { item: "amethyst", icon: "🔮" }, { item: "nether_star", icon: "⭐" }, { item: "amethyst", icon: "🔮" },
      { item: "amethyst", icon: "🔮" }, { item: "amethyst", icon: "🔮" }, { item: "amethyst", icon: "🔮" },
    ],
    survivalGuide: "Mine Amethyst from geodes underground. Defeat the Wither for a Nether Star. Craft each piece separately.",
    downloads: 980,
    likes: 72,
    status: "approved",
    featured: true,
    createdAt: "2026-03-08T10:00:00Z",
    tags: ["armor", "crystal", "glow", "set-bonus"],
  },
  {
    id: "mystic-foods",
    name: "Mystic Foods",
    description: "Enchanted foods with powerful potion effects. Golden Apple variants that grant fire resistance, strength, and regeneration.",
    author: "ChefSteve",
    edition: "bedrock",
    category: "food",
    thumbnail: null,
    videoUrl: null,
    screenshots: [],
    craftingRecipe: [
      { item: "gold_ingot", icon: "🟡" }, { item: "gold_ingot", icon: "🟡" }, { item: "gold_ingot", icon: "🟡" },
      { item: "gold_ingot", icon: "🟡" }, { item: "apple", icon: "🍎" }, { item: "gold_ingot", icon: "🟡" },
      { item: "gold_ingot", icon: "🟡" }, { item: "gold_ingot", icon: "🟡" }, { item: "gold_ingot", icon: "🟡" },
    ],
    survivalGuide: "Gather Gold Ore from the Nether or Overworld. Smelt into ingots. Find apples from oak tree leaves.",
    downloads: 750,
    likes: 55,
    status: "approved",
    featured: true,
    createdAt: "2026-03-06T08:00:00Z",
    tags: ["food", "potion", "enchanted", "golden"],
  },
  {
    id: "neon-blocks",
    name: "Neon Blocks",
    description: "Glowing neon building blocks in multiple colors. Perfect for futuristic builds with customizable light levels.",
    author: "BuilderPro",
    edition: "bedrock",
    category: "block",
    thumbnail: null,
    videoUrl: null,
    screenshots: [],
    craftingRecipe: [
      { item: "glass", icon: "🔲" }, { item: "glowstone", icon: "✨" }, { item: "glass", icon: "🔲" },
      { item: "glowstone", icon: "✨" }, { item: "redstone", icon: "🔴" }, { item: "glowstone", icon: "✨" },
      { item: "glass", icon: "🔲" }, { item: "glowstone", icon: "✨" }, { item: "glass", icon: "🔲" },
    ],
    survivalGuide: "Smelt sand into Glass. Mine Glowstone in the Nether. Get Redstone deep underground. Makes 8 neon blocks.",
    downloads: 620,
    likes: 41,
    status: "approved",
    featured: true,
    createdAt: "2026-03-04T14:00:00Z",
    tags: ["blocks", "neon", "glow", "decoration"],
  },
  {
    id: "void-pickaxe",
    name: "Void Pickaxe",
    description: "Obsidian pickaxe that mines 3x3 area and auto-smelts ores. Unbreakable but requires rare materials.",
    author: "MinerX",
    edition: "bedrock",
    category: "tool",
    thumbnail: null,
    videoUrl: null,
    screenshots: [],
    craftingRecipe: [
      { item: "obsidian", icon: "⬛" }, { item: "nether_star", icon: "⭐" }, { item: "obsidian", icon: "⬛" },
      null, { item: "blaze_rod", icon: "🔥" }, null,
      null, { item: "blaze_rod", icon: "🔥" }, null,
    ],
    survivalGuide: "Get Obsidian with a diamond pickaxe + water on lava. Defeat the Wither for the Nether Star. Blaze Rods from Nether.",
    downloads: 890,
    likes: 63,
    status: "approved",
    featured: false,
    createdAt: "2026-03-02T16:00:00Z",
    tags: ["pickaxe", "3x3", "auto-smelt", "void"],
  },
  {
    id: "dragon-bow",
    name: "Dragon's Breath Bow",
    description: "A bow that shoots explosive dragon breath arrows. Each arrow creates a lingering AOE damage cloud on impact.",
    author: "ArcherQueen",
    edition: "bedrock",
    category: "weapon",
    thumbnail: null,
    videoUrl: null,
    screenshots: [],
    craftingRecipe: [
      null, { item: "ender_pearl", icon: "🟣" }, { item: "string", icon: "🧵" },
      { item: "blaze_rod", icon: "🔥" }, null, { item: "string", icon: "🧵" },
      null, { item: "ender_pearl", icon: "🟣" }, { item: "string", icon: "🧵" },
    ],
    survivalGuide: "Kill Endermen for Ender Pearls. Get String from Spiders. Blaze Rods from Nether Fortress. Combine to craft.",
    downloads: 560,
    likes: 38,
    status: "approved",
    featured: false,
    createdAt: "2026-02-28T20:00:00Z",
    tags: ["bow", "dragon", "explosive", "aoe"],
  },
  {
    id: "healing-bread",
    name: "Healing Bread",
    description: "Bread that instantly heals 5 hearts and removes all negative effects. Simple to craft but requires golden wheat.",
    author: "FarmLord",
    edition: "bedrock",
    category: "food",
    thumbnail: null,
    videoUrl: null,
    screenshots: [],
    craftingRecipe: [
      null, null, null,
      { item: "gold_ingot", icon: "🟡" }, { item: "bread", icon: "🍞" }, { item: "gold_ingot", icon: "🟡" },
      null, { item: "emerald", icon: "💚" }, null,
    ],
    survivalGuide: "Grow wheat, craft bread. Trade with villagers for emeralds. Mine gold in mesa biomes or underground.",
    downloads: 430,
    likes: 29,
    status: "approved",
    featured: false,
    createdAt: "2026-02-26T11:00:00Z",
    tags: ["food", "healing", "bread", "golden"],
  },
  {
    id: "teleport-staff",
    name: "Teleport Staff",
    description: "Right-click to teleport where you're looking. Has 16 charges, rechargeable by holding Ender Pearls.",
    author: "WizardZ",
    edition: "bedrock",
    category: "ability",
    thumbnail: null,
    videoUrl: null,
    screenshots: [],
    craftingRecipe: [
      null, null, { item: "ender_pearl", icon: "🟣" },
      null, { item: "blaze_rod", icon: "🔥" }, null,
      { item: "blaze_rod", icon: "🔥" }, null, null,
    ],
    survivalGuide: "Farm Ender Pearls from Endermen at night. Get Blaze Rods from Nether Fortress. Staff has 16 uses before recharge.",
    downloads: 1100,
    likes: 95,
    status: "approved",
    featured: true,
    createdAt: "2026-03-12T09:00:00Z",
    tags: ["staff", "teleport", "ability", "ender"],
  },
];

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
