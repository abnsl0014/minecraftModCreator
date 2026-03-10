"use client";

import { useState } from "react";
import { editMod } from "@/lib/api";

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
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-3 mt-6">
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          placeholder="Describe changes... e.g. 'Make the sword do 15 damage instead of 8' or 'Add a new emerald block'"
          rows={3}
          className="w-full px-4 py-3 bg-gray-800/30 text-white placeholder-gray-500 focus:outline-none resize-none"
        />
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50">
          {error && <span className="text-red-400 text-xs">{error}</span>}
          {!error && <span className="text-gray-500 text-xs">Request changes to your mod</span>}
          <button
            type="submit"
            disabled={loading || !editText.trim()}
            className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
          >
            {loading ? "Applying..." : "Apply Edit"}
          </button>
        </div>
      </div>
    </form>
  );
}
