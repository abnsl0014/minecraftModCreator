"use client";

import { JobStatus } from "@/lib/api";

const FONT = { fontFamily: "var(--font-pixel), monospace" } as const;

export default function StatusDisplay({ status }: { status: JobStatus }) {
  const isFailed = status.status === "failed";
  const isComplete = status.status === "complete";

  const lines = (status.progress_message || "").split("\n").filter(l => l.trim());

  return (
    <div className="w-full max-w-2xl space-y-4">
      {/* Step checklist */}
      <div className="mc-panel p-4 space-y-2.5">
        {lines.map((line, i) => {
          const isDone = line.includes("Done");
          const isActive = !isDone && i === lines.length - 1;

          return (
            <div key={i} className="flex items-center gap-2.5">
              {isDone ? (
                <span className="text-[#55ff55] text-[10px]">+</span>
              ) : isActive && !isFailed ? (
                <span className="text-[#d4a017] text-[10px] animate-pulse">*</span>
              ) : isFailed && isActive ? (
                <span className="text-[#ff5555] text-[10px]">x</span>
              ) : (
                <span className="text-[#555] text-[10px]">-</span>
              )}
              <span className={`text-[9px] ${
                isDone ? "text-[#808080]" :
                isActive && !isFailed ? "text-[#c0c0c0]" :
                isFailed && isActive ? "text-[#ff5555]" :
                "text-[#555]"
              }`} style={FONT}>
                {line.replace("... Done", "").replace("...", "").trim()}
                {isDone && <span className="text-[#55ff55] ml-1">Done</span>}
                {isActive && !isFailed && !isComplete && (
                  <span className="text-[#d4a017] ml-1">...</span>
                )}
              </span>
            </div>
          );
        })}

        {isComplete && (
          <div className="flex items-center gap-2.5 pt-2 border-t border-[#3d3d3d] mt-2">
            <span className="text-[#55ff55] text-[10px]">+</span>
            <span className="text-[10px] text-[#55ff55]" style={FONT}>
              Ready to download!
            </span>
          </div>
        )}
      </div>

      {/* Error */}
      {isFailed && status.error && (
        <div className="mc-panel p-3 border-l-4 border-l-[#ff5555]">
          <p className="text-[9px] text-[#ff5555] mb-1.5" style={FONT}>Build Failed</p>
          <pre className="text-[8px] text-[#808080] overflow-auto max-h-32 whitespace-pre-wrap" style={FONT}>
            {status.error}
          </pre>
        </div>
      )}
    </div>
  );
}
