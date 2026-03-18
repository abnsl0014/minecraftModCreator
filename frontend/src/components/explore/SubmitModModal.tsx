"use client";

import { useState } from "react";
import { ModSubmission, CraftingSlot, CATEGORY_CONFIG, MATERIAL_ICONS, generateId, saveSubmission } from "@/lib/exploreData";

interface SubmitModModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

const CATEGORIES = Object.entries(CATEGORY_CONFIG) as [ModSubmission["category"], typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][];
const MATERIALS = Object.entries(MATERIAL_ICONS).filter(([k]) => k !== "empty");

export default function SubmitModModal({ open, onClose, onSubmitted }: SubmitModModalProps) {
  const [step, setStep] = useState(1); // 1: basics, 2: media + recipe, 3: review
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState<ModSubmission["category"]>("weapon");
  const [edition, setEdition] = useState<"java" | "bedrock">("bedrock");
  const [videoUrl, setVideoUrl] = useState("");
  const [survivalGuide, setSurvivalGuide] = useState("");
  const [tags, setTags] = useState("");
  const [recipe, setRecipe] = useState<(CraftingSlot | null)[]>(Array(9).fill(null));
  const [selectedMaterial, setSelectedMaterial] = useState<string>("diamond");
  const [submitted, setSubmitted] = useState(false);

  function setRecipeSlot(index: number) {
    const newRecipe = [...recipe];
    if (newRecipe[index]?.item === selectedMaterial) {
      // Toggle off
      newRecipe[index] = null;
    } else {
      newRecipe[index] = { item: selectedMaterial, icon: MATERIAL_ICONS[selectedMaterial] };
    }
    setRecipe(newRecipe);
  }

  function handleSubmit() {
    const submission: ModSubmission = {
      id: generateId(),
      name: name.trim(),
      description: description.trim(),
      author: author.trim() || "Anonymous",
      edition,
      category,
      thumbnail: null,
      videoUrl: videoUrl.trim(),
      screenshots: [],
      craftingRecipe: recipe,
      survivalGuide: survivalGuide.trim(),
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
    saveSubmission(submission);
    setSubmitted(true);
    setTimeout(() => {
      onSubmitted();
      resetForm();
    }, 2000);
  }

  function resetForm() {
    setStep(1);
    setName("");
    setDescription("");
    setAuthor("");
    setCategory("weapon");
    setEdition("bedrock");
    setVideoUrl("");
    setSurvivalGuide("");
    setTags("");
    setRecipe(Array(9).fill(null));
    setSubmitted(false);
  }

  if (!open) return null;

  const canProceedStep1 = name.trim().length > 0 && description.trim().length > 0;
  const canSubmit = canProceedStep1 && survivalGuide.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80" />

      <div className="relative mc-panel w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
          <h2 className="text-[12px] text-[#d4a017]"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Submit Your Mod
          </h2>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-[#808080] hover:text-white border border-[#3d3d3d]"
            style={{ transition: "none" }}>
            ✕
          </button>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a1a1a]">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 flex items-center justify-center text-[8px] border ${
                step >= s ? "bg-[#d4a017] text-[#0a0a0a] border-[#d4a017]" : "text-[#555] border-[#3d3d3d]"
              }`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${step > s ? "bg-[#d4a017]" : "bg-[#3d3d3d]"}`} />}
            </div>
          ))}
          <span className="text-[8px] text-[#555] ml-2"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {step === 1 ? "Basics" : step === 2 ? "Recipe & Media" : "Review"}
          </span>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="text-[32px] mb-4">✅</div>
            <p className="text-[10px] text-[#55ff55] mb-2"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Mod Submitted!
            </p>
            <p className="text-[8px] text-[#808080]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Awaiting approval. Check back soon.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Step 1: Basics */}
            {step === 1 && (
              <>
                <div>
                  <label className="block text-[8px] text-[#808080] mb-1.5"
                    style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    Mod Name *
                  </label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Thunder Blade"
                    className="w-full mc-panel-inset px-3 py-2 text-[10px] text-[#c0c0c0] bg-transparent focus:outline-none"
                    style={{ fontFamily: "var(--font-pixel), monospace" }} />
                </div>

                <div>
                  <label className="block text-[8px] text-[#808080] mb-1.5"
                    style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    Description *
                  </label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="What does your mod do? What makes it special?"
                    rows={3}
                    className="w-full mc-panel-inset px-3 py-2 text-[10px] text-[#c0c0c0] bg-transparent focus:outline-none resize-none"
                    style={{ fontFamily: "var(--font-pixel), monospace" }} />
                </div>

                <div>
                  <label className="block text-[8px] text-[#808080] mb-1.5"
                    style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    Your Name
                  </label>
                  <input type="text" value={author} onChange={e => setAuthor(e.target.value)}
                    placeholder="Anonymous"
                    className="w-full mc-panel-inset px-3 py-2 text-[10px] text-[#c0c0c0] bg-transparent focus:outline-none"
                    style={{ fontFamily: "var(--font-pixel), monospace" }} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] text-[#808080] mb-1.5"
                      style={{ fontFamily: "var(--font-pixel), monospace" }}>
                      Category
                    </label>
                    <div className="mc-panel-inset">
                      <select value={category} onChange={e => setCategory(e.target.value as ModSubmission["category"])}
                        className="w-full px-3 py-2 text-[10px] text-[#c0c0c0] bg-transparent focus:outline-none cursor-pointer"
                        style={{ fontFamily: "var(--font-pixel), monospace" }}>
                        {CATEGORIES.map(([key, config]) => (
                          <option key={key} value={key} style={{ background: "#111" }}>
                            {config.icon} {config.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[8px] text-[#808080] mb-1.5"
                      style={{ fontFamily: "var(--font-pixel), monospace" }}>
                      Edition
                    </label>
                    <div className="flex mc-panel-inset">
                      {(["bedrock", "java"] as const).map(e => (
                        <button key={e} type="button"
                          onClick={() => setEdition(e)}
                          className={`flex-1 px-3 py-2 text-[10px] capitalize ${
                            edition === e ? "bg-[#3d3d3d] text-white" : "text-[#555]"
                          }`}
                          style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] text-[#808080] mb-1.5"
                    style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    Tags (comma separated)
                  </label>
                  <input type="text" value={tags} onChange={e => setTags(e.target.value)}
                    placeholder="sword, lightning, combat"
                    className="w-full mc-panel-inset px-3 py-2 text-[10px] text-[#c0c0c0] bg-transparent focus:outline-none"
                    style={{ fontFamily: "var(--font-pixel), monospace" }} />
                </div>
              </>
            )}

            {/* Step 2: Recipe + Media */}
            {step === 2 && (
              <>
                {/* Crafting Recipe Builder */}
                <div>
                  <label className="block text-[8px] text-[#808080] mb-2"
                    style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    Crafting Recipe (click slots to place materials)
                  </label>

                  {/* Material palette */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {MATERIALS.map(([key, icon]) => (
                      <button key={key} type="button"
                        onClick={() => setSelectedMaterial(key)}
                        className={`w-8 h-8 flex items-center justify-center text-[14px] border ${
                          selectedMaterial === key
                            ? "border-[#d4a017] bg-[#d4a01722]"
                            : "border-[#2a2a2a] bg-[#111] hover:border-[#3d3d3d]"
                        }`}
                        title={key.replace(/_/g, " ")}
                        style={{ transition: "none" }}>
                        {icon}
                      </button>
                    ))}
                  </div>

                  {/* Recipe grid */}
                  <div className="mc-panel-inset inline-block p-2">
                    <div className="grid grid-cols-3 gap-1">
                      {recipe.map((slot, i) => (
                        <button key={i} type="button"
                          onClick={() => setRecipeSlot(i)}
                          className="w-12 h-12 bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[20px] hover:border-[#3d3d3d]"
                          style={{ transition: "none" }}>
                          {slot?.icon || ""}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="button" onClick={() => setRecipe(Array(9).fill(null))}
                    className="mt-2 text-[8px] text-[#555] hover:text-[#808080]"
                    style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}>
                    Clear recipe
                  </button>
                </div>

                {/* Video URL */}
                <div>
                  <label className="block text-[8px] text-[#808080] mb-1.5"
                    style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    Video URL (YouTube, etc.)
                  </label>
                  <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full mc-panel-inset px-3 py-2 text-[10px] text-[#c0c0c0] bg-transparent focus:outline-none"
                    style={{ fontFamily: "var(--font-pixel), monospace" }} />
                </div>

                {/* Survival guide */}
                <div>
                  <label className="block text-[8px] text-[#808080] mb-1.5"
                    style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    How to Get in Survival *
                  </label>
                  <textarea value={survivalGuide} onChange={e => setSurvivalGuide(e.target.value)}
                    placeholder="Explain where to find materials and how to craft this in survival mode..."
                    rows={3}
                    className="w-full mc-panel-inset px-3 py-2 text-[10px] text-[#c0c0c0] bg-transparent focus:outline-none resize-none"
                    style={{ fontFamily: "var(--font-pixel), monospace" }} />
                </div>

                {/* Screenshot upload placeholder */}
                <div>
                  <label className="block text-[8px] text-[#808080] mb-1.5"
                    style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    Screenshots
                  </label>
                  <div className="mc-panel-inset p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-[#151515]"
                    style={{ transition: "none" }}>
                    <span className="text-[20px] text-[#3d3d3d]">📷</span>
                    <span className="text-[8px] text-[#555]"
                      style={{ fontFamily: "var(--font-pixel), monospace" }}>
                      Drop images here or click to upload
                    </span>
                    <span className="text-[7px] text-[#3d3d3d]"
                      style={{ fontFamily: "var(--font-pixel), monospace" }}>
                      (Coming soon — backend needed)
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <>
                <div className="mc-panel-inset p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px]">{CATEGORY_CONFIG[category].icon}</span>
                    <h3 className="text-[11px] text-[#d4a017]"
                      style={{ fontFamily: "var(--font-pixel), monospace" }}>
                      {name}
                    </h3>
                  </div>
                  <p className="text-[8px] text-[#c0c0c0] leading-relaxed"
                    style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    {description}
                  </p>
                  <div className="flex flex-wrap gap-2 text-[8px]"
                    style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    <span className="text-[#808080]">by {author || "Anonymous"}</span>
                    <span style={{ color: CATEGORY_CONFIG[category].color }}>
                      {CATEGORY_CONFIG[category].label}
                    </span>
                    <span style={{ color: edition === "java" ? "#55ff55" : "#5555ff" }}>
                      {edition}
                    </span>
                  </div>

                  {recipe.some(s => s !== null) && (
                    <div>
                      <p className="text-[8px] text-[#808080] mb-2"
                        style={{ fontFamily: "var(--font-pixel), monospace" }}>
                        Crafting Recipe:
                      </p>
                      <div className="mc-panel-inset inline-block p-1.5">
                        <div className="grid grid-cols-3 gap-0.5">
                          {recipe.map((slot, i) => (
                            <div key={i} className="w-8 h-8 bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[14px]">
                              {slot?.icon || ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {survivalGuide && (
                    <div>
                      <p className="text-[8px] text-[#808080] mb-1"
                        style={{ fontFamily: "var(--font-pixel), monospace" }}>
                        Survival Guide:
                      </p>
                      <p className="text-[8px] text-[#c0c0c0]"
                        style={{ fontFamily: "var(--font-pixel), monospace" }}>
                        {survivalGuide}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mc-panel p-3 border-l-4 border-l-[#d4a017]">
                  <p className="text-[8px] text-[#808080]"
                    style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    Your mod will be reviewed before appearing on the Explore page. This usually takes less than 24 hours.
                  </p>
                </div>
              </>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-2">
              {step > 1 ? (
                <button type="button" onClick={() => setStep(step - 1)}
                  className="mc-btn px-4 py-2 text-[9px]"
                  style={{ color: "#808080" }}>
                  ← Back
                </button>
              ) : <div />}

              {step < 3 ? (
                <button type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && !canProceedStep1}
                  className="mc-btn px-4 py-2 text-[9px]">
                  Next →
                </button>
              ) : (
                <button type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="mc-btn px-6 py-2 text-[9px]"
                  style={{ background: "#d4a01722" }}>
                  Submit for Review
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
