"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";

const FONT = { fontFamily: "var(--font-pixel), monospace" } as const;

type Tab = "bedrock" | "java-forge" | "java-fabric";

const GUIDES: Record<Tab, { title: string; steps: { title: string; detail: string }[] }> = {
  bedrock: {
    title: "Bedrock Edition (.mcaddon)",
    steps: [
      {
        title: "1. Download the .mcaddon file",
        detail: "After your mod is generated, click the Download button on the status page. The file will be saved as a .mcaddon file.",
      },
      {
        title: "2. Open the file",
        detail: "On mobile (iOS/Android): Tap the downloaded .mcaddon file. Minecraft will automatically open and import the addon.\n\nOn Windows 10/11: Double-click the .mcaddon file. Minecraft should launch and show \"Import started...\" followed by \"Import successful!\"",
      },
      {
        title: "3. Activate in your world",
        detail: "Open Minecraft > Settings > Create New World (or edit existing) > Behavior Packs > Find your mod > Activate it. Also check Resource Packs if the mod includes textures.",
      },
      {
        title: "4. Play!",
        detail: "Create or enter the world. Your custom items and blocks will be available. Use the /give command to get items: /give @s modid:item_name",
      },
    ],
  },
  "java-forge": {
    title: "Java Edition — Forge (.jar)",
    steps: [
      {
        title: "1. Install Java 17",
        detail: "Download and install Java 17 (JDK) from adoptium.net if you don't have it. Minecraft 1.20.1 requires Java 17.",
      },
      {
        title: "2. Install Minecraft Forge",
        detail: "Go to files.minecraftforge.net and download the installer for Minecraft 1.20.1 (version 47.2.0). Run the installer and select \"Install Client\".",
      },
      {
        title: "3. Find your mods folder",
        detail: "Windows: Press Win+R, type %appdata%/.minecraft/mods and press Enter.\nmacOS: ~/Library/Application Support/minecraft/mods\nLinux: ~/.minecraft/mods\n\nCreate the \"mods\" folder if it doesn't exist.",
      },
      {
        title: "4. Drop the .jar file",
        detail: "Copy the downloaded .jar file from ModCrafter into the mods folder.",
      },
      {
        title: "5. Launch with Forge",
        detail: "Open the Minecraft Launcher. Select the \"Forge\" profile from the dropdown (bottom-left). Click Play. Your mod will be loaded automatically.",
      },
    ],
  },
  "java-fabric": {
    title: "Java Edition — Fabric (.jar)",
    steps: [
      {
        title: "1. Install Java 17",
        detail: "Download and install Java 17 (JDK) from adoptium.net if you don't have it.",
      },
      {
        title: "2. Install Fabric Loader",
        detail: "Go to fabricmc.net/use/installer and download the Fabric Installer. Run it, select Minecraft 1.20.1, and click Install.",
      },
      {
        title: "3. Install Fabric API",
        detail: "Download the Fabric API mod from modrinth.com/mod/fabric-api (pick the version for 1.20.1). Drop it in your mods folder.",
      },
      {
        title: "4. Find your mods folder",
        detail: "Same as Forge: %appdata%/.minecraft/mods on Windows, ~/Library/Application Support/minecraft/mods on macOS, ~/.minecraft/mods on Linux.",
      },
      {
        title: "5. Drop the .jar file and play",
        detail: "Copy the mod .jar into the mods folder. Launch Minecraft with the \"Fabric Loader\" profile. Your mod is ready!",
      },
    ],
  },
};

export default function GuidePage() {
  const [tab, setTab] = useState<Tab>("bedrock");
  const guide = GUIDES[tab];

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 pb-16 px-4">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Link href="/" className="text-[#808080] hover:text-white" style={{ transition: "none" }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-[16px] text-[#d4a017]" style={FONT}>
                Install Guide
              </h1>
              <p className="text-[8px] text-[#555] mt-1" style={FONT}>
                How to install your generated mods
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex mc-panel p-1 mb-8 w-fit">
            {([
              { key: "bedrock" as Tab, label: "Bedrock" },
              { key: "java-forge" as Tab, label: "Java (Forge)" },
              { key: "java-fabric" as Tab, label: "Java (Fabric)" },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-[9px] ${
                  tab === t.key
                    ? "bg-[#3d3d3d] text-[#d4a017]"
                    : "text-[#555] hover:text-[#808080]"
                }`}
                style={{ ...FONT, transition: "none" }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Guide content */}
          <h2 className="text-[12px] text-[#d4a017] mb-6" style={FONT}>
            {guide.title}
          </h2>

          <div className="space-y-4">
            {guide.steps.map((step, i) => (
              <div key={i} className="mc-panel p-5">
                <h3 className="text-[10px] text-[#c0c0c0] mb-3" style={FONT}>
                  {step.title}
                </h3>
                <p className="text-[9px] text-[#808080] leading-relaxed whitespace-pre-line" style={FONT}>
                  {step.detail}
                </p>
              </div>
            ))}
          </div>

          {/* Helpful links */}
          <div className="mc-panel p-5 mt-8">
            <h3 className="text-[10px] text-[#d4a017] mb-3" style={FONT}>
              Helpful Links
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="https://adoptium.net/" target="_blank" rel="noopener noreferrer"
                  className="text-[9px] text-[#5555ff] hover:text-[#8888ff]" style={FONT}>
                  Java 17 (Adoptium) &#8594;
                </a>
              </li>
              <li>
                <a href="https://files.minecraftforge.net/net/minecraftforge/forge/" target="_blank" rel="noopener noreferrer"
                  className="text-[9px] text-[#5555ff] hover:text-[#8888ff]" style={FONT}>
                  Minecraft Forge Downloads &#8594;
                </a>
              </li>
              <li>
                <a href="https://fabricmc.net/use/installer/" target="_blank" rel="noopener noreferrer"
                  className="text-[9px] text-[#5555ff] hover:text-[#8888ff]" style={FONT}>
                  Fabric Installer &#8594;
                </a>
              </li>
              <li>
                <a href="https://modrinth.com/mod/fabric-api" target="_blank" rel="noopener noreferrer"
                  className="text-[9px] text-[#5555ff] hover:text-[#8888ff]" style={FONT}>
                  Fabric API (Modrinth) &#8594;
                </a>
              </li>
            </ul>
          </div>

        </div>
      </main>
    </>
  );
}
