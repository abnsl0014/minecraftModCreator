import Header from "@/components/Header";
import ModForm from "@/components/ModForm";

export default function BuilderPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 px-4 pb-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-[20px] text-[#d4a017] mb-2 text-center"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Mod Builder
          </h1>
          <p className="text-[10px] text-[#808080] mb-8 text-center"
            style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Quick create or build piece by piece.
          </p>
          <ModForm />
        </div>
      </main>
    </>
  );
}
