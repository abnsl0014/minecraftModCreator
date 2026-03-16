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
    text: "I'll create a Thunder Blade for you! Here's what I'm building \u2014 a powerful sword infused with lightning energy.",
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
