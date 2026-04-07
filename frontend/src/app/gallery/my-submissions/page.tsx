"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { getMySubmissions, deleteSubmission, Submission } from "@/lib/api";
import { CATEGORY_CONFIG } from "@/lib/exploreData";

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending Review", color: "#d4a017" },
  approved: { label: "Approved", color: "#55ff55" },
  rejected: { label: "Rejected", color: "#ff5555" },
};

function MySubmissionsContent() {
  const searchParams = useSearchParams();
  const justSubmitted = searchParams.get("submitted") === "true";

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getMySubmissions();
        setSubmissions(data.submissions);
        setEarnings(data.earnings_balance);
      } catch {
        setError("Failed to load submissions. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this submission?")) return;
    try {
      await deleteSubmission(id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert("Failed to delete");
    }
  }

  const totalDownloads = submissions
    .filter((s) => s.status === "approved")
    .reduce((sum, s) => sum + s.download_count, 0);

  return (
    <main className="min-h-screen px-4 py-8 pt-20">
      <Header />
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/gallery" className="text-[#808080] hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-[14px] text-[#d4a017]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              My Submissions
            </h1>
          </div>
          <Link href="/gallery/submit" className="mc-btn px-3 py-1 text-[8px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            + Submit New
          </Link>
        </div>

        {justSubmitted && (
          <div className="mc-panel p-3 mb-4 border-l-2 border-l-green-500">
            <p className="text-green-400 text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Mod submitted! It will appear in the gallery once approved.
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="mc-panel p-3 text-center">
            <div className="text-[16px] text-[#d4a017]" style={{ fontFamily: "var(--font-pixel), monospace" }}>{submissions.length}</div>
            <div className="text-[7px] text-[#555] mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>Total Mods</div>
          </div>
          <div className="mc-panel p-3 text-center">
            <div className="text-[16px] text-[#d4a017]" style={{ fontFamily: "var(--font-pixel), monospace" }}>{totalDownloads}</div>
            <div className="text-[7px] text-[#555] mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>Downloads</div>
          </div>
          <div className="mc-panel p-3 text-center">
            <div className="text-[16px] text-[#55ff55]" style={{ fontFamily: "var(--font-pixel), monospace" }}>₹{(earnings / 100).toFixed(0)}</div>
            <div className="text-[7px] text-[#555] mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>Earned</div>
          </div>
        </div>

        {error ? (
          <div className="mc-panel p-8 text-center">
            <p className="text-red-400 text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>{error}</p>
          </div>
        ) : loading ? (
          <div className="mc-panel p-8 text-center">
            <p className="text-[#555] text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>Loading...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="mc-panel p-8 text-center">
            <p className="text-[#555] text-[10px] mb-3" style={{ fontFamily: "var(--font-pixel), monospace" }}>No submissions yet</p>
            <Link href="/gallery/submit" className="mc-btn px-4 py-2 text-[9px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Submit Your First Mod
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => {
              const statusStyle = STATUS_STYLES[sub.status] || STATUS_STYLES.pending;
              const catConfig = CATEGORY_CONFIG[sub.category as keyof typeof CATEGORY_CONFIG];
              return (
                <div key={sub.id} className="mc-panel p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[11px] text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{sub.title}</h3>
                        <span className="text-[7px] px-2 py-0.5 rounded"
                          style={{ fontFamily: "var(--font-pixel), monospace", color: statusStyle.color, border: `1px solid ${statusStyle.color}` }}>
                          {statusStyle.label}
                        </span>
                        {sub.featured && (
                          <span className="text-[7px] px-2 py-0.5 rounded bg-[#d4a017] text-black" style={{ fontFamily: "var(--font-pixel), monospace" }}>Featured</span>
                        )}
                      </div>
                      <p className="text-[#808080] text-xs mb-2">{sub.description.slice(0, 100)}...</p>
                      <div className="flex gap-3 text-[8px] text-[#555]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                        <span style={{ color: catConfig?.color }}>{catConfig?.icon} {catConfig?.label}</span>
                        <span className="capitalize">{sub.edition}</span>
                        {sub.status === "approved" && <span>{sub.download_count} downloads</span>}
                      </div>
                      {sub.status === "rejected" && sub.rejection_reason && (
                        <div className="mt-2 p-2 bg-[#1a0000] border border-red-900 rounded text-xs text-red-400">
                          Reason: {sub.rejection_reason}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-3">
                      {sub.status === "pending" && (
                        <button onClick={() => handleDelete(sub.id)}
                          className="text-red-400 hover:text-red-300 text-[8px] px-2 py-1 border border-red-900 rounded"
                          style={{ fontFamily: "var(--font-pixel), monospace" }}>Delete</button>
                      )}
                      {sub.status === "approved" && (
                        <Link href={`/gallery/${sub.id}`}
                          className="text-[#d4a017] text-[8px] px-2 py-1 border border-[#d4a017] rounded"
                          style={{ fontFamily: "var(--font-pixel), monospace" }}>View</Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default function MySubmissionsPage() {
  return (
    <Suspense fallback={null}>
      <MySubmissionsContent />
    </Suspense>
  );
}
