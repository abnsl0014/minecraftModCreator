"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateMod } from "@/lib/api";

export default function ModForm() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [modName, setModName] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [edition, setEdition] = useState<"java" | "bedrock">("java");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    setError("");

    try {
      const { job_id } = await generateMod(description, modName, authorName, edition);
      router.push(`/status/${job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-6">
      {/* Edition selector */}
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setEdition("java")}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
            edition === "java"
              ? "bg-green-600 text-white shadow-lg shadow-green-600/25"
              : "bg-gray-800/50 text-gray-400 hover:text-white border border-gray-700"
          }`}
        >
          Java Edition
          <span className="block text-xs opacity-70">.jar (Desktop)</span>
        </button>
        <button
          type="button"
          onClick={() => setEdition("bedrock")}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
            edition === "bedrock"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
              : "bg-gray-800/50 text-gray-400 hover:text-white border border-gray-700"
          }`}
        >
          Bedrock Edition
          <span className="block text-xs opacity-70">.mcaddon (Mobile)</span>
        </button>
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          Describe your mod
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            edition === "java"
              ? "Example: Create a mod that adds a fire sword that sets enemies ablaze, a ruby ore that spawns underground, and a friendly fox companion..."
              : "Example: Create an add-on with a lightning staff weapon, a glowing crystal block, and a pet dragon that follows the player..."
          }
          rows={6}
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="modName" className="block text-sm font-medium text-gray-300 mb-2">
            Mod Name <span className="text-gray-500">(optional)</span>
          </label>
          <input
            id="modName"
            type="text"
            value={modName}
            onChange={(e) => setModName(e.target.value)}
            placeholder="e.g. Fire & Ice"
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="authorName" className="block text-sm font-medium text-gray-300 mb-2">
            Author Name <span className="text-gray-500">(optional)</span>
          </label>
          <input
            id="authorName"
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="e.g. YourName"
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !description.trim()}
        className={`w-full py-3 px-6 font-semibold rounded-lg transition-colors duration-200 text-white ${
          edition === "bedrock"
            ? "bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700"
            : "bg-green-600 hover:bg-green-500 disabled:bg-gray-700"
        } disabled:cursor-not-allowed`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Starting...
          </span>
        ) : (
          edition === "bedrock" ? "Generate Add-On" : "Generate Mod"
        )}
      </button>
    </form>
  );
}
