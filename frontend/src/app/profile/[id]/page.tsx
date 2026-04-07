"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { getPublicProfile, PublicProfile } from "@/lib/api";
import { CATEGORY_CONFIG } from "@/lib/exploreData";

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.id as string;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPublicProfile(userId);
        setProfile(data);
      } catch {
        setError("Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

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

  if (!profile) {
    return (
      <main className="min-h-screen px-4 py-8 pt-20">
        <Header />
        <div className="max-w-3xl mx-auto mc-panel p-8 text-center">
          <p className="text-red-400 text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>{error || "User not found"}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 pt-20">
      <Header />
      <div className="max-w-3xl mx-auto">
        <div className="mc-panel p-5 mb-6">
          <h1 className="text-[16px] text-[#d4a017] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {profile.display_name}
          </h1>
          <div className="flex gap-6 text-[9px] mt-3" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            <div>
              <span className="text-[#d4a017] text-[14px]">{profile.total_mods}</span>
              <span className="text-[#555] ml-1">Mods</span>
            </div>
            <div>
              <span className="text-[#d4a017] text-[14px]">{profile.total_downloads}</span>
              <span className="text-[#555] ml-1">Downloads</span>
            </div>
            <div className="text-[#555]">
              Joined {new Date(profile.joined_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {profile.mods.length === 0 ? (
          <div className="mc-panel p-8 text-center">
            <p className="text-[#555] text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              No published mods yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile.mods.map((mod) => {
              const catConfig = CATEGORY_CONFIG[mod.category as keyof typeof CATEGORY_CONFIG];
              return (
                <Link key={mod.id} href={`/gallery/${mod.id}`} className="mc-panel p-4 hover:border-[#d4a017] block">
                  {mod.screenshots[0] && (
                    <img src={mod.screenshots[0]} alt="" className="w-full h-32 object-cover rounded border border-[#333] mb-2" />
                  )}
                  <h3 className="text-[10px] text-white mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    {mod.title}
                  </h3>
                  <div className="flex gap-2 text-[7px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    <span style={{ color: catConfig?.color }}>{catConfig?.icon} {catConfig?.label}</span>
                    <span className="text-[#555]">{mod.download_count} downloads</span>
                    {mod.featured && <span className="text-[#d4a017]">★</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
