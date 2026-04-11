"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  getAdminSubmissions,
  approveSubmission,
  rejectSubmission,
  toggleFeatured,
  Submission,
} from "@/lib/api";
import { CATEGORY_CONFIG } from "@/lib/exploreData";

export default function AdminPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, [filter]);

  async function loadSubmissions() {
    setLoading(true);
    try {
      const data = await getAdminSubmissions(filter);
      setSubmissions(data.submissions);
    } catch {
      // Not admin or error
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string, featured: boolean = false) {
    setActionLoading(id);
    try {
      await approveSubmission(id, featured);
      await loadSubmissions();
    } catch {
      alert("Failed to approve");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }
    setActionLoading(id);
    try {
      await rejectSubmission(id, rejectReason);
      setRejectReason("");
      setExpandedId(null);
      await loadSubmissions();
    } catch {
      alert("Failed to reject");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleFeatured(id: string) {
    try {
      await toggleFeatured(id);
      await loadSubmissions();
    } catch {
      alert("Failed to toggle featured");
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 pt-20">
      <Header />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/gallery" className="text-[#808080] hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-[14px] text-[#d4a017]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Mod Approvals
            </h1>
            <p className="text-[8px] text-[#555] mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Review and approve community submissions
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[8px] px-3 py-1 rounded border ${filter === f ? "border-[#d4a017] text-[#d4a017]" : "border-[#333] text-[#555]"}`}
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mc-panel p-8 text-center">
            <p className="text-[#555] text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>Loading...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="mc-panel p-8 text-center">
            <p className="text-[#555] text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              No {filter === "all" ? "" : filter} submissions
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => {
              const catConfig = CATEGORY_CONFIG[sub.category as keyof typeof CATEGORY_CONFIG];
              const isExpanded = expandedId === sub.id;
              return (
                <div key={sub.id} className="mc-panel p-4">
                  <div className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : sub.id)}>
                    <div className="flex-1">
                      <h3 className="text-[11px] text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{sub.title}</h3>
                      <div className="flex gap-3 text-[8px] mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                        <span style={{ color: catConfig?.color }}>{catConfig?.icon} {catConfig?.label}</span>
                        <span className="text-[#555]">{new Date(sub.created_at).toLocaleDateString()}</span>
                        <span className="text-[#555]">{sub.screenshots.length} screenshots</span>
                      </div>
                    </div>
                    <span className="text-[#555] text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-[#333]">
                      <p className="text-[#c0c0c0] text-sm mb-3">{sub.description}</p>
                      {sub.screenshots.length > 0 && (
                        <div className="flex gap-2 mb-3">
                          {sub.screenshots.map((url, i) => (
                            <img key={i} src={url} alt="" className="w-24 h-24 object-cover rounded border border-[#333]" />
                          ))}
                        </div>
                      )}
                      {sub.video_url && (
                        <p className="text-[8px] text-[#808080] mb-3">
                          Video: <a href={sub.video_url} target="_blank" className="text-[#d4a017] underline">{sub.video_url}</a>
                        </p>
                      )}

                      {sub.status === "pending" && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleApprove(sub.id); }}
                              disabled={actionLoading === sub.id}
                              className="mc-btn px-3 py-1 text-[8px] bg-green-900 border-green-700"
                              style={{ fontFamily: "var(--font-pixel), monospace" }}>Approve</button>
                            <button onClick={(e) => { e.stopPropagation(); handleApprove(sub.id, true); }}
                              disabled={actionLoading === sub.id}
                              className="mc-btn px-3 py-1 text-[8px] bg-[#2a2000] border-[#d4a017]"
                              style={{ fontFamily: "var(--font-pixel), monospace" }}>Approve + Feature</button>
                          </div>
                          <div className="flex gap-2">
                            <input type="text" value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Rejection reason..."
                              className="flex-1 bg-[#111] border border-[#333] px-2 py-1 text-sm text-white rounded" />
                            <button onClick={(e) => { e.stopPropagation(); handleReject(sub.id); }}
                              disabled={actionLoading === sub.id}
                              className="mc-btn px-3 py-1 text-[8px] bg-red-900 border-red-700"
                              style={{ fontFamily: "var(--font-pixel), monospace" }}>Reject</button>
                          </div>
                        </div>
                      )}

                      {sub.status === "approved" && (
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); handleToggleFeatured(sub.id); }}
                            className="mc-btn px-3 py-1 text-[8px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                            {sub.featured ? "Remove Featured" : "Mark Featured"}
                          </button>
                          <span className="text-[8px] text-[#555] self-center" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                            {sub.download_count} downloads
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
