"use client";

import { JobStatus } from "@/lib/api";

export default function DownloadButton({ status }: { status: JobStatus }) {
  if (!status.download_ready || !status.jar_url) return null;

  const isBedrock = status.edition === "bedrock";
  const fileType = isBedrock ? ".mcaddon" : ".jar";
  const installHint = isBedrock
    ? "Open this file on your device to import into Minecraft"
    : "Place this file in your Minecraft Forge mods/ folder";

  return (
    <div className="text-center space-y-4">
      <div className="inline-flex items-center gap-2 text-green-400">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-lg font-semibold">Your mod is ready!</span>
      </div>

      <a
        href={status.jar_url}
        download
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
      </a>

      <p className="text-sm text-gray-500">{installHint}</p>
    </div>
  );
}
