import type { Metadata } from "next";
import { Press_Start_2P, VT323, Silkscreen } from "next/font/google";
import "./globals.css";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel-body",
});

const silkscreen = Silkscreen({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-pixel-alt",
});

export const metadata: Metadata = {
  title: "ModCrafter — Create Minecraft Mods with AI",
  description: "Create Minecraft mods with AI. Describe your mod and download a working .jar or .mcaddon instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${pixelFont.variable} ${vt323.variable} ${silkscreen.variable} bg-[#0a0a0a] text-[#c0c0c0] min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
