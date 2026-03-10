"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getStatus, JobStatus } from "@/lib/api";
import StatusDisplay from "@/components/StatusDisplay";
import DownloadButton from "@/components/DownloadButton";
import EditForm from "@/components/EditForm";

export default function StatusPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState("");

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
    // Reset status and start polling again
    setStatus((prev) =>
      prev ? { ...prev, status: "generating", progress_message: "Applying edits...", download_ready: false, can_edit: false } : prev
    );
    setTimeout(startPolling, 1000);
  };

  const editionLabel = status?.edition === "bedrock" ? "Bedrock" : "Java";
  const fileType = status?.edition === "bedrock" ? ".mcaddon" : ".jar";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
          Building Your Mod
        </h1>
        <div className="flex items-center justify-center gap-3 mt-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
            status?.edition === "bedrock"
              ? "bg-blue-900/50 text-blue-300 border border-blue-800"
              : "bg-green-900/50 text-green-300 border border-green-800"
          }`}>
            {editionLabel} Edition
          </span>
          <span className="text-gray-500 text-xs font-mono">{jobId.slice(0, 8)}...</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-300 mb-6 max-w-2xl">
          {error}
        </div>
      )}

      {status && <StatusDisplay status={status} />}

      {status?.download_ready && (
        <div className="mt-8">
          <DownloadButton status={status} />
        </div>
      )}

      {/* Edit form - shown when mod is complete or failed with generated files */}
      {status?.can_edit && (
        <EditForm jobId={jobId} onEditStarted={handleEditStarted} />
      )}

      <Link
        href="/"
        className="mt-12 text-gray-500 hover:text-gray-300 text-sm transition-colors"
      >
        &larr; Create another mod
      </Link>
    </main>
  );
}
