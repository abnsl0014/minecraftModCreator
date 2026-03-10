import ModForm from "@/components/ModForm";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
          Minecraft Mod Creator
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Describe your mod in plain English and we&apos;ll generate a working mod
          for Java or Bedrock Edition.
        </p>
      </div>

      <ModForm />

      <footer className="mt-16 text-center text-sm text-gray-600">
        <p>Java Edition (.jar) &middot; Bedrock Edition (.mcaddon) &middot; Items, Blocks &amp; Mobs</p>
      </footer>
    </main>
  );
}
