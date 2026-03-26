"use client";

import { useState } from "react";
import { editMod } from "@/lib/api";

const FONT = { fontFamily: "var(--font-pixel), monospace" } as const;

const EDIT_SUGGESTIONS = [
  "Increase the sword damage to 25",
  "Add lightning effect on hit",
  "Make the armor give speed boost",
  "Add a new diamond pickaxe with 2000 durability",
  "Make food give regeneration and absorption",
];

export default function EditForm({
  jobId,
  onEditStarted,
}: {
  jobId: string;
  onEditStarted: () => void;
}) {
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editText.trim()) return;

    setLoading(true);
    setError("");

    try {
      await editMod(jobId, editText);
      setEditText("");
      onEditStarted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start edit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mt-6 space-y-3">
      <h3 className="text-[10px] text-[#d4a017] flex items-center gap-2" style={FONT}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit Your Mod
      </h3>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-1.5">
        {EDIT_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setEditText(s)}
            className="mc-panel px-2 py-1 text-[8px] text-[#808080] hover:text-[#c0c0c0] hover:border-[#d4a017]"
            style={{ ...FONT, transition: "none" }}
          >
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mc-panel p-0 overflow-hidden">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Describe what to change..."
            rows={2}
            className="w-full px-3 py-2.5 bg-transparent text-[9px] text-[#c0c0c0] placeholder-[#555] focus:outline-none resize-none"
            style={FONT}
          />
          <div className="flex items-center justify-between px-3 py-2 border-t border-[#3d3d3d]">
            {error ? (
              <span className="text-[8px] text-[#ff5555]" style={FONT}>{error}</span>
            ) : (
              <span className="text-[7px] text-[#555]" style={FONT}>Changes apply to your existing mod</span>
            )}
            <button
              type="submit"
              disabled={loading || !editText.trim()}
              className="mc-btn px-4 py-1.5 text-[9px] disabled:opacity-30"
              style={{ ...FONT, color: "#d4a017" }}
            >
              {loading ? "Applying..." : "Re-generate"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
