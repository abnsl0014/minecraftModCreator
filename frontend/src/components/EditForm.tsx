"use client";

import { useState } from "react";
import { editMod } from "@/lib/api";

const EDIT_SUGGESTIONS = [
  "Increase the sword damage to 25",
  "Add lightning effect on hit",
  "Make the armor give speed boost",
  "Add a new diamond pickaxe with 2000 durability",
  "Make food give regeneration and absorption",
  "Change the helmet to give night vision",
  "Make all items unbreakable",
  "Add a gun that rapid fires",
  "Add freeze effect to the weapon",
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
    <div className="w-full max-w-2xl mt-8 space-y-3">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit Your Mod
      </h3>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-1.5">
        {EDIT_SUGGESTIONS.slice(0, 5).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setEditText(s)}
            className="px-2 py-1 text-[10px] bg-gray-800/50 text-gray-400 border border-gray-700/50 rounded hover:bg-gray-700/50 hover:text-white transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="border border-gray-700 rounded-lg overflow-hidden">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Describe what to change... e.g. 'Make the sword do 25 damage and add freeze effect' or 'Add a netherite helmet with night vision'"
            rows={3}
            className="w-full px-4 py-3 bg-gray-800/30 text-white placeholder-gray-500 focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50">
            {error && <span className="text-red-400 text-xs">{error}</span>}
            {!error && <span className="text-gray-500 text-xs">Changes will be applied to your existing mod</span>}
            <button
              type="submit"
              disabled={loading || !editText.trim()}
              className="px-5 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Applying...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Re-generate
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
