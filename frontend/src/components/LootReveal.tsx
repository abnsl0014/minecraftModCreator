"use client";

import { useState } from "react";
import { TexturePreviews, editMod } from "@/lib/api";

const FONT = { fontFamily: "var(--font-pixel), monospace" } as const;

const TYPE_COLORS: Record<string, string> = {
  weapon: "#ff5555",
  tool: "#ffaa00",
  armor: "#5555ff",
  food: "#55ff55",
  block: "#aa55ff",
};

const TYPE_LABELS: Record<string, string> = {
  weapon: "Weapon",
  tool: "Tool",
  armor: "Armor",
  food: "Food",
  block: "Block",
};

interface LootRevealProps {
  previews: TexturePreviews;
  jobId: string;
  downloadUrl?: string;
  onEditStarted?: () => void;
}

function LootCard({
  name,
  type,
  texture,
  index,
  jobId,
  onEditStarted,
}: {
  name: string;
  type: string;
  texture: string;
  index: number;
  jobId: string;
  onEditStarted?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const color = TYPE_COLORS[type] || "#808080";

  async function handleEdit() {
    if (!editText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await editMod(jobId, editText.trim());
      setEditing(false);
      setEditText("");
      onEditStarted?.();
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="loot-card-enter"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div
        className="relative mc-panel p-3 group hover:border-[#d4a017] cursor-pointer"
        style={{ borderLeftColor: color, borderLeftWidth: "3px", transition: "border-color 0.15s" }}
        onClick={() => !editing && setEditing(true)}
      >
        {/* Enchantment glint overlay */}
        <div className="enchant-glint" />

        <div className="flex items-center gap-3">
          {/* Texture preview */}
          <div className="shrink-0 w-12 h-12 bg-[#0a0a0a] border border-[#3d3d3d] flex items-center justify-center overflow-hidden">
            {texture ? (
              <img
                src={texture}
                alt={name}
                className="w-10 h-10"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <span className="text-[16px] opacity-30">?</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[#d4a017] truncate" style={FONT}>
              {name}
            </p>
            <span
              className="text-[7px] px-1.5 py-0.5 rounded mt-1 inline-block"
              style={{ ...FONT, backgroundColor: color + "20", color }}
            >
              {TYPE_LABELS[type] || type}
            </span>
          </div>

          {/* Edit hint */}
          <span
            className="text-[7px] text-[#555] opacity-0 group-hover:opacity-100"
            style={{ ...FONT, transition: "opacity 0.15s" }}
          >
            tap to edit
          </span>
        </div>

        {/* Inline edit */}
        {editing && (
          <div className="mt-3 pt-3 border-t border-[#3d3d3d]" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-2">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                placeholder={`Change ${name}...`}
                className="flex-1 bg-[#0a0a0a] border border-[#3d3d3d] px-2 py-1.5 text-[8px] text-[#c0c0c0] focus:outline-none focus:border-[#d4a017]"
                style={FONT}
                autoFocus
                disabled={submitting}
              />
              <button
                onClick={handleEdit}
                disabled={!editText.trim() || submitting}
                className="mc-btn px-3 py-1 text-[8px] text-[#d4a017] disabled:opacity-30"
                style={FONT}
              >
                {submitting ? "..." : "Apply"}
              </button>
              <button
                onClick={() => { setEditing(false); setEditText(""); }}
                className="text-[8px] text-[#555] hover:text-[#808080] px-1"
                style={FONT}
              >
                x
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LootReveal({ previews, jobId, downloadUrl, onEditStarted }: LootRevealProps) {
  const allItems = [...previews.items, ...previews.blocks];

  if (allItems.length === 0) return null;

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 loot-card-enter" style={{ animationDelay: "0ms" }}>
        <span className="text-[10px] text-[#55ff55]" style={FONT}>
          + {allItems.length} {allItems.length === 1 ? "item" : "items"} created
        </span>
        <span
          className="text-[8px] px-2 py-0.5 rounded bg-[#1a1a1a] text-[#d4a017] border border-[#d4a017]/30"
          style={FONT}
        >
          Java Forge
        </span>
      </div>

      {/* Item cards */}
      <div className="grid grid-cols-1 gap-2">
        {allItems.map((item, i) => (
          <LootCard
            key={item.registry_name}
            name={item.name}
            type={item.type}
            texture={item.texture}
            index={i + 1}
            jobId={jobId}
            onEditStarted={onEditStarted}
          />
        ))}
      </div>

      {/* Download button */}
      {downloadUrl && (
        <div className="loot-card-enter" style={{ animationDelay: `${(allItems.length + 1) * 150}ms` }}>
          <a
            href={downloadUrl}
            className="mc-btn w-full py-2.5 text-[10px] flex items-center justify-center gap-2 text-[#55ff55]"
            style={FONT}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Project .zip
          </a>
        </div>
      )}

      {/* Edit hint */}
      <p
        className="text-[7px] text-[#555] text-center loot-card-enter"
        style={{ ...FONT, animationDelay: `${(allItems.length + 2) * 150}ms` }}
      >
        Tap any item to edit it
      </p>
    </div>
  );
}
