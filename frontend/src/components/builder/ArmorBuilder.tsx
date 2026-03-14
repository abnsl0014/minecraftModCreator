"use client";

import { useState } from "react";
import RecipeGrid from "./RecipeGrid";
import MaterialSelect, { TexturePreview } from "./MaterialSelect";

export interface ArmorEntry {
  name: string;
  slot: string;
  defense: number;
  toughness: number;
  durability: number;
  knockbackResistance: number;
  effects: string[];
  material: string;
  description: string;
  recipe: string[];
}

const EMPTY: ArmorEntry = {
  name: "",
  slot: "chestplate",
  defense: 8,
  toughness: 2,
  durability: 500,
  knockbackResistance: 0,
  effects: [],
  material: "diamond",
  description: "",
  recipe: Array(9).fill(""),
};

const ARMOR_SLOTS = [
  { value: "helmet", label: "Helmet", defRef: "3" },
  { value: "chestplate", label: "Chestplate", defRef: "8" },
  { value: "leggings", label: "Leggings", defRef: "6" },
  { value: "boots", label: "Boots", defRef: "3" },
];

const ARMOR_EFFECTS = [
  { id: "speed", label: "Speed" },
  { id: "jump_boost", label: "Jump Boost" },
  { id: "regeneration", label: "Regeneration" },
  { id: "strength", label: "Strength" },
  { id: "night_vision", label: "Night Vision" },
  { id: "water_breathing", label: "Water Breathing" },
  { id: "fire_resistance", label: "Fire Resistance" },
  { id: "fall_protection", label: "Fall Protection" },
  { id: "haste", label: "Haste" },
];

interface Props {
  items: ArmorEntry[];
  setItems: (items: ArmorEntry[]) => void;
  accentColor: string;
}

export default function ArmorBuilder({ items, setItems, accentColor }: Props) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<ArmorEntry>({ ...EMPTY });
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
                <TexturePreview itemType="armor" subType={item.slot} material={item.material} size={36} />
                <div>
                  <p className="text-sm font-medium text-white">{item.name}</p>
                  <p className="text-xs text-gray-400 capitalize">
                    {item.slot} &middot; {item.defense} DEF &middot; {item.durability} durability
                    {item.effects.length > 0 && ` &middot; ${item.effects.join(", ")}`}
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
        <h3 className="text-sm font-medium text-gray-300">{editIndex !== null ? "Edit Armor" : "Add New Armor Piece"}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Armor Name *</label>
            <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Dragon Scale Chestplate" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Armor Slot</label>
            <select value={draft.slot} onChange={(e) => setDraft({ ...draft, slot: e.target.value })}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500">
              {ARMOR_SLOTS.map(s => <option key={s.value} value={s.value}>{s.label} (ref: {s.defRef} def)</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Defense</label>
            <input type="number" value={draft.defense} onChange={(e) => setDraft({ ...draft, defense: Number(e.target.value) })}
              min="1" max="30" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Toughness</label>
            <input type="number" value={draft.toughness} onChange={(e) => setDraft({ ...draft, toughness: Number(e.target.value) })}
              min="0" max="20" step="0.5" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Durability</label>
            <input type="number" value={draft.durability} onChange={(e) => setDraft({ ...draft, durability: Number(e.target.value) })}
              min="1" max="10000" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">KB Resist</label>
            <input type="number" value={draft.knockbackResistance} onChange={(e) => setDraft({ ...draft, knockbackResistance: Number(e.target.value) })}
              min="0" max="1" step="0.1" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500" />
          </div>
        </div>

        {/* Armor effects */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Passive Effects (while worn)</label>
          <div className="flex flex-wrap gap-1.5">
            {ARMOR_EFFECTS.map(eff => (
              <button key={eff.id} type="button" onClick={() => toggleEffect(eff.id)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                  draft.effects.includes(eff.id)
                    ? "bg-blue-900/40 border-blue-600 text-blue-300"
                    : "bg-gray-800/40 border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
                }`}>
                {eff.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Material</label>
            <MaterialSelect value={draft.material} onChange={(m) => setDraft({ ...draft, material: m })} itemType="armor" subType={draft.slot} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
            <input type="text" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="e.g. Grants fire immunity" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
          </div>
        </div>

        <button type="button" onClick={() => setShowRecipe(!showRecipe)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <svg className={`w-3.5 h-3.5 transition-transform ${showRecipe ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          Crafting Recipe (optional)
        </button>
        {showRecipe && <div className="mt-2"><RecipeGrid recipe={draft.recipe} onChange={(r) => setDraft({ ...draft, recipe: r })} /></div>}

        <div className="flex gap-2">
          <button type="button" onClick={save} disabled={!draft.name.trim()}
            className={`px-4 py-2 text-sm font-medium rounded-md text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${accentColor === "blue" ? "bg-blue-600 hover:bg-blue-500" : "bg-green-600 hover:bg-green-500"}`}>
            {editIndex !== null ? "Update Armor" : "Add Armor"}
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
