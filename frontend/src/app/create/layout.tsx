import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create - ModCrafter",
  description: "Create Minecraft mods through conversation",
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
