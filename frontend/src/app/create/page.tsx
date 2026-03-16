"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Header from "@/components/Header";
import ChatInterface from "@/components/ChatInterface";

function CreateContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt") || undefined;

  return <ChatInterface initialPrompt={initialPrompt} />;
}

export default function CreatePage() {
  return (
    <>
      <Header />
      <main className="pt-14">
        <Suspense fallback={
          <div className="h-[calc(100vh-56px)] flex items-center justify-center">
            <p className="text-[10px] text-[#808080]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Loading...<span className="mc-blink">_</span>
            </p>
          </div>
        }>
          <CreateContent />
        </Suspense>
      </main>
    </>
  );
}
