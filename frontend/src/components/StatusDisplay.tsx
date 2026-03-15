"use client";

import { JobStatus } from "@/lib/api";

export default function StatusDisplay({ status }: { status: JobStatus }) {
  const isFailed = status.status === "failed";
  const isComplete = status.status === "complete";

  // Parse multi-line progress into step checklist
  const lines = (status.progress_message || "").split("\n").filter(l => l.trim());

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Step checklist */}
      <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 space-y-3">
        {lines.map((line, i) => {
          const isDone = line.includes("Done");
          const isActive = !isDone && i === lines.length - 1;

          return (
            <div key={i} className="flex items-center gap-3">
              {isDone ? (
                <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : isActive && !isFailed ? (
                <div className="w-6 h-6 rounded-full border-2 border-green-500 flex items-center justify-center flex-shrink-0 animate-pulse">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                </div>
              ) : isFailed && isActive ? (
                <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-gray-600 flex-shrink-0" />
              )}
              <span className={`text-sm ${
                isDone ? "text-gray-400" :
                isActive && !isFailed ? "text-white font-medium" :
                isFailed && isActive ? "text-red-400 font-medium" :
                "text-gray-500"
              }`}>
                {line.replace("... Done", "").replace("...", "").trim()}
                {isDone && <span className="text-green-400 ml-2">Done</span>}
                {isActive && !isFailed && !isComplete && (
                  <span className="inline-flex ml-2 gap-0.5">
                    <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                )}
              </span>
            </div>
          );
        })}

        {/* Show ready state */}
        {isComplete && (
          <div className="flex items-center gap-3 pt-2 border-t border-gray-700/50 mt-3">
            <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-green-400 font-semibold">Your mod is ready to download!</span>
          </div>
        )}
      </div>

      {/* Error */}
      {isFailed && status.error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
          <p className="text-red-400 font-medium mb-2">Build Failed</p>
          <pre className="text-red-300/70 text-xs overflow-auto max-h-48 whitespace-pre-wrap">
            {status.error}
          </pre>
        </div>
      )}
    </div>
  );
}
