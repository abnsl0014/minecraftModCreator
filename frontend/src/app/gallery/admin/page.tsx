"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import CraftingGrid from "@/components/explore/CraftingGrid";
import {
  ModSubmission,
  MOCK_PENDING_SUBMISSIONS,
  CATEGORY_CONFIG,
  getLocalSubmissions,
  updateSubmissionStatus,
} from "@/lib/exploreData";

export default function AdminPage() {
  const [submissions, setSubmissions] = useState<ModSubmission[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // Merge mock pending + localStorage submissions
    const local = getLocalSubmissions();
    const mockIds = new Set(MOCK_PENDING_SUBMISSIONS.map(s => s.id));
    const combined = [
      ...MOCK_PENDING_SUBMISSIONS,
      ...local.filter(s => !mockIds.has(s.id)),
    ];
    setSubmissions(combined);
  }, []);

  function handleAction(id: string, action: "approved" | "rejected") {
    setSubmissions(prev =>
      prev.map(s => s.id === id ? { ...s, status: action } : s)
    );
    updateSubmissionStatus(id, action);
  }

  const filtered = filter === "all"
    ? submissions
    : submissions.filter(s => s.status === filter);

  const counts = {
    pending: submissions.filter(s => s.status === "pending").length,
    approved: submissions.filter(s => s.status === "approved").length,
    rejected: submissions.filter(s => s.status === "rejected").length,
  };

  return (
    <main className="min-h-screen px-4 py-8 pt-20">
      <Header />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/gallery" className="text-[#808080] hover:text-white" style={{ transition: "none" }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-[14px] text-[#d4a017]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Mod Approvals
              </h1>
              <p className="text-[8px] text-[#555] mt-1"
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Review and approve community submissions
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="mc-panel p-3 text-center border-t-2 border-t-[#d4a017]">
            <div className="text-[16px] text-[#d4a017]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {counts.pending}
            </div>
            <div className="text-[7px] text-[#555] mt-1"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Pending
            </div>
          </div>
          <div className="mc-panel p-3 text-center border-t-2 border-t-[#55ff55]">
            <div className="text-[16px] text-[#55ff55]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {counts.approved}
            </div>
            <div className="text-[7px] text-[#555] mt-1"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Approved
            </div>
          </div>
          <div className="mc-panel p-3 text-center border-t-2 border-t-[#ff5555]">
            <div className="text-[16px] text-[#ff5555]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {counts.rejected}
            </div>
            <div className="text-[7px] text-[#555] mt-1"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Rejected
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex mc-panel p-1 mb-6 w-fit">
          {([
            { key: "pending" as const, label: "Pending", color: "#d4a017" },
            { key: "approved" as const, label: "Approved", color: "#55ff55" },
            { key: "rejected" as const, label: "Rejected", color: "#ff5555" },
            { key: "all" as const, label: "All", color: "#808080" },
          ]).map(f => (
            <button key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-[8px] ${
                filter === f.key ? "bg-[#3d3d3d]" : "hover:text-[#808080]"
              }`}
              style={{
                fontFamily: "var(--font-pixel), monospace",
                transition: "none",
                color: filter === f.key ? f.color : "#555",
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Submissions list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[10px] text-[#808080]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              No {filter === "all" ? "" : filter} submissions
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(sub => {
              const cat = CATEGORY_CONFIG[sub.category];
              const isExpanded = expandedId === sub.id;
              const hasRecipe = sub.craftingRecipe.some(s => s !== null);

              return (
                <div key={sub.id} className="mc-panel border border-[#2a2a2a]">
                  {/* Summary row */}
                  <div className="p-4 flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : sub.id)}>
                    {/* Category icon */}
                    <div className="w-10 h-10 bg-[#111] flex items-center justify-center shrink-0 text-[18px]"
                      style={{ border: `1px solid ${cat.color}33` }}>
                      {cat.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[10px] text-white truncate"
                          style={{ fontFamily: "var(--font-pixel), monospace" }}>
                          {sub.name}
                        </h3>
                        <span className="shrink-0 px-1.5 py-0.5 text-[7px]"
                          style={{
                            fontFamily: "var(--font-pixel), monospace",
                            color: cat.color,
                            border: `1px solid ${cat.color}44`,
                          }}>
                          {cat.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[7px] text-[#555]"
                        style={{ fontFamily: "var(--font-pixel), monospace" }}>
                        <span>by {sub.author}</span>
                        <span>•</span>
                        <span style={{ color: sub.edition === "java" ? "#55ff55" : "#5555ff" }}>
                          {sub.edition}
                        </span>
                        <span>•</span>
                        <span>{new Date(sub.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className={`shrink-0 px-2 py-1 text-[7px] ${
                      sub.status === "pending" ? "text-[#d4a017] border-[#d4a017]" :
                      sub.status === "approved" ? "text-[#55ff55] border-[#55ff55]" :
                      "text-[#ff5555] border-[#ff5555]"
                    } border`}
                      style={{ fontFamily: "var(--font-pixel), monospace" }}>
                      {sub.status.toUpperCase()}
                    </div>

                    {/* Expand arrow */}
                    <span className={`text-[#555] text-[10px] ${isExpanded ? "rotate-90" : ""}`}
                      style={{ transition: "none" }}>
                      ▶
                    </span>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-[#1a1a1a]">
                      <div className="pt-4 space-y-4">
                        {/* Description */}
                        <div>
                          <p className="text-[8px] text-[#808080] mb-1"
                            style={{ fontFamily: "var(--font-pixel), monospace" }}>
                            Description:
                          </p>
                          <p className="text-[9px] text-[#c0c0c0] leading-relaxed"
                            style={{ fontFamily: "var(--font-pixel), monospace" }}>
                            {sub.description}
                          </p>
                        </div>

                        {/* Recipe + Guide side by side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {hasRecipe && (
                            <div>
                              <p className="text-[8px] text-[#808080] mb-2"
                                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                                Crafting Recipe:
                              </p>
                              <CraftingGrid recipe={sub.craftingRecipe} size="md" />
                            </div>
                          )}

                          {sub.survivalGuide && (
                            <div>
                              <p className="text-[8px] text-[#808080] mb-2"
                                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                                Survival Guide:
                              </p>
                              <div className="mc-panel-inset p-2">
                                <p className="text-[8px] text-[#c0c0c0] leading-relaxed"
                                  style={{ fontFamily: "var(--font-pixel), monospace" }}>
                                  {sub.survivalGuide}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Video */}
                        {sub.videoUrl && (
                          <div>
                            <p className="text-[8px] text-[#808080] mb-1"
                              style={{ fontFamily: "var(--font-pixel), monospace" }}>
                              Video: <a href={sub.videoUrl} target="_blank" rel="noopener noreferrer"
                                className="text-[#d4a017]">{sub.videoUrl}</a>
                            </p>
                          </div>
                        )}

                        {/* Tags */}
                        {sub.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {sub.tags.map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 text-[7px] text-[#555] border border-[#2a2a2a]"
                                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Action buttons */}
                        {sub.status === "pending" && (
                          <div className="flex items-center gap-3 pt-2">
                            <button onClick={() => handleAction(sub.id, "approved")}
                              className="mc-btn px-4 py-2 text-[9px] flex items-center gap-2"
                              style={{ color: "#55ff55", borderColor: "#55ff5533 #55ff5511 #55ff5511 #55ff5533" }}>
                              ✓ Approve
                            </button>
                            <button onClick={() => handleAction(sub.id, "rejected")}
                              className="mc-btn px-4 py-2 text-[9px] flex items-center gap-2"
                              style={{ color: "#ff5555", borderColor: "#ff555533 #ff555511 #ff555511 #ff555533" }}>
                              ✕ Reject
                            </button>
                          </div>
                        )}
                      </div>
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
