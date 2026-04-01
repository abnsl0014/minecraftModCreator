"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { submitMod } from "@/lib/api";
import { isAuthenticated } from "@/lib/supabase";
import { CATEGORY_CONFIG, MATERIAL_ICONS, CraftingSlot } from "@/lib/exploreData";

const CATEGORIES = Object.entries(CATEGORY_CONFIG) as [string, { label: string; color: string; icon: string }][];
const MATERIALS = Object.entries(MATERIAL_ICONS).filter(([k]) => k !== "empty");

export default function SubmitModPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Basics
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("weapon");
  const [edition, setEdition] = useState<"java" | "bedrock">("bedrock");
  const [tags, setTags] = useState("");

  // Step 2: Media
  const [videoUrl, setVideoUrl] = useState("");
  const [survivalGuide, setSurvivalGuide] = useState("");
  const [recipe, setRecipe] = useState<(CraftingSlot | null)[]>(Array(9).fill(null));
  const [selectedMaterial, setSelectedMaterial] = useState("diamond");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);

  // Step 3: File
  const [modFile, setModFile] = useState<File | null>(null);

  function handleScreenshots(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - screenshots.length);
    const updated = [...screenshots, ...newFiles];
    setScreenshots(updated);

    const previews = [...screenshotPreviews];
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        previews.push(e.target?.result as string);
        setScreenshotPreviews([...previews]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeScreenshot(index: number) {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
    setScreenshotPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function setRecipeSlot(index: number) {
    const newRecipe = [...recipe];
    if (newRecipe[index]?.item === selectedMaterial) {
      newRecipe[index] = null;
    } else {
      newRecipe[index] = { item: selectedMaterial, icon: MATERIAL_ICONS[selectedMaterial] };
    }
    setRecipe(newRecipe);
  }

  async function handleSubmit() {
    const authed = await isAuthenticated();
    if (!authed) {
      setError("Please sign in to submit a mod");
      return;
    }
    if (!modFile) {
      setError("Please upload a mod file");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("edition", edition);
      formData.append("category", category);
      formData.append("tags", tags);
      if (videoUrl) formData.append("video_url", videoUrl);
      if (survivalGuide) formData.append("survival_guide", survivalGuide);

      const filledRecipe = recipe.filter(Boolean);
      if (filledRecipe.length > 0) {
        formData.append("crafting_recipe", JSON.stringify(recipe));
      }

      formData.append("mod_file", modFile);
      screenshots.forEach((file) => {
        formData.append("screenshots", file);
      });

      await submitMod(formData);
      router.push("/gallery/my-submissions?submitted=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  const canProceedStep1 = title.trim() && description.trim();
  const canProceedStep3 = !!modFile;

  return (
    <main className="min-h-screen px-4 py-8 pt-20">
      <Header />
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/gallery" className="text-[#808080] hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-[14px] text-[#d4a017]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Submit Your Mod
          </h1>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {["Basics", "Media & Recipe", "Upload & Review"].map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1 rounded ${i + 1 <= step ? "bg-[#d4a017]" : "bg-[#333]"}`} />
              <p className={`text-[7px] mt-1 ${i + 1 <= step ? "text-[#d4a017]" : "text-[#555]"}`}
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <div className="mc-panel p-3 mb-4 border-l-2 border-l-red-500">
            <p className="text-red-400 text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {error}
            </p>
          </div>
        )}

        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="mc-panel p-4 space-y-4">
            <div>
              <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Mod Name *
              </label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Dragon Slayer Sword Pack"
                className="w-full bg-[#111] border border-[#333] p-2 text-sm text-white rounded focus:border-[#d4a017] outline-none" />
            </div>
            <div>
              <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Description *
              </label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your mod, what it adds, how to use it..." rows={4}
                className="w-full bg-[#111] border border-[#333] p-2 text-sm text-white rounded focus:border-[#d4a017] outline-none resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#111] border border-[#333] p-2 text-sm text-white rounded focus:border-[#d4a017] outline-none">
                  {CATEGORIES.map(([key, { label, icon }]) => (
                    <option key={key} value={key}>{icon} {label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>Edition</label>
                <select value={edition} onChange={(e) => setEdition(e.target.value as "java" | "bedrock")}
                  className="w-full bg-[#111] border border-[#333] p-2 text-sm text-white rounded focus:border-[#d4a017] outline-none">
                  <option value="bedrock">Bedrock</option>
                  <option value="java">Java</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>Tags (comma separated)</label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. weapons, dragon, fantasy"
                className="w-full bg-[#111] border border-[#333] p-2 text-sm text-white rounded focus:border-[#d4a017] outline-none" />
            </div>
            <button onClick={() => setStep(2)} disabled={!canProceedStep1}
              className="mc-btn w-full py-2 text-[10px] disabled:opacity-50" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Next: Media & Recipe →
            </button>
          </div>
        )}

        {/* Step 2: Media & Recipe */}
        {step === 2 && (
          <div className="mc-panel p-4 space-y-4">
            <div>
              <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>Screenshots (up to 5)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {screenshotPreviews.map((preview, i) => (
                  <div key={i} className="relative w-20 h-20 border border-[#333] rounded overflow-hidden">
                    <img src={preview} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => removeScreenshot(i)}
                      className="absolute top-0 right-0 bg-red-600 text-white w-4 h-4 text-[8px] flex items-center justify-center">×</button>
                  </div>
                ))}
                {screenshots.length < 5 && (
                  <button onClick={() => screenshotInputRef.current?.click()}
                    className="w-20 h-20 border border-dashed border-[#555] rounded flex items-center justify-center text-[#555] hover:border-[#d4a017] hover:text-[#d4a017]">
                    <span className="text-xl">+</span>
                  </button>
                )}
              </div>
              <input ref={screenshotInputRef} type="file" accept="image/*" multiple
                onChange={(e) => handleScreenshots(e.target.files)} className="hidden" />
            </div>
            <div>
              <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>Video URL (YouTube)</label>
              <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full bg-[#111] border border-[#333] p-2 text-sm text-white rounded focus:border-[#d4a017] outline-none" />
            </div>
            <div>
              <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>Crafting Recipe</label>
              <div className="flex gap-4">
                <div className="grid grid-cols-3 gap-1">
                  {recipe.map((slot, i) => (
                    <button key={i} onClick={() => setRecipeSlot(i)}
                      className="w-10 h-10 bg-[#111] border border-[#333] flex items-center justify-center text-lg hover:border-[#d4a017]">
                      {slot?.icon || ""}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 content-start">
                  {MATERIALS.map(([key, icon]) => (
                    <button key={key} onClick={() => setSelectedMaterial(key)}
                      className={`w-8 h-8 text-sm border flex items-center justify-center ${selectedMaterial === key ? "border-[#d4a017] bg-[#2a2000]" : "border-[#333] bg-[#111]"}`}
                      title={key}>{icon}</button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>Survival Guide</label>
              <textarea value={survivalGuide} onChange={(e) => setSurvivalGuide(e.target.value)}
                placeholder="How to get/craft this mod's items in survival mode..." rows={3}
                className="w-full bg-[#111] border border-[#333] p-2 text-sm text-white rounded focus:border-[#d4a017] outline-none resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="mc-btn flex-1 py-2 text-[10px] bg-[#333]" style={{ fontFamily: "var(--font-pixel), monospace" }}>← Back</button>
              <button onClick={() => setStep(3)} className="mc-btn flex-1 py-2 text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>Next: Upload →</button>
            </div>
          </div>
        )}

        {/* Step 3: Upload & Review */}
        {step === 3 && (
          <div className="mc-panel p-4 space-y-4">
            <div>
              <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Mod File * (.zip, .jar, .mcaddon, .mcpack)
              </label>
              <div onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#333] rounded p-6 text-center cursor-pointer hover:border-[#d4a017]">
                {modFile ? (
                  <p className="text-[#d4a017] text-sm">{modFile.name} ({(modFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                ) : (
                  <p className="text-[#555] text-sm">Click to select mod file</p>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".zip,.jar,.mcaddon,.mcpack"
                onChange={(e) => setModFile(e.target.files?.[0] || null)} className="hidden" />
            </div>
            <div className="space-y-2 text-sm">
              <h3 className="text-[10px] text-[#d4a017]" style={{ fontFamily: "var(--font-pixel), monospace" }}>Review</h3>
              <div className="grid grid-cols-2 gap-2 text-[#808080]">
                <span>Title:</span><span className="text-white">{title}</span>
                <span>Category:</span><span className="text-white">{CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]?.label}</span>
                <span>Edition:</span><span className="text-white capitalize">{edition}</span>
                <span>Screenshots:</span><span className="text-white">{screenshots.length}</span>
                <span>Video:</span><span className="text-white">{videoUrl ? "Yes" : "No"}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="mc-btn flex-1 py-2 text-[10px] bg-[#333]" style={{ fontFamily: "var(--font-pixel), monospace" }}>← Back</button>
              <button onClick={handleSubmit} disabled={!canProceedStep3 || loading}
                className="mc-btn flex-1 py-2 text-[10px] disabled:opacity-50" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {loading ? "Submitting..." : "Submit for Review"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
