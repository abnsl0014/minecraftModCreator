"use client";

import { JobStatus, getDownloadUrl } from "@/lib/api";

const FONT = { fontFamily: "var(--font-pixel), monospace" } as const;

export default function DownloadButton({ status }: { status: JobStatus }) {
  if (!status.download_ready || !status.jar_url) return null;

  const isBedrock = status.edition === "bedrock";
  const fileType = isBedrock ? ".mcaddon" : ".zip";
  const installHint = isBedrock
    ? "Open this file on your device to import into Minecraft"
    : "Extract the ZIP and run ./gradlew build to compile your mod";

  const filename = `${status.mod_id || "mod"}${isBedrock ? ".mcaddon" : "-forge-project.zip"}`;

  const handleDownload = async () => {
    try {
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
      window.open(status.jar_url!, "_blank");
    }
  };

  return (
    <div className="text-center space-y-3">
      <div className="inline-flex items-center gap-2 text-[#55ff55]">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[12px]" style={FONT}>Your mod is ready!</span>
      </div>

      <button
        onClick={handleDownload}
        className={`mc-btn w-full py-3 text-[10px] flex items-center justify-center gap-2 ${
          isBedrock ? "text-[#5555ff]" : "text-[#55ff55]"
        }`}
        style={FONT}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download {isBedrock ? ".mcaddon" : "Project"} {fileType}
      </button>

      <p className="text-[8px] text-[#808080]" style={FONT}>{installHint}</p>
    </div>
  );
}
