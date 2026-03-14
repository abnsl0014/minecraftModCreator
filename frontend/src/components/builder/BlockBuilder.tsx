"use client";

import { useState } from "react";
import MaterialSelect, { TexturePreview } from "./MaterialSelect";

export interface BlockEntry {
  name: string;
  hardness: number;
  resistance: number;
  luminance: number;
  material: string;
  description: string;
}

const EMPTY_BLOCK: BlockEntry = {
  name: "",
  hardness: 2.0,
  resistance: 6.0,
  luminance: 0,
  material: "ore",
  description: "",
};

interface Props {
  blocks: BlockEntry[];
  setBlocks: (blocks: BlockEntry[]) => void;
  accentColor: string;
}

export default function BlockBuilder({ blocks, setBlocks, accentColor }: Props) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<BlockEntry>({ ...EMPTY_BLOCK });

  const addBlock = () => {
    if (!draft.name.trim()) return;
    if (editIndex !== null) {
      const updated = [...blocks];
      updated[editIndex] = { ...draft };
      setBlocks(updated);
      setEditIndex(null);
    } else {
      setBlocks([...blocks, { ...draft }]);
    }
    setDraft({ ...EMPTY_BLOCK });
  };

  const editBlock = (index: number) => {
    setDraft({ ...blocks[index] });
    setEditIndex(index);
  };

  const removeBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
    if (editIndex === index) {
      setEditIndex(null);
      setDraft({ ...EMPTY_BLOCK });
    }
  };

  const cancelEdit = () => {
    setEditIndex(null);
    setDraft({ ...EMPTY_BLOCK });
  };

  return (
    <div className="space-y-4">
      {/* Existing blocks list */}
      {blocks.length > 0 && (
        <div className="space-y-2">
          {blocks.map((block, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-800/40 border border-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <TexturePreview itemType="block" subType="" material={block.material} size={36} />
                <div>
                  <p className="text-sm font-medium text-white">{block.name}</p>
                  <p className="text-xs text-gray-400">
                    Hardness: {block.hardness} | Resistance: {block.resistance}
                    {block.luminance > 0 && ` | Light: ${block.luminance}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => editBlock(i)} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700/50">
                  Edit
                </button>
                <button type="button" onClick={() => removeBlock(i)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit block form */}
      <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg space-y-4">
        <h3 className="text-sm font-medium text-gray-300">
          {editIndex !== null ? "Edit Block" : "Add New Block"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Block Name *</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Ruby Ore"
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Material</label>
            <MaterialSelect value={draft.material} onChange={(m) => setDraft({ ...draft, material: m })} itemType="block" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Hardness</label>
            <input
              type="number"
              value={draft.hardness}
              onChange={(e) => setDraft({ ...draft, hardness: Number(e.target.value) })}
              min="0"
              max="50"
              step="0.5"
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <span className="text-[10px] text-gray-500 mt-0.5 block">Stone=1.5, Obsidian=50</span>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Blast Resistance</label>
            <input
              type="number"
              value={draft.resistance}
              onChange={(e) => setDraft({ ...draft, resistance: Number(e.target.value) })}
              min="0"
              max="1200"
              step="0.5"
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <span className="text-[10px] text-gray-500 mt-0.5 block">Stone=6, Obsidian=1200</span>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Light Level</label>
            <input
              type="number"
              value={draft.luminance}
              onChange={(e) => setDraft({ ...draft, luminance: Number(e.target.value) })}
              min="0"
              max="15"
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <span className="text-[10px] text-gray-500 mt-0.5 block">0=none, 15=max</span>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
          <input
            type="text"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="e.g. Drops rubies when mined, found deep underground"
            className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={addBlock}
            disabled={!draft.name.trim()}
            className={`px-4 py-2 text-sm font-medium rounded-md text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              accentColor === "blue"
                ? "bg-blue-600 hover:bg-blue-500"
                : "bg-green-600 hover:bg-green-500"
            }`}
          >
            {editIndex !== null ? "Update Block" : "Add Block"}
          </button>
          {editIndex !== null && (
            <button type="button" onClick={cancelEdit} className="px-4 py-2 text-sm font-medium rounded-md text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
