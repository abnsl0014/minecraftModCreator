"use client";

import { JobStatus } from "@/lib/api";

const STEPS = [
  { key: "parsing", label: "Analyzing" },
  { key: "generating", label: "Generating Code" },
  { key: "compiling", label: "Compiling" },
  { key: "complete", label: "Done" },
] as const;

function getStepIndex(status: string): number {
  if (status === "queued") return -1;
  if (status === "parsing") return 0;
  if (status === "generating") return 1;
  if (status === "compiling" || status === "fixing") return 2;
  if (status === "complete") return 3;
  return -1;
}

export default function StatusDisplay({ status }: { status: JobStatus }) {
  const currentStep = getStepIndex(status.status);
  const isFailed = status.status === "failed";

  return (
    <div className="w-full max-w-2xl space-y-8">
      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const isActive = i === currentStep;
          const isComplete = i < currentStep;
          const isCurrent = isActive && !isFailed;

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                    isComplete
                      ? "bg-green-600 border-green-600 text-white"
                      : isCurrent
                      ? "border-green-500 text-green-400 animate-pulse"
                      : isFailed && isActive
                      ? "border-red-500 text-red-400"
                      : "border-gray-700 text-gray-600"
                  }`}
                >
                  {isComplete ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isComplete
                      ? "text-green-400"
                      : isCurrent
                      ? "text-white"
                      : "text-gray-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-1.25rem] ${
                    isComplete ? "bg-green-600" : "bg-gray-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <div className="text-center space-y-3">
        <p className="text-lg text-gray-200">{status.progress_message}</p>

        {status.status === "fixing" && (
          <p className="text-sm text-yellow-400">
            Fixing errors - Attempt {status.iteration}/{status.max_iterations}
          </p>
        )}

        {status.status === "compiling" && status.iteration > 1 && (
          <p className="text-sm text-gray-400">
            Compile attempt {status.iteration}/{status.max_iterations}
          </p>
        )}

        {!isFailed && status.status !== "complete" && (
          <div className="flex justify-center">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
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
