"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateMod } from "@/lib/api";
import WeaponBuilder, { WeaponEntry } from "./builder/WeaponBuilder";
import ToolBuilder, { ToolEntry } from "./builder/ToolBuilder";
import ArmorBuilder, { ArmorEntry } from "./builder/ArmorBuilder";
import FoodBuilder, { FoodEntry } from "./builder/FoodBuilder";
import BlockBuilder, { BlockEntry } from "./builder/BlockBuilder";

type CreationMode = "quick" | "builder";
type BuilderTab = "weapons" | "tools" | "armor" | "food" | "blocks";

export default function ModForm() {
  const router = useRouter();
  const [mode, setMode] = useState<CreationMode>("quick");
  const [description, setDescription] = useState("");
  const [modName, setModName] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [edition, setEdition] = useState<"java" | "bedrock">("bedrock");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Builder state
  const [activeTab, setActiveTab] = useState<BuilderTab>("weapons");
  const [weapons, setWeapons] = useState<WeaponEntry[]>([]);
  const [tools, setTools] = useState<ToolEntry[]>([]);
  const [armor, setArmor] = useState<ArmorEntry[]>([]);
  const [food, setFood] = useState<FoodEntry[]>([]);
  const [blocks, setBlocks] = useState<BlockEntry[]>([]);

  const buildDescriptionFromEntries = (): string => {
    const parts: string[] = [];
    if (modName) parts.push(`Create a Minecraft mod called "${modName}".`);

    for (const w of weapons) {
      let desc = `Add a ${w.material} ${w.weaponType} weapon called "${w.name}" with ${w.damage} damage, ${w.attackSpeed} attack speed, ${w.durability} durability`;
      if (w.onHitEffects.length > 0) desc += `. On-hit effects: ${w.onHitEffects.join(", ")}`;
      if (w.specialAbility) desc += `. Special ability (right-click): ${w.specialAbility}`;
      if (w.cooldown > 0) desc += ` with ${w.cooldown}s cooldown`;
      if (w.description) desc += `. ${w.description}`;
      if (w.recipe.some(r => r !== "")) desc += `. Has a crafting recipe using: ${w.recipe.filter(r => r).join(", ")}`;
      parts.push(desc + ".");
    }

    for (const t of tools) {
      let desc = `Add a ${t.material} ${t.toolType} tool called "${t.name}" with mining speed ${t.miningSpeed}, ${t.damage} damage, ${t.durability} durability`;
      if (t.description) desc += `. ${t.description}`;
      if (t.recipe.some(r => r !== "")) desc += `. Has a crafting recipe using: ${t.recipe.filter(r => r).join(", ")}`;
      parts.push(desc + ".");
    }

    for (const a of armor) {
      let desc = `Add a ${a.material} ${a.slot} armor piece called "${a.name}" with ${a.defense} defense, ${a.toughness} toughness, ${a.durability} durability`;
      if (a.knockbackResistance > 0) desc += `, ${a.knockbackResistance} knockback resistance`;
      if (a.effects.length > 0) desc += `. Passive effects while worn: ${a.effects.join(", ")}`;
      if (a.description) desc += `. ${a.description}`;
      if (a.recipe.some(r => r !== "")) desc += `. Has a crafting recipe using: ${a.recipe.filter(r => r).join(", ")}`;
      parts.push(desc + ".");
    }

    for (const f of food) {
      let desc = `Add a ${f.material} food item called "${f.name}" that restores ${f.nutrition} hunger with ${f.saturation} saturation`;
      if (f.effects.length > 0) desc += `. Effects when eaten: ${f.effects.join(", ")}`;
      if (f.alwaysEdible) desc += `. Can be eaten even when full`;
      if (f.fastEat) desc += `. Fast eating speed`;
      if (f.stackSize !== 64) desc += `. Stack size: ${f.stackSize}`;
      if (f.description) desc += `. ${f.description}`;
      if (f.recipe.some(r => r !== "")) desc += `. Has a crafting recipe using: ${f.recipe.filter(r => r).join(", ")}`;
      parts.push(desc + ".");
    }

    for (const b of blocks) {
      let desc = `Add a ${b.material} block called "${b.name}" with ${b.hardness} hardness`;
      if (b.luminance > 0) desc += `, light level ${b.luminance}`;
      if (b.description) desc += `. ${b.description}`;
      parts.push(desc + ".");
    }

    return parts.join("\n");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDescription = mode === "quick" ? description : buildDescriptionFromEntries();
    if (!finalDescription.trim()) {
      setError(mode === "quick" ? "Please describe your mod" : "Please add at least one item or block");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { job_id } = await generateMod(finalDescription, modName, authorName, edition);
      router.push(`/status/${job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const totalEntries = weapons.length + tools.length + armor.length + food.length + blocks.length;
  const accentColor = edition === "bedrock" ? "blue" : "green";

  const TABS: { key: BuilderTab; label: string; icon: string; count: number }[] = [
    { key: "weapons", label: "Weapons", icon: "M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z", count: weapons.length },
    { key: "tools", label: "Tools", icon: "M11.42 15.17l-5.384-5.383a1.5 1.5 0 010-2.121l.707-.707a1.5 1.5 0 012.121 0L14.246 12.34l5.384-5.383a1.5 1.5 0 012.121 0l.707.707a1.5 1.5 0 010 2.121L17.075 15.17", count: tools.length },
    { key: "armor", label: "Armor", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", count: armor.length },
    { key: "food", label: "Food", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", count: food.length },
    { key: "blocks", label: "Blocks", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", count: blocks.length },
  ];

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl space-y-6">
      {/* Edition selector */}
      <div className="flex justify-center gap-2">
        <button type="button" onClick={() => setEdition("java")}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${edition === "java" ? "bg-green-600 text-white shadow-lg shadow-green-600/25" : "bg-gray-800/50 text-gray-400 hover:text-white border border-gray-700"}`}>
          Java Edition<span className="block text-xs opacity-70">.jar (Desktop)</span>
        </button>
        <button type="button" onClick={() => setEdition("bedrock")}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${edition === "bedrock" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : "bg-gray-800/50 text-gray-400 hover:text-white border border-gray-700"}`}>
          Bedrock Edition<span className="block text-xs opacity-70">.mcaddon (Mobile)</span>
        </button>
      </div>

      {/* Mode toggle */}
      <div className="flex justify-center">
        <div className="inline-flex bg-gray-800/60 rounded-lg p-1 border border-gray-700/50">
          <button type="button" onClick={() => setMode("quick")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === "quick" ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Quick Create
            </span>
          </button>
          <button type="button" onClick={() => setMode("builder")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === "builder" ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              Builder
            </span>
          </button>
        </div>
      </div>

      {mode === "quick" ? (
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">Describe your mod</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder={edition === "java"
              ? "Example: Create a mod with a fire sword that does 12 damage and sets enemies ablaze, diamond armor with speed boost, and a healing apple..."
              : "Example: Create an add-on with a lightning staff, emerald armor set with jump boost, and golden bread that gives regeneration..."
            }
            rows={6} className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            required={mode === "quick"} />
          <p className="mt-1.5 text-xs text-gray-500">Supports: weapons, tools, armor, food, and blocks</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Category tabs */}
          <div className="flex overflow-x-auto border-b border-gray-700/50 scrollbar-hide">
            {TABS.map((tab) => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.key ? "text-white" : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
                style={activeTab === tab.key ? { borderBottomColor: edition === "bedrock" ? "#3b82f6" : "#22c55e" } : {}}>
                <svg className="w-4 h-4 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${edition === "bedrock" ? "bg-blue-600/30 text-blue-300" : "bg-green-600/30 text-green-300"}`}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="min-h-[300px]">
            {activeTab === "weapons" && <WeaponBuilder items={weapons} setItems={setWeapons} accentColor={accentColor} />}
            {activeTab === "tools" && <ToolBuilder items={tools} setItems={setTools} accentColor={accentColor} />}
            {activeTab === "armor" && <ArmorBuilder items={armor} setItems={setArmor} accentColor={accentColor} />}
            {activeTab === "food" && <FoodBuilder items={food} setItems={setFood} accentColor={accentColor} />}
            {activeTab === "blocks" && <BlockBuilder blocks={blocks} setBlocks={setBlocks} accentColor={accentColor} />}
          </div>
        </div>
      )}

      {/* Mod name & author */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="modName" className="block text-sm font-medium text-gray-300 mb-2">Mod Name <span className="text-gray-500">(optional)</span></label>
          <input id="modName" type="text" value={modName} onChange={(e) => setModName(e.target.value)} placeholder="e.g. Fire & Ice"
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
        </div>
        <div>
          <label htmlFor="authorName" className="block text-sm font-medium text-gray-300 mb-2">Author Name <span className="text-gray-500">(optional)</span></label>
          <input id="authorName" type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="e.g. YourName"
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
        </div>
      </div>

      {error && <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}

      <button type="submit" disabled={loading || (mode === "quick" ? !description.trim() : totalEntries === 0)}
        className={`w-full py-3.5 px-6 font-semibold rounded-lg transition-colors duration-200 text-white ${
          edition === "bedrock" ? "bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700" : "bg-green-600 hover:bg-green-500 disabled:bg-gray-700"
        } disabled:cursor-not-allowed`}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            {mode === "builder"
              ? `Generate ${edition === "bedrock" ? "Add-On" : "Mod"} (${totalEntries} ${totalEntries === 1 ? "entry" : "entries"})`
              : edition === "bedrock" ? "Generate Add-On" : "Generate Mod"}
          </span>
        )}
      </button>
    </form>
  );
}
