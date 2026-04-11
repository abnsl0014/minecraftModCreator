"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ItemData } from "@/lib/dummyResponses";
import { generateMod, getStatus, editMod, TexturePreviews, JobStatus } from "@/lib/api";
import LootReveal from "@/components/LootReveal";
import SignupModal from "@/components/SignupModal";
import { supabase } from "@/lib/supabase";
import PixelEmoji from "@/components/PixelEmoji";

type MessageRole = "user" | "ai" | "generation-started" | "generation-complete" | "generation-failed";

interface Message {
  role: MessageRole;
  text: string;
  items?: ItemData[];
  jobId?: string;
  downloadUrl?: string;
  modelUsed?: string;
  texturePreviews?: TexturePreviews;
  edition?: "java" | "bedrock";
}

const CATEGORY_COLORS: Record<string, string> = {
  weapon: "#ff5555",
  tool: "#ffaa00",
  armor: "#5555ff",
  food: "#55ff55",
  block: "#aa55ff",
};

const CREATE_CATEGORIES = [
  { id: "items", label: "Items or Blocks", icon: "\u2694", description: "Weapons, tools, armor, food, blocks" },
  { id: "skins", label: "Custom Skins", icon: "\uD83D\uDC64", description: "Player skins and texture packs", href: "/create/skins" },
  { id: "structures", label: "Structures", icon: "\uD83C\uDFF0", description: "Buildings and world generation", isNew: true },
];

const MODEL_OPTIONS = [
  { id: "gpt-oss-120b", label: "GPT-OSS 120B", color: "#00ff88", disabled: false },
  { id: "sonnet-4.6", label: "Sonnet 4.6", color: "#8b5cf6", disabled: true },
];

type Stage = "parsing" | "generating" | "packaging" | "complete" | "failed";

const STAGE_ORDER: Stage[] = ["parsing", "generating", "packaging", "complete"];
const STAGE_LABELS: Record<Stage, string> = {
  parsing: "Parsing your request",
  generating: "Generating mod code",
  packaging: "Packaging files",
  complete: "Done",
  failed: "Failed",
};

interface LiveStatus {
  jobId: string;
  stage: Stage;
  progressMessage: string;
  error?: string;
}

function notifyTokensChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mc-tokens-updated"));
  }
}

function ItemCard({ item }: { item: ItemData }) {
  return (
    <div className="mc-panel p-3 flex gap-3" style={{ borderLeftColor: CATEGORY_COLORS[item.category], borderLeftWidth: "4px" }}>
      <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-[#111]">
        <PixelEmoji emoji={item.icon} size={28} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#d4a017] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {item.name}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1">
          {Object.entries(item.stats).map(([key, val]) => (
            <span key={key} className="text-[8px] text-[#c0c0c0]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              <span className="text-[#808080]">{key}:</span> {val}
            </span>
          ))}
        </div>
        <p className="text-[8px] text-[#808080]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {item.description}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="mc-panel inline-block px-4 py-2">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  );
}

function ProgressCard({ live }: { live: LiveStatus }) {
  const currentIndex = STAGE_ORDER.indexOf(live.stage);
  return (
    <div className="mc-panel p-4">
      <p className="text-[10px] text-[#d4a017] mb-3" style={{ fontFamily: "var(--font-pixel), monospace" }}>
        Building your mod
      </p>
      <div className="space-y-2 mb-4">
        {STAGE_ORDER.map((stage, idx) => {
          const done = idx < currentIndex || live.stage === "complete";
          const active = idx === currentIndex && live.stage !== "complete";
          const color = done ? "#55ff55" : active ? "#d4a017" : "#555";
          const marker = done ? "\u2713" : active ? "\u25B6" : "\u25CB";
          return (
            <div key={stage} className="flex items-center gap-3">
              <span className="text-[10px]" style={{ color, fontFamily: "var(--font-pixel), monospace" }}>
                {marker}
              </span>
              <span className="text-[9px]" style={{ color, fontFamily: "var(--font-pixel), monospace" }}>
                {STAGE_LABELS[stage]}
              </span>
              {active && (
                <span className="inline-flex ml-auto">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
              )}
            </div>
          );
        })}
      </div>
      {live.progressMessage && (
        <p className="text-[8px] text-[#808080] whitespace-pre-line" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {live.progressMessage}
        </p>
      )}
    </div>
  );
}

export default function ChatInterface({ initialPrompt }: { initialPrompt?: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [modName, setModName] = useState("My Custom Mod");
  const [toastVisible, setToastVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "preview">("chat");
  const hasSubmittedInitial = useRef(false);
  const [showSignup, setShowSignup] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("items");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt-oss-120b");
  // The most recent successfully-generated job id. When set, subsequent chat
  // messages are routed through /api/edit/{jobId} instead of creating a new mod.
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  // Live status for the currently-running generation or edit, surfaced in the
  // preview pane so the user sees stage-by-stage progress instead of an empty panel.
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("mc_model_preference");
    if (saved) setSelectedModel(saved);
  }, []);

  function handleModelChange(modelId: string) {
    setSelectedModel(modelId);
    localStorage.setItem("mc_model_preference", modelId);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setAuthChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
      setAuthChecked(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    }
    if (categoryDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [categoryDropdownOpen]);

  const allItems = messages.filter((m) => m.role === "ai" && m.items).flatMap((m) => m.items!);

  async function pollJob(jobId: string, kind: "generate" | "edit") {
    const startedText = kind === "edit" ? "Applying your edit..." : "Starting mod generation...";
    const successText = kind === "edit" ? "Edit applied!" : "Your mod is ready!";
    const failPrefix = kind === "edit" ? "Edit failed" : "Generation failed";

    setMessages((prev) => [
      ...prev,
      {
        role: "generation-started" as MessageRole,
        text: startedText,
        jobId,
      },
    ]);
    setLiveStatus({ jobId, stage: "parsing", progressMessage: startedText });

    const maxPolls = 120;
    let finalStatus: JobStatus | null = null;
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      let status: JobStatus;
      try {
        status = await getStatus(jobId);
      } catch {
        continue;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.jobId === jobId && m.role === "generation-started"
            ? { ...m, text: status.progress_message || "Working..." }
            : m
        )
      );
      setLiveStatus({
        jobId,
        stage: status.status as Stage,
        progressMessage: status.progress_message || "Working...",
        error: status.error || undefined,
      });

      if (status.status === "complete" || status.status === "failed") {
        finalStatus = status;
        break;
      }
    }

    if (!finalStatus) {
      setMessages((prev) =>
        prev.map((m) =>
          m.jobId === jobId && m.role === "generation-started"
            ? {
                role: "generation-failed" as MessageRole,
                text: `${failPrefix}: timed out. Try again.`,
                jobId,
              }
            : m
        )
      );
      setLiveStatus(null);
      notifyTokensChanged();
      return;
    }

    if (finalStatus.status === "complete") {
      setMessages((prev) =>
        prev.map((m) =>
          m.jobId === jobId && m.role === "generation-started"
            ? {
                role: "generation-complete" as MessageRole,
                text: successText,
                jobId,
                downloadUrl: finalStatus!.jar_url || undefined,
                modelUsed: finalStatus!.model_used,
                texturePreviews: finalStatus!.texture_previews || undefined,
                edition: finalStatus!.edition,
              }
            : m
        )
      );
      setCurrentJobId(jobId);
      setLiveStatus(null);
    } else {
      setMessages((prev) =>
        prev.map((m) =>
          m.jobId === jobId && m.role === "generation-started"
            ? {
                role: "generation-failed" as MessageRole,
                text: finalStatus!.error || `${failPrefix}. Try again.`,
                jobId,
              }
            : m
        )
      );
      setLiveStatus(null);
    }
    notifyTokensChanged();
  }

  async function submitPrompt(text: string) {
    if (!text.trim() || typing) return;

    const userMsg: Message = { role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    try {
      if (currentJobId) {
        // Follow-up message — edit the existing mod rather than create a new one.
        await editMod(currentJobId, text.trim());
        await pollJob(currentJobId, "edit");
      } else {
        const model = localStorage.getItem("mc_model_preference") || "gpt-oss-120b";
        const { job_id } = await generateMod(text.trim(), undefined, undefined, "java", undefined, model);
        await pollJob(job_id, "generate");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start generation";
      setMessages((prev) => [
        ...prev,
        {
          role: "generation-failed" as MessageRole,
          text: message,
        },
      ]);
      setLiveStatus(null);
      notifyTokensChanged();
    } finally {
      setTyping(false);
    }
  }

  function startNewMod() {
    setCurrentJobId(null);
    setMessages([]);
    setLiveStatus(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authChecked) return;
    if (!authed) {
      setShowSignup(true);
      return;
    }
    submitPrompt(input);
  }

  function handleInputFocus() {
    if (authChecked && !authed) {
      setShowSignup(true);
    }
  }

  useEffect(() => {
    if (initialPrompt && !hasSubmittedInitial.current) {
      hasSubmittedInitial.current = true;
      submitPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function handleGenerate() {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  }

  function renderMessage(msg: Message, i: number) {
    if (msg.role === "generation-started") {
      return (
        <div key={i} className="flex justify-start">
          <div className="max-w-[85%] bg-[#1a1a2e] border border-[#00ff88]/30 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-[#00ff88] border-t-transparent rounded-full" />
              <span className="text-[9px] text-[#00ff88]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {msg.text}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (msg.role === "generation-complete") {
      return (
        <div key={i} className="flex justify-start">
          <div className="max-w-[95%] w-full bg-[#1a1a2e] border border-[#00ff88]/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-[#00ff88] font-semibold" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {msg.text}
              </span>
              {msg.modelUsed && (
                <span
                  className={`text-[8px] px-2 py-0.5 ${
                    msg.modelUsed === "sonnet-4.6"
                      ? "bg-[#8b5cf6]/20 text-[#8b5cf6]"
                      : "bg-[#00ff88]/20 text-[#00ff88]"
                  }`}
                  style={{ fontFamily: "var(--font-pixel), monospace" }}
                >
                  {msg.modelUsed === "sonnet-4.6" ? "Sonnet 4.6" : "GPT-OSS 120B"}
                </span>
              )}
            </div>

            {/* Loot Reveal with textures */}
            {msg.texturePreviews && msg.jobId ? (
              <LootReveal
                previews={msg.texturePreviews}
                jobId={msg.jobId}
                downloadUrl={msg.downloadUrl}
                edition={msg.edition || "java"}
                onEditStarted={() => {
                  // LootReveal has already POSTed /api/edit for us; just poll.
                  const id = msg.jobId!;
                  setTyping(true);
                  pollJob(id, "edit").finally(() => setTyping(false));
                }}
              />
            ) : (
              /* Fallback if no textures (older jobs) */
              msg.downloadUrl && (
                <a
                  href={msg.downloadUrl}
                  className="inline-block mt-1 mc-btn px-4 py-2 text-[9px] text-[#55ff55]"
                  style={{ fontFamily: "var(--font-pixel), monospace" }}
                >
                  Download Mod
                </a>
              )
            )}
          </div>
        </div>
      );
    }

    if (msg.role === "generation-failed") {
      return (
        <div key={i} className="flex justify-start">
          <div className="max-w-[85%] bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <p className="text-[9px] text-red-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {msg.text}
            </p>
          </div>
        </div>
      );
    }

    // Default: user or ai messages
    return (
      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[85%] ${msg.role === "user" ? "mc-panel-inset" : "mc-panel"} px-3 py-2`}>
          <p className="text-[9px] text-[#c0c0c0]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {msg.text}
          </p>
        </div>
      </div>
    );
  }

  const currentCategory = CREATE_CATEGORIES.find((c) => c.id === selectedCategory) || CREATE_CATEGORIES[0];
  const currentModel = MODEL_OPTIONS.find((m) => m.id === selectedModel) || MODEL_OPTIONS[0];

  const chatPane = (
    <div className="flex flex-col h-full">
      {/* Category Dropdown */}
      <div className="p-3 border-b-[3px]" style={{ borderColor: "#3d3d3d" }}>
        <div className="mc-dropdown" ref={dropdownRef}>
          <button
            onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
            className="mc-panel w-full px-4 py-3 flex items-center justify-between text-left"
            style={{ fontFamily: "var(--font-pixel), monospace" }}
          >
            <div className="flex items-center gap-3">
              <PixelEmoji emoji={currentCategory.icon} size={20} resolution={8} />
              <div>
                <span className="text-[10px] text-[#d4a017]">
                  Craft {currentCategory.label}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-[#808080]">{categoryDropdownOpen ? "\u25B2" : "\u25BC"}</span>
          </button>

          {categoryDropdownOpen && (
            <div className="mc-dropdown-menu">
              {CREATE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className="mc-dropdown-item w-full text-left"
                  onClick={() => {
                    if (cat.href) {
                      router.push(cat.href);
                    } else {
                      setSelectedCategory(cat.id);
                    }
                    setCategoryDropdownOpen(false);
                  }}
                >
                  <PixelEmoji emoji={cat.icon} size={20} resolution={8} />
                  <div className="flex-1">
                    <span className="text-[10px]">{cat.label}</span>
                    {cat.isNew && (
                      <span className="mc-badge-new ml-2">NEW!</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: "#3d3d3d #111" }}>
        {messages.length === 0 && !typing && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-[12px] text-[#d4a017] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              AI Mod Assistant
            </p>
            <p className="text-[8px] text-[#808080] max-w-[280px] mb-6" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Describe what you want and I&apos;ll generate a working Minecraft mod for you.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-[280px]">
              {[
                "Diamond sword that shoots fireballs",
                "Ruby armor set with fire resistance",
                "Emerald pickaxe that auto-smelts ores",
                "Magic food that gives speed and jump boost",
                "Netherite helmet with night vision",
                "Glowing neon blocks in 8 colors",
                "TNT bow that explodes on impact",
                "Golden apple that gives regeneration",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { if (!authChecked) return; if (authed) submitPrompt(suggestion); else setShowSignup(true); }}
                  className="mc-panel px-3 py-2 text-left text-[8px] text-[#c0c0c0] hover:text-[#d4a017] hover:border-[#d4a017]"
                  style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}
                >
                  &quot;{suggestion}&quot;
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => renderMessage(msg, i))}
        {typing && (
          <div className="flex justify-start">
            <TypingIndicator />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t-[3px]" style={{ borderColor: "#3d3d3d" }}>
        {/* Model Toggle */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[8px] text-[#808080]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Model:
          </span>
          {MODEL_OPTIONS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => !m.disabled && handleModelChange(m.id)}
              disabled={m.disabled}
              title={m.disabled ? "Coming soon" : undefined}
              className={`relative text-[8px] px-2 py-1 rounded border transition ${
                m.disabled
                  ? "border-[#3d3d3d] opacity-40 cursor-not-allowed"
                  : selectedModel === m.id
                  ? "border-current opacity-100"
                  : "border-[#3d3d3d] opacity-50 hover:opacity-75"
              }`}
              style={{
                fontFamily: "var(--font-pixel), monospace",
                color: m.color,
              }}
            >
              {m.label}
              {m.disabled && (
                <span
                  className="absolute -top-1.5 -right-1.5 px-1 py-0.5 rounded bg-[#d4a017] text-black text-[6px] font-bold"
                  style={{ fontFamily: "var(--font-pixel), monospace" }}
                >
                  SOON
                </span>
              )}
            </button>
          ))}
          <span className="text-[7px] text-[#555] ml-auto" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            1 token/mod
          </span>
        </div>
        <div className="mc-panel-inset flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={handleInputFocus}
            placeholder="Describe items, weapons, armor..."
            className="flex-1 bg-transparent px-3 py-2 text-[9px] text-[#c0c0c0] focus:outline-none placeholder-[#555]"
            style={{ fontFamily: "var(--font-pixel), monospace" }}
            disabled={typing}
            readOnly={authChecked && !authed}
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            className="mc-btn px-3 py-1.5 m-1 text-[10px]"
          >
            &gt;
          </button>
        </div>
      </form>
    </div>
  );

  const previewPane = (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: "thin", scrollbarColor: "#3d3d3d #111" }}>
        <div className="flex items-center gap-3 mb-2">
          <input
            type="text"
            value={modName}
            onChange={(e) => setModName(e.target.value)}
            className="bg-transparent text-[12px] text-[#d4a017] focus:outline-none focus:border-b-2 focus:border-[#d4a017] flex-1"
            style={{ fontFamily: "var(--font-pixel), monospace" }}
          />
          <span className="text-[8px] px-2 py-1 bg-[#5555ff]/20 text-[#5555ff] border border-[#5555ff]/40"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Bedrock
          </span>
          {currentJobId && (
            <button
              type="button"
              onClick={startNewMod}
              className="text-[8px] px-2 py-1 border border-[#3d3d3d] text-[#808080] hover:text-[#d4a017] hover:border-[#d4a017]"
              style={{ fontFamily: "var(--font-pixel), monospace", transition: "none" }}
              title="Discard this mod and start a new conversation"
            >
              + New mod
            </button>
          )}
        </div>

        {liveStatus && liveStatus.stage !== "failed" ? (
          <ProgressCard live={liveStatus} />
        ) : allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[20px] mb-3 opacity-30">{"\u{1F4E6}"}</p>
            <p className="text-[9px] text-[#808080]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Items will appear here as you describe your mod.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[8px] text-[#808080]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {allItems.length} {allItems.length === 1 ? "item" : "items"}
            </p>
            <div className="grid grid-cols-1 gap-3">
              {allItems.map((item, i) => (
                <ItemCard key={i} item={item} />
              ))}
            </div>
          </>
        )}
      </div>

      {allItems.length > 0 && (
        <div className="p-4 border-t-[3px]" style={{ borderColor: "#3d3d3d" }}>
          <button onClick={handleGenerate} className="mc-btn w-full py-3 text-[10px]"
            style={{ color: "#d4a017" }}>
            Generate Add-On ({allItems.length} {allItems.length === 1 ? "item" : "items"})
          </button>
          <p className="text-[7px] text-[#555] text-center mt-2"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Not happy? Keep chatting to refine your mod.
          </p>
        </div>
      )}

      {toastVisible && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 mc-panel px-4 py-2 border-l-4 border-l-[#55ff55] z-50">
          <p className="text-[8px] text-[#55ff55]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Add-on generated! Download starting...
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      <SignupModal
        open={showSignup}
        onClose={() => setShowSignup(false)}
        onSignup={() => {
          setShowSignup(false);
          router.push("/builder");
        }}
      />

      <div className="md:hidden flex border-b-[3px]" style={{ borderColor: "#3d3d3d" }}>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-2 text-[10px] text-center ${activeTab === "chat" ? "text-[#d4a017] bg-[#1a1a1a]" : "text-[#808080]"}`}
          style={{ fontFamily: "var(--font-pixel), monospace" }}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`flex-1 py-2 text-[10px] text-center ${activeTab === "preview" ? "text-[#d4a017] bg-[#1a1a1a]" : "text-[#808080]"}`}
          style={{ fontFamily: "var(--font-pixel), monospace" }}
        >
          Preview {allItems.length > 0 && `(${allItems.length})`}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`md:w-[40%] md:border-r-[3px] md:block ${activeTab === "chat" ? "block" : "hidden"} w-full`}
          style={{ borderColor: "#3d3d3d" }}>
          {chatPane}
        </div>
        <div className={`md:w-[60%] md:block ${activeTab === "preview" ? "block" : "hidden"} w-full relative bg-[#111]`}>
          {previewPane}
        </div>
      </div>
    </div>
  );
}
