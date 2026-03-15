"use client";

import { useState } from "react";
import RecipeGrid from "./RecipeGrid";
import MaterialSelect, { TexturePreview } from "./MaterialSelect";
import TextureUpload from "./TextureUpload";

export interface ToolEntry {
  name: string;
  toolType: string;
  damage: number;
  miningSpeed: number;
  durability: number;
  material: string;
  style: string;
  customTexture: string | null;
  description: string;
  recipe: string[];
}

const EMPTY: ToolEntry = {
  name: "",
  toolType: "pickaxe",
  damage: 2,
  miningSpeed: 6,
  durability: 500,
  customTexture: null,
  material: "iron",
  style: "classic",
  description: "",
  recipe: Array(9).fill(""),
};

const TOOL_TYPES = [
  { value: "pickaxe", label: "Pickaxe", defaultDmg: 2 },
  { value: "axe", label: "Axe", defaultDmg: 5 },
  { value: "shovel", label: "Shovel", defaultDmg: 1 },
  { value: "hoe", label: "Hoe", defaultDmg: 1 },
];

interface Props {
  items: ToolEntry[];
  setItems: (items: ToolEntry[]) => void;
  accentColor: string;
}

export default function ToolBuilder({ items, setItems, accentColor }: Props) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<ToolEntry>({ ...EMPTY });
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

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-800/40 border border-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                {item.customTexture ? <img src={item.customTexture} alt="custom" className="rounded border border-green-500" style={{width:36,height:36,imageRendering:"pixelated"}} /> : <TexturePreview itemType="tool" subType={item.toolType} material={item.material} style={item.style} size={36} />}
                <div>
                  <p className="text-sm font-medium text-white">{item.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{item.toolType} &middot; Speed {item.miningSpeed} &middot; {item.durability} durability</p>
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
        <h3 className="text-sm font-medium text-gray-300">{editIndex !== null ? "Edit Tool" : "Add New Tool"}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tool Name *</label>
            <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Emerald Pickaxe" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tool Type</label>
            <select value={draft.toolType} onChange={(e) => setDraft({ ...draft, toolType: e.target.value })}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500">
              {TOOL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Mining Speed</label>
            <input type="number" value={draft.miningSpeed} onChange={(e) => setDraft({ ...draft, miningSpeed: Number(e.target.value) })}
              min="1" max="20" step="0.5" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500" />
            <span className="text-[10px] text-gray-500 mt-0.5 block">Iron=6, Diamond=8</span>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Attack Damage</label>
            <input type="number" value={draft.damage} onChange={(e) => setDraft({ ...draft, damage: Number(e.target.value) })}
              min="0" max="20" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Durability</label>
            <input type="number" value={draft.durability} onChange={(e) => setDraft({ ...draft, durability: Number(e.target.value) })}
              min="1" max="10000" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500" />
            <span className="text-[10px] text-gray-500 mt-0.5 block">Iron=250, Diamond=1560</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Material</label>
            <MaterialSelect value={draft.material} onChange={(m) => setDraft({ ...draft, material: m })} itemType="tool" subType={draft.toolType} style={draft.style} onStyleChange={(s) => setDraft({...draft, style: s})} />
          </div>
          <TextureUpload value={draft.customTexture} onChange={(t) => setDraft({...draft, customTexture: t})} currentPreview={null} />
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
            <input type="text" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="e.g. Mines faster in caves" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
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
            {editIndex !== null ? "Update Tool" : "Add Tool"}
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
