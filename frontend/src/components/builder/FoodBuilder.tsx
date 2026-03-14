"use client";

import { useState } from "react";
import RecipeGrid from "./RecipeGrid";
import MaterialSelect, { TexturePreview } from "./MaterialSelect";

export interface FoodEntry {
  name: string;
  nutrition: number;
  saturation: string;
  effects: string[];
  alwaysEdible: boolean;
  fastEat: boolean;
  stackSize: number;
  material: string;
  description: string;
  recipe: string[];
}

const EMPTY: FoodEntry = {
  name: "",
  nutrition: 4,
  saturation: "normal",
  effects: [],
  alwaysEdible: false,
  fastEat: false,
  stackSize: 64,
  material: "golden",
  description: "",
  recipe: Array(9).fill(""),
};

const FOOD_EFFECTS = [
  { id: "regeneration", label: "Regeneration" },
  { id: "absorption", label: "Absorption" },
  { id: "instant_health", label: "Instant Health" },
  { id: "speed", label: "Speed" },
  { id: "jump_boost", label: "Jump Boost" },
  { id: "strength", label: "Strength" },
  { id: "resistance", label: "Resistance" },
  { id: "fire_resistance", label: "Fire Resistance" },
  { id: "water_breathing", label: "Water Breathing" },
  { id: "night_vision", label: "Night Vision" },
];

const SATURATION_LEVELS = ["low", "normal", "high", "supernatural"];

interface Props {
  items: FoodEntry[];
  setItems: (items: FoodEntry[]) => void;
  accentColor: string;
}

export default function FoodBuilder({ items, setItems, accentColor }: Props) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<FoodEntry>({ ...EMPTY });
  const [showRecipe, setShowRecipe] = useState(false);

  const save = () => {
    if (!draft.name.trim()) return;
    if (editIndex !== null) {
      const updated = [...items];
      updated[editIndex] = { ...draft };
      setItems(updated);
      setEditIndex(null);
    } else {
      setItems([...items, { ...draft }]);
    }
    setDraft({ ...EMPTY });
    setShowRecipe(false);
  };

  const edit = (i: number) => { setDraft({ ...items[i] }); setEditIndex(i); setShowRecipe(items[i].recipe.some(r => r !== "")); };
  const remove = (i: number) => { setItems(items.filter((_, idx) => idx !== i)); if (editIndex === i) { setEditIndex(null); setDraft({ ...EMPTY }); } };

  const toggleEffect = (effect: string) => {
    const effects = draft.effects.includes(effect)
      ? draft.effects.filter(e => e !== effect)
      : [...draft.effects, effect];
    setDraft({ ...draft, effects });
  };

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-800/40 border border-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <TexturePreview itemType="food" subType="" material={item.material} size={36} />
                <div>
                  <p className="text-sm font-medium text-white">{item.name}</p>
                  <p className="text-xs text-gray-400">
                    {item.nutrition} hunger &middot; {item.saturation} sat
                    {item.effects.length > 0 && ` &middot; ${item.effects.join(", ")}`}
                    {item.alwaysEdible && " &middot; always edible"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => edit(i)} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700/50">Edit</button>
                <button type="button" onClick={() => remove(i)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg space-y-4">
        <h3 className="text-sm font-medium text-gray-300">{editIndex !== null ? "Edit Food" : "Add New Food"}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Food Name *</label>
            <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Golden Pie" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Material</label>
            <MaterialSelect value={draft.material} onChange={(m) => setDraft({ ...draft, material: m })} itemType="food" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Hunger Restored</label>
            <input type="number" value={draft.nutrition} onChange={(e) => setDraft({ ...draft, nutrition: Number(e.target.value) })}
              min="1" max="20" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500" />
            <span className="text-[10px] text-gray-500 mt-0.5 block">Apple=4, Steak=8</span>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Saturation</label>
            <select value={draft.saturation} onChange={(e) => setDraft({ ...draft, saturation: e.target.value })}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500">
              {SATURATION_LEVELS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Stack Size</label>
            <select value={draft.stackSize} onChange={(e) => setDraft({ ...draft, stackSize: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500">
              <option value={64}>64</option>
              <option value={16}>16</option>
              <option value={1}>1</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 pt-5">
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={draft.alwaysEdible} onChange={(e) => setDraft({ ...draft, alwaysEdible: e.target.checked })}
                className="rounded border-gray-600 bg-gray-900/50 text-green-500 focus:ring-green-500" />
              Always edible
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={draft.fastEat} onChange={(e) => setDraft({ ...draft, fastEat: e.target.checked })}
                className="rounded border-gray-600 bg-gray-900/50 text-green-500 focus:ring-green-500" />
              Fast eating
            </label>
          </div>
        </div>

        {/* Potion effects */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Effects When Eaten</label>
          <div className="flex flex-wrap gap-1.5">
            {FOOD_EFFECTS.map(eff => (
              <button key={eff.id} type="button" onClick={() => toggleEffect(eff.id)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                  draft.effects.includes(eff.id)
                    ? "bg-green-900/40 border-green-600 text-green-300"
                    : "bg-gray-800/40 border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
                }`}>
                {eff.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
          <input type="text" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="e.g. A divine pie that grants regeneration" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
        </div>

        <button type="button" onClick={() => setShowRecipe(!showRecipe)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <svg className={`w-3.5 h-3.5 transition-transform ${showRecipe ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          Crafting Recipe (optional)
        </button>
        {showRecipe && <div className="mt-2"><RecipeGrid recipe={draft.recipe} onChange={(r) => setDraft({ ...draft, recipe: r })} /></div>}

        <div className="flex gap-2">
          <button type="button" onClick={save} disabled={!draft.name.trim()}
            className={`px-4 py-2 text-sm font-medium rounded-md text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${accentColor === "blue" ? "bg-blue-600 hover:bg-blue-500" : "bg-green-600 hover:bg-green-500"}`}>
            {editIndex !== null ? "Update Food" : "Add Food"}
          </button>
          {editIndex !== null && (
            <button type="button" onClick={() => { setEditIndex(null); setDraft({ ...EMPTY }); setShowRecipe(false); }}
              className="px-4 py-2 text-sm font-medium rounded-md text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700">Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}
