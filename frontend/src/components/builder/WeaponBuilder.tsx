"use client";

import { useState } from "react";
import RecipeGrid from "./RecipeGrid";
import MaterialSelect, { TexturePreview } from "./MaterialSelect";
import TextureUpload from "./TextureUpload";

export interface WeaponEntry {
  name: string;
  weaponType: string;
  damage: number;
  attackSpeed: string;
  durability: number;
  onHitEffects: string[];
  specialAbility: string;
  cooldown: number;
  material: string;
  style: string;
  customTexture: string | null;
  description: string;
  recipe: string[];
}

const EMPTY: WeaponEntry = {
  name: "",
  weaponType: "sword",
  damage: 7,
  attackSpeed: "normal",
  durability: 500,
  onHitEffects: [],
  cooldown: 0,
  specialAbility: "",
  customTexture: null,
  material: "diamond",
  style: "classic",
  description: "",
  recipe: Array(9).fill(""),
};

const WEAPON_TYPES = ["sword", "katana", "hammer", "axe", "spear", "staff", "gauntlet", "whip", "shield", "bow", "crossbow", "gun", "rpg", "throwable", "nuke"];
const ATTACK_SPEEDS = ["fast", "normal", "slow"];
const HIT_EFFECTS = [
  { id: "lightning", label: "Lightning" },
  { id: "fire", label: "Fire" },
  { id: "freeze", label: "Freeze" },
  { id: "explosion", label: "Explosion" },
  { id: "poison", label: "Poison" },
  { id: "wither", label: "Wither" },
  { id: "blindness", label: "Blindness" },
  { id: "levitation", label: "Levitation" },
  { id: "knockback", label: "Knockback" },
  { id: "slowness", label: "Slowness" },
  { id: "lifesteal", label: "Lifesteal" },
  { id: "teleport", label: "Teleport" },
];

interface Props {
  items: WeaponEntry[];
  setItems: (items: WeaponEntry[]) => void;
  accentColor: string;
}

export default function WeaponBuilder({ items, setItems, accentColor }: Props) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<WeaponEntry>({ ...EMPTY });
  const [showRecipe, setShowRecipe] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    setShowAdvanced(false);
  };

  const edit = (i: number) => {
    setDraft({ ...items[i] });
    setEditIndex(i);
    setShowAdvanced(!!items[i].specialAbility || items[i].cooldown > 0);
    setShowRecipe(items[i].recipe.some(r => r !== ""));
  };

  const remove = (i: number) => {
    setItems(items.filter((_, idx) => idx !== i));
    if (editIndex === i) { setEditIndex(null); setDraft({ ...EMPTY }); }
  };

  const toggleEffect = (effect: string) => {
    const effects = draft.onHitEffects.includes(effect)
      ? draft.onHitEffects.filter(e => e !== effect)
      : [...draft.onHitEffects, effect];
    setDraft({ ...draft, onHitEffects: effects });
  };

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-800/40 border border-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                {item.customTexture ? <img src={item.customTexture} alt="custom" className="rounded border border-green-500" style={{width:36,height:36,imageRendering:"pixelated"}} /> : <TexturePreview itemType="weapon" subType={item.weaponType} material={item.material} style={item.style} size={36} />}
                <div>
                  <p className="text-sm font-medium text-white">{item.name}</p>
                  <p className="text-xs text-gray-400 capitalize">
                    {item.weaponType} &middot; {item.damage} DMG &middot; {item.attackSpeed} speed
                    {item.onHitEffects.length > 0 && ` &middot; ${item.onHitEffects.join(", ")}`}
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
        <h3 className="text-sm font-medium text-gray-300">{editIndex !== null ? "Edit Weapon" : "Add New Weapon"}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Weapon Name *</label>
            <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Flame Sword" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Weapon Type</label>
            <select value={draft.weaponType} onChange={(e) => setDraft({ ...draft, weaponType: e.target.value })}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500">
              {WEAPON_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Damage</label>
            <input type="number" value={draft.damage} onChange={(e) => setDraft({ ...draft, damage: Number(e.target.value) })}
              min="1" max="50" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500" />
            <span className="text-[10px] text-gray-500 mt-0.5 block">Iron=6, Diamond=7</span>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Attack Speed</label>
            <select value={draft.attackSpeed} onChange={(e) => setDraft({ ...draft, attackSpeed: e.target.value })}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500">
              {ATTACK_SPEEDS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Durability</label>
            <input type="number" value={draft.durability} onChange={(e) => setDraft({ ...draft, durability: Number(e.target.value) })}
              min="1" max="10000" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500" />
            <span className="text-[10px] text-gray-500 mt-0.5 block">Iron=250, Diamond=1560</span>
          </div>
        </div>

        {/* On-hit effects */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">On-Hit Effects</label>
          <div className="flex flex-wrap gap-1.5">
            {HIT_EFFECTS.map(eff => (
              <button key={eff.id} type="button" onClick={() => toggleEffect(eff.id)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                  draft.onHitEffects.includes(eff.id)
                    ? "bg-red-900/40 border-red-600 text-red-300"
                    : "bg-gray-800/40 border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
                }`}>
                {eff.label}
              </button>
            ))}
          </div>
        </div>

        {/* Material */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Material</label>
            <MaterialSelect value={draft.material} onChange={(m) => setDraft({ ...draft, material: m })} itemType="weapon" subType={draft.weaponType} style={draft.style} onStyleChange={(s) => setDraft({...draft, style: s})} />
          </div>
          <TextureUpload value={draft.customTexture} onChange={(t) => setDraft({...draft, customTexture: t})} currentPreview={null} />
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
            <input type="text" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="e.g. Burns enemies on hit" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
          </div>
        </div>

        {/* Advanced options toggle */}
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <svg className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Advanced Options
        </button>
        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4 border-l-2 border-gray-700/50">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Special Ability (right-click)</label>
              <input type="text" value={draft.specialAbility} onChange={(e) => setDraft({ ...draft, specialAbility: e.target.value })}
                placeholder="e.g. Shoots a fireball" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cooldown (seconds)</label>
              <input type="number" value={draft.cooldown} onChange={(e) => setDraft({ ...draft, cooldown: Number(e.target.value) })}
                min="0" max="60" step="0.5" className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500" />
            </div>
          </div>
        )}

        {/* Recipe */}
        <button type="button" onClick={() => setShowRecipe(!showRecipe)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <svg className={`w-3.5 h-3.5 transition-transform ${showRecipe ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Crafting Recipe (optional)
        </button>
        {showRecipe && <div className="mt-2"><RecipeGrid recipe={draft.recipe} onChange={(r) => setDraft({ ...draft, recipe: r })} /></div>}

        <div className="flex gap-2">
          <button type="button" onClick={save} disabled={!draft.name.trim()}
            className={`px-4 py-2 text-sm font-medium rounded-md text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${accentColor === "blue" ? "bg-blue-600 hover:bg-blue-500" : "bg-green-600 hover:bg-green-500"}`}>
            {editIndex !== null ? "Update Weapon" : "Add Weapon"}
          </button>
          {editIndex !== null && (
            <button type="button" onClick={() => { setEditIndex(null); setDraft({ ...EMPTY }); setShowAdvanced(false); setShowRecipe(false); }}
              className="px-4 py-2 text-sm font-medium rounded-md text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700">Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}
