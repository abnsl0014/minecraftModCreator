"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getStatus, JobStatus } from "@/lib/api";
import StatusDisplay from "@/components/StatusDisplay";
import DownloadButton from "@/components/DownloadButton";
import EditForm from "@/components/EditForm";

const PreviewPanel = dynamic(
  () => import("@/components/preview/PreviewPanel"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-2xl mt-8">
        <div className="w-full h-72 bg-gray-900 rounded-lg animate-pulse" />
      </div>
    ),
  }
);

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
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
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
            className={`text-xs font-medium px-2 py-0.5 rounded ${
              status?.edition === "bedrock"
                ? "bg-blue-900/50 text-blue-300 border border-blue-800"
                : "bg-green-900/50 text-green-300 border border-green-800"
            }`}
          >
            {status?.edition === "bedrock" ? "Bedrock" : "Java"} Edition
          </span>
          {status?.mod_id && (
            <span className="text-gray-500 text-xs font-mono">{status.mod_id}</span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-300 mb-6 max-w-2xl">
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

      {/* 3D Preview */}
      {status?.download_ready && (
        <PreviewPanel jobId={jobId} />
      )}

      {/* Edit form */}
      {status?.can_edit && (
        <EditForm jobId={jobId} onEditStarted={handleEditStarted} />
      )}

      {/* Give commands hint */}
      {isComplete && status?.mod_id && (
        <div className="mt-6 w-full max-w-2xl">
          <details className="bg-gray-800/30 border border-gray-700/50 rounded-lg">
            <summary className="px-4 py-2 text-xs text-gray-400 cursor-pointer hover:text-white">
              How to use in Minecraft
            </summary>
            <div className="px-4 pb-3 text-xs text-gray-400 space-y-2">
              <p className="font-semibold text-gray-300">Windows Desktop:</p>
              <p>1. Double-click the .mcaddon file — Minecraft will auto-import it</p>
              <p>2. Create a new world → enable both packs (Behavior + Resource)</p>
              <p>3. Enable <span className="text-yellow-300">Beta APIs</span> in Experiments (for weapon effects)</p>
              <p className="font-semibold text-gray-300 pt-2">Mobile (iOS/Android):</p>
              <p>1. Tap the downloaded .mcaddon file → &quot;Open with Minecraft&quot;</p>
              <p>2. Create a new world → enable both packs</p>
              <p className="font-semibold text-gray-300 pt-2">In-game:</p>
              <p>Give items with: <code className="text-green-300 bg-gray-900/50 px-1 rounded">/give @s {status.mod_id}:item_name</code></p>
              <p>Or craft them at a crafting table in survival mode</p>
            </div>
          </details>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create new mod
        </Link>
        <Link
          href="/gallery"
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors flex items-center gap-1"
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
