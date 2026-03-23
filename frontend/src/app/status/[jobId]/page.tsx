"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getStatus, JobStatus } from "@/lib/api";
import StatusDisplay from "@/components/StatusDisplay";
import DownloadButton from "@/components/DownloadButton";
import EditForm from "@/components/EditForm";
import Header from "@/components/Header";

export default function StatusPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState("");
  const [editCount, setEditCount] = useState(0);

  const startPolling = useCallback(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const data = await getStatus(jobId);
        setStatus(data);

        if (data.status === "complete" || data.status === "failed") {
          return;
        }
      } catch {
        setError("Failed to fetch status. The server may be unavailable.");
        return;
      }

      setTimeout(poll, 2500);
    };

    poll();
  }, [jobId]);

  useEffect(() => {
    startPolling();
  }, [startPolling]);

  const handleEditStarted = () => {
    setEditCount((c) => c + 1);
    setStatus((prev) =>
      prev
        ? {
            ...prev,
            status: "generating",
            progress_message: "Processing edit request...\nApplying changes...",
            download_ready: false,
            can_edit: false,
          }
        : prev
    );
    setTimeout(startPolling, 1000);
  };

  const isComplete = status?.status === "complete";
  const isFailed = status?.status === "failed";
  const isWorking = status && !isComplete && !isFailed;

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12 pt-20">
      <Header />

      {/* Header */}
      <div className="text-center mb-8">
        <h1
          className="text-3xl font-bold mb-2 text-[#d4a017]"
          style={{ fontFamily: "var(--font-pixel), monospace" }}
        >
          {isComplete
            ? "Your Mod is Ready!"
            : isFailed
            ? "Build Failed"
            : editCount > 0
            ? "Applying Edit #" + editCount
            : "Building Your Mod"}
        </h1>
        <div className="flex items-center justify-center gap-3 mt-2">
          <span
            className={`text-xs font-medium px-2 py-0.5 ${
              status?.edition === "bedrock"
                ? "bg-blue-900/50 text-blue-300 border border-blue-800"
                : "bg-[#1a1a1a] text-[#d4a017] border border-[#d4a017]"
            }`}
            style={{ fontFamily: "var(--font-pixel), monospace" }}
          >
            {status?.edition === "bedrock" ? "Bedrock" : "Java"} Edition
          </span>
          {status?.model_used && (
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              status.model_used === "sonnet-4.6"
                ? "bg-[#8b5cf6]/20 text-[#8b5cf6]"
                : "bg-[#00ff88]/20 text-[#00ff88]"
            }`}
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              {status.model_used === "sonnet-4.6" ? "Sonnet 4.6" : "GPT-OSS 120B"}
            </span>
          )}
          {status?.mod_id && (
            <span className="text-[#808080] text-xs font-mono">{status.mod_id}</span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 text-red-300 mb-6 max-w-2xl">
          {error}
        </div>
      )}

      {/* Progress / Status */}
      {status && <StatusDisplay status={status} />}

      {/* Download */}
      {status?.download_ready && (
        <div className="mt-8">
          <DownloadButton status={status} />
        </div>
      )}

      {/* Edit form */}
      {status?.can_edit && (
        <EditForm jobId={jobId} onEditStarted={handleEditStarted} />
      )}

      {/* Give commands hint */}
      {isComplete && status?.mod_id && (
        <div className="mt-6 w-full max-w-2xl">
          <details className="mc-panel border border-gray-700/50">
            <summary
              className="px-4 py-2 text-xs text-[#808080] cursor-pointer hover:text-white"
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              How to use in Minecraft
            </summary>
            <div className="px-4 pb-3 text-xs text-[#808080] space-y-2">
              <p>1. Import the .mcaddon file on your device</p>
              <p>2. Create a new world → enable both packs (Behavior + Resource)</p>
              <p>3. Enable <span className="text-yellow-300">Beta APIs</span> in Experiments (for weapon effects)</p>
              <p>4. Give items with: <code className="text-[#d4a017] bg-[#1a1a1a] px-1">/give @s {status.mod_id}:item_name</code></p>
              <p>5. Or craft them at a crafting table in survival mode</p>
            </div>
          </details>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="text-[#808080] hover:text-white text-sm flex items-center gap-1"
          style={{ transition: "none" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create new mod
        </Link>
        <Link
          href="/gallery"
          className="text-[#808080] hover:text-white text-sm flex items-center gap-1"
          style={{ transition: "none" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Browse mods
        </Link>
      </div>
    </main>
  );
}
