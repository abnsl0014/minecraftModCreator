"use client";

import { JobStatus, getDownloadUrl } from "@/lib/api";

export default function DownloadButton({ status }: { status: JobStatus }) {
  if (!status.download_ready || !status.jar_url) return null;

  const isBedrock = status.edition === "bedrock";
  const fileType = isBedrock ? ".mcaddon" : ".jar";
  const installHint = isBedrock
    ? "Double-click to import on Windows, or open on mobile"
    : "Place this file in your Minecraft Forge mods/ folder";

  const filename = `${status.mod_id || "mod"}${isBedrock ? ".mcaddon" : "-1.0.0.jar"}`;

  const handleDownload = async () => {
    try {
      // Fetch through our backend which sets proper filename
      const res = await fetch(getDownloadUrl(status.job_id));
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback: open direct URL
      window.open(status.jar_url!, "_blank");
    }
  };

  return (
    <div className="text-center space-y-4">
      <div className="inline-flex items-center gap-2 text-green-400">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-lg font-semibold">Your mod is ready!</span>
      </div>

      <button
        onClick={handleDownload}
        className={`inline-flex items-center gap-2 px-8 py-3 font-semibold rounded-lg transition-colors duration-200 text-white ${
          isBedrock
            ? "bg-blue-600 hover:bg-blue-500"
            : "bg-green-600 hover:bg-green-500"
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download {fileType}
      </button>

      <p className="text-sm text-gray-500">{installHint}</p>
    </div>
  );
}
