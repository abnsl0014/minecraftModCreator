"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getStatus, JobStatus } from "@/lib/api";
import StatusDisplay from "@/components/StatusDisplay";
import DownloadButton from "@/components/DownloadButton";
import EditForm from "@/components/EditForm";
import Header from "@/components/Header";
import AdBanner from "@/components/AdBanner";

const FONT = { fontFamily: "var(--font-pixel), monospace" } as const;

function getOS(): "windows" | "mac" | "linux" {
  if (typeof navigator === "undefined") return "windows";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "mac";
  if (ua.includes("linux")) return "linux";
  return "windows";
}

function JavaBuildGuide({ modId }: { modId: string }) {
  const os = typeof window !== "undefined" ? getOS() : "windows";

  const gradlewCmd = os === "windows" ? "gradlew.bat build" : "./gradlew build";
  const extractHint =
    os === "windows"
      ? "Right-click the .zip → Extract All"
      : os === "mac"
      ? "Double-click the .zip to extract"
      : "unzip the .zip file";
  const terminalHint =
    os === "windows"
      ? "Open PowerShell or Command Prompt in the extracted folder"
      : os === "mac"
      ? "Open Terminal, then cd into the extracted folder"
      : "Open a terminal and cd into the extracted folder";
  const jdkLink = "https://adoptium.net/";
  const jdkNote =
    os === "windows"
      ? "Download the .msi installer for Windows x64"
      : os === "mac"
      ? "Download the .pkg installer for macOS (Apple Silicon or Intel)"
      : "Install via: sudo apt install openjdk-17-jdk";

  return (
    <div className="mt-6 w-full max-w-2xl">
      <details open className="mc-panel border border-[#d4a017]/30">
        <summary
          className="px-4 py-2 text-xs text-[#d4a017] cursor-pointer hover:text-white"
          style={FONT}
        >
          How to build your mod
        </summary>
        <div className="px-4 pb-4 space-y-3">
          <p className="text-[8px] text-[#555]" style={FONT}>
            Detected: <span className="text-[#808080]">{os === "windows" ? "Windows" : os === "mac" ? "macOS" : "Linux"}</span>
          </p>

          {/* Step 1 */}
          <div className="space-y-1">
            <p className="text-[9px] text-[#c0c0c0]" style={FONT}>
              <span className="text-[#55ff55]">1.</span> Install Java 17 (if you don&apos;t have it)
            </p>
            <p className="text-[8px] text-[#808080]" style={FONT}>{jdkNote}</p>
            <a
              href={jdkLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[8px] text-[#5555ff] hover:text-[#8888ff]"
              style={FONT}
            >
              Download JDK 17 (Adoptium) &rarr;
            </a>
          </div>

          {/* Step 2 */}
          <div className="space-y-1">
            <p className="text-[9px] text-[#c0c0c0]" style={FONT}>
              <span className="text-[#55ff55]">2.</span> Extract the downloaded ZIP
            </p>
            <p className="text-[8px] text-[#808080]" style={FONT}>{extractHint}</p>
          </div>

          {/* Step 3 */}
          <div className="space-y-1">
            <p className="text-[9px] text-[#c0c0c0]" style={FONT}>
              <span className="text-[#55ff55]">3.</span> Open a terminal in the project folder
            </p>
            <p className="text-[8px] text-[#808080]" style={FONT}>{terminalHint}</p>
          </div>

          {/* Step 4 */}
          <div className="space-y-1">
            <p className="text-[9px] text-[#c0c0c0]" style={FONT}>
              <span className="text-[#55ff55]">4.</span> Build the mod
            </p>
            <div className="bg-[#0a0a0a] border border-[#3d3d3d] px-3 py-2 flex items-center justify-between">
              <code className="text-[9px] text-[#d4a017]" style={FONT}>{gradlewCmd}</code>
              <button
                onClick={() => navigator.clipboard?.writeText(gradlewCmd)}
                className="text-[8px] text-[#555] hover:text-white ml-3"
                style={FONT}
                title="Copy command"
              >
                copy
              </button>
            </div>
            <p className="text-[8px] text-[#808080]" style={FONT}>
              First build downloads dependencies (~2-3 min). Subsequent builds are faster.
            </p>
          </div>

          {/* Step 5 */}
          <div className="space-y-1">
            <p className="text-[9px] text-[#c0c0c0]" style={FONT}>
              <span className="text-[#55ff55]">5.</span> Find your .jar file
            </p>
            <div className="bg-[#0a0a0a] border border-[#3d3d3d] px-3 py-2">
              <code className="text-[9px] text-[#808080]" style={FONT}>build/libs/{modId}-1.0.0.jar</code>
            </div>
          </div>

          {/* Step 6 */}
          <div className="space-y-1">
            <p className="text-[9px] text-[#c0c0c0]" style={FONT}>
              <span className="text-[#55ff55]">6.</span> Install in Minecraft
            </p>
            <p className="text-[8px] text-[#808080]" style={FONT}>
              Copy the .jar into your <code className="text-[#d4a017]">.minecraft/mods/</code> folder and launch with Forge 1.20.1
            </p>
          </div>

          <div className="pt-2 border-t border-[#3d3d3d]">
            <Link
              href="/guide"
              className="text-[8px] text-[#5555ff] hover:text-[#8888ff]"
              style={FONT}
            >
              Full installation guide &rarr;
            </Link>
          </div>
        </div>
      </details>
    </div>
  );
}

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

      <AdBanner slot="status-wait" className="mt-6" />

      {/* Texture Previews */}
      {isComplete && status?.texture_previews && (
        <div className="mt-6 w-full max-w-2xl">
          <p className="text-[9px] text-[#808080] mb-3" style={FONT}>Generated Items</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[...(status.texture_previews.items || []), ...(status.texture_previews.blocks || [])].map((item, i) => (
              <div
                key={item.registry_name}
                className="mc-panel p-3 flex flex-col items-center gap-2 relative loot-card-enter"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="enchant-glint" />
                <div className="w-12 h-12 bg-[#0a0a0a] border border-[#3d3d3d] flex items-center justify-center">
                  {item.texture ? (
                    <img src={item.texture} alt={item.name} className="w-10 h-10" style={{ imageRendering: "pixelated" }} />
                  ) : (
                    <span className="text-[14px] opacity-30">?</span>
                  )}
                </div>
                <p className="text-[8px] text-[#c0c0c0] text-center truncate w-full" style={FONT}>{item.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Usage hints — edition-specific */}
      {isComplete && status?.mod_id && status?.edition === "bedrock" && (
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
              <p>2. Create a new world &rarr; enable both packs (Behavior + Resource)</p>
              <p>3. Enable <span className="text-yellow-300">Beta APIs</span> in Experiments (for weapon effects)</p>
              <p>4. Give items with: <code className="text-[#d4a017] bg-[#1a1a1a] px-1">/give @s {status.mod_id}:item_name</code></p>
              <p>5. Or craft them at a crafting table in survival mode</p>
            </div>
          </details>
        </div>
      )}

      {/* Java build guide — inline smart guide */}
      {isComplete && status?.mod_id && status?.edition === "java" && (
        <JavaBuildGuide modId={status.mod_id} />
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
        <Link
          href="/guide"
          className="text-[#808080] hover:text-white text-sm flex items-center gap-1"
          style={{ transition: "none" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Install guide
        </Link>
      </div>
    </main>
  );
}
