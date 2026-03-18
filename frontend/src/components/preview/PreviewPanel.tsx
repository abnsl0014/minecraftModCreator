"use client";

import { useEffect, useState } from "react";
import { getPreview } from "@/lib/api";
import PreviewCanvas from "./PreviewCanvas";
import type { PreviewData } from "./types";

interface Props {
  jobId: string;
}

type AssetType = "items" | "blocks" | "mobs";

export default function PreviewPanel({ jobId }: Props) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeType, setActiveType] = useState<AssetType>("items");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchPreview() {
      try {
        const preview = await getPreview(jobId);
        if (cancelled) return;
        setData(preview);

        // Default to first non-empty tab
        if (preview.items.length > 0) setActiveType("items");
        else if (preview.blocks.length > 0) setActiveType("blocks");
        else if (preview.mobs.length > 0) setActiveType("mobs");
      } catch {
        if (!cancelled) setError("Could not load preview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPreview();
    return () => { cancelled = true; };
  }, [jobId]);

  if (loading) {
    return (
      <div className="w-full max-w-2xl mt-8">
        <div className="w-full h-72 bg-gray-900 rounded-lg animate-pulse flex items-center justify-center">
          <span className="text-gray-600 text-sm">Loading 3D preview...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const hasItems = data.items.length > 0;
  const hasBlocks = data.blocks.length > 0;
  const hasMobs = data.mobs.length > 0;

  if (!hasItems && !hasBlocks && !hasMobs) return null;

  const currentList =
    activeType === "items" ? data.items :
    activeType === "blocks" ? data.blocks :
    data.mobs;

  const safeIndex = Math.min(activeIndex, currentList.length - 1);
  const currentAsset = currentList[safeIndex];

  const handleTypeChange = (type: AssetType) => {
    setActiveType(type);
    setActiveIndex(0);
  };

  const tabs: { type: AssetType; label: string; show: boolean }[] = [
    { type: "items", label: `Items (${data.items.length})`, show: hasItems },
    { type: "blocks", label: `Blocks (${data.blocks.length})`, show: hasBlocks },
    { type: "mobs", label: `Mobs (${data.mobs.length})`, show: hasMobs },
  ];

  return (
    <div className="w-full max-w-2xl mt-8">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        3D Preview
      </h3>

      {/* Tabs */}
      <div className="flex gap-1 mb-2">
        {tabs.filter(t => t.show).map((tab) => (
          <button
            key={tab.type}
            onClick={() => handleTypeChange(tab.type)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${
              activeType === tab.type
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="w-full h-72 rounded-b-lg rounded-tr-lg border border-gray-800 overflow-hidden">
        <PreviewCanvas
          activeType={activeType}
          activeItem={activeType === "items" ? data.items[safeIndex] : undefined}
          activeBlock={activeType === "blocks" ? data.blocks[safeIndex] : undefined}
          activeMob={activeType === "mobs" ? data.mobs[safeIndex] : undefined}
        />
      </div>

      {/* Navigation for multiple assets */}
      {currentList.length > 1 && (
        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            onClick={() => setActiveIndex((safeIndex - 1 + currentList.length) % currentList.length)}
            className="text-gray-500 hover:text-gray-300 text-sm px-2 py-1 transition-colors"
          >
            &larr; Prev
          </button>
          <span className="text-gray-500 text-xs">
            {safeIndex + 1} / {currentList.length}
          </span>
          <button
            onClick={() => setActiveIndex((safeIndex + 1) % currentList.length)}
            className="text-gray-500 hover:text-gray-300 text-sm px-2 py-1 transition-colors"
          >
            Next &rarr;
          </button>
        </div>
      )}

      <p className="text-gray-600 text-xs text-center mt-2">
        Drag to rotate &middot; Scroll to zoom
      </p>
    </div>
  );
}
