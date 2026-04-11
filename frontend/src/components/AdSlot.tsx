"use client";

import AdBanner from "./AdBanner";
import AdsterraBanner from "./AdsterraBanner";

// Named placements across the app. Keep the set small — every slot should
// have a matching config in both Adsterra env vars and the AdSense slot map.
export type AdSlotName = "home-hero" | "gallery-feed" | "status-wait";

interface Props {
  slot: AdSlotName;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  className?: string;
}

// When Ezoic or AdSense is configured, render the AdSense markup (Ezoic
// intercepts AdSense ins tags automatically, so the same markup serves both).
// Otherwise fall back to Adsterra, keyed per slot via env var.
const HAS_EZOIC_OR_ADSENSE = !!(
  process.env.NEXT_PUBLIC_EZOIC_SITE_ID ||
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
);

// Each slot can be backed by a different Adsterra zone. Native for feed-style
// placements (gallery), banner for everything else.
interface AdsterraConfig {
  key: string | undefined;
  scriptUrl: string | undefined;
  format: "banner" | "native";
  width?: number;
  height?: number;
}

function adsterraConfigFor(slot: AdSlotName): AdsterraConfig {
  const bannerKey = process.env.NEXT_PUBLIC_ADSTERRA_BANNER_KEY;
  const bannerScript = process.env.NEXT_PUBLIC_ADSTERRA_BANNER_SCRIPT;
  const nativeKey = process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_KEY;
  const nativeScript = process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_SCRIPT;

  switch (slot) {
    case "home-hero":
      return {
        key: bannerKey,
        scriptUrl: bannerScript,
        format: "banner",
        width: 300,
        height: 250,
      };
    case "gallery-feed":
      return {
        key: nativeKey,
        scriptUrl: nativeScript,
        format: "native",
      };
    case "status-wait":
      return {
        key: bannerKey,
        scriptUrl: bannerScript,
        format: "banner",
        width: 300,
        height: 250,
      };
  }
}

export default function AdSlot({ slot, format = "auto", className = "" }: Props) {
  if (HAS_EZOIC_OR_ADSENSE) {
    // AdSense slot IDs are the same names we use internally. Once Ezoic or
    // AdSense is approved, swap this map for the real per-slot slot IDs.
    return <AdBanner slot={slot} format={format} className={className} />;
  }

  const { key, scriptUrl, format: adsterraFormat, width, height } = adsterraConfigFor(slot);
  if (!key || !scriptUrl) return null;

  return (
    <AdsterraBanner
      zoneKey={key}
      scriptUrl={scriptUrl}
      format={adsterraFormat}
      width={width}
      height={height}
      className={className}
    />
  );
}
