import Link from "next/link";
import ModForm from "@/components/ModForm";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8">
      {/* Nav */}
      <nav className="w-full max-w-3xl flex items-center justify-between mb-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            M
          </div>
          <span className="font-semibold text-white">ModCreator</span>
        </div>
        <Link
          href="/gallery"
          className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Browse Mods
        </Link>
      </nav>

      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
          Minecraft Mod Creator
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Create custom mods with AI-generated pixel art textures.
          Describe your mod or build it piece by piece.
        </p>
      </div>

      <ModForm />

      <footer className="mt-16 text-center text-sm text-gray-600">
        <p>Java Edition (.jar) &middot; Bedrock Edition (.mcaddon) &middot; AI Pixel Art Textures</p>
      </footer>
    </main>
  );
}
