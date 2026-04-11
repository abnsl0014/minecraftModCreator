"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import CraftingGrid from "@/components/explore/CraftingGrid";
import { getSubmission, trackDownload, Submission } from "@/lib/api";
import { CATEGORY_CONFIG, CraftingSlot } from "@/lib/exploreData";

function YouTubeEmbed({ url }: { url: string }) {
  const match = url.match(/(?:youtu\.be\/|v=|\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (!match) return null;
  return (
    <div className="aspect-video w-full rounded overflow-hidden border border-[#333]">
      <iframe
        src={`https://www.youtube.com/embed/${match[1]}`}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}

export default function ModDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const data = await getSubmission(id);
        setSubmission(data);
      } catch {
        setError("Failed to load mod details. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleDownload() {
    if (!submission) return;
    setDownloading(true);
    try {
      const result = await trackDownload(submission.id);
      if (result.counted) {
        setSubmission((prev) => prev ? { ...prev, download_count: prev.download_count + 1 } : prev);
      }
      window.open(result.download_url, "_blank");
    } catch {
      alert("Download failed");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 pt-20">
        <Header />
        <div className="max-w-3xl mx-auto mc-panel p-8 text-center">
          <p className="text-[#555] text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>Loading...</p>
        </div>
      </main>
    );
  }

  if (!submission) {
    return (
      <main className="min-h-screen px-4 py-8 pt-20">
        <Header />
        <div className="max-w-3xl mx-auto mc-panel p-8 text-center">
          <p className="text-red-400 text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>{error || "Mod not found"}</p>
          <Link href="/gallery" className="mc-btn px-4 py-2 text-[9px] inline-block mt-4" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Back to Gallery
          </Link>
        </div>
      </main>
    );
  }

  const catConfig = CATEGORY_CONFIG[submission.category as keyof typeof CATEGORY_CONFIG];

  return (
    <main className="min-h-screen px-4 py-8 pt-20">
      <Header />
      <div className="max-w-3xl mx-auto">
        <Link href="/gallery" className="inline-flex items-center gap-2 text-[#808080] hover:text-white mb-4 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Gallery
        </Link>

        <div className="mc-panel p-5 mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-[16px] text-[#d4a017] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {submission.title}
              </h1>
              <div className="flex items-center gap-3 text-[8px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                <span className="text-[#808080]">
                  by{" "}
                  <Link href={`/profile/${submission.user_id}`} className="text-[#d4a017] hover:underline">
                    {submission.author_name || "Anonymous"}
                  </Link>
                </span>
                <span style={{ color: catConfig?.color }}>{catConfig?.icon} {catConfig?.label}</span>
                {submission.featured && <span className="text-[#d4a017]">★ Featured</span>}
              </div>
            </div>
            <button onClick={handleDownload} disabled={downloading}
              className="mc-btn px-4 py-2 text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {downloading ? "..." : `Download (${submission.download_count})`}
            </button>
          </div>
          {submission.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {submission.tags.map((tag) => (
                <span key={tag} className="text-[7px] px-2 py-0.5 bg-[#1a1a1a] border border-[#333] rounded text-[#808080]">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {submission.screenshots.length > 0 && (
          <div className="mc-panel p-4 mb-4">
            <div className="aspect-video w-full rounded overflow-hidden border border-[#333] mb-2">
              <img src={submission.screenshots[currentImage]} alt={`Screenshot ${currentImage + 1}`}
                className="w-full h-full object-contain bg-black" />
            </div>
            {submission.screenshots.length > 1 && (
              <div className="flex gap-2 justify-center">
                {submission.screenshots.map((url, i) => (
                  <button key={i} onClick={() => setCurrentImage(i)}
                    className={`w-12 h-12 rounded overflow-hidden border-2 ${i === currentImage ? "border-[#d4a017]" : "border-[#333]"}`}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {submission.video_url && (
          <div className="mc-panel p-4 mb-4">
            <h2 className="text-[10px] text-[#d4a017] mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>Video</h2>
            <YouTubeEmbed url={submission.video_url} />
          </div>
        )}

        <div className="mc-panel p-4 mb-4">
          <h2 className="text-[10px] text-[#d4a017] mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>Description</h2>
          <p className="text-[#c0c0c0] text-sm whitespace-pre-wrap">{submission.description}</p>
        </div>

        {submission.crafting_recipe && (
          <div className="mc-panel p-4 mb-4">
            <h2 className="text-[10px] text-[#d4a017] mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>Crafting Recipe</h2>
            <CraftingGrid recipe={submission.crafting_recipe as unknown as (CraftingSlot | null)[]} />
          </div>
        )}

        {submission.survival_guide && (
          <div className="mc-panel p-4 mb-4">
            <h2 className="text-[10px] text-[#d4a017] mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>Survival Guide</h2>
            <p className="text-[#c0c0c0] text-sm whitespace-pre-wrap">{submission.survival_guide}</p>
          </div>
        )}
      </div>
    </main>
  );
}
