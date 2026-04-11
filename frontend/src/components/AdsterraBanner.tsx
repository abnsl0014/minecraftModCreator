"use client";

import { useEffect, useRef } from "react";

interface Props {
  // Adsterra key — the hex string embedded in the invoke.js URL, e.g.
  // 98c17fa411bb01158a84b9617d282e7c. Used for the atOptions config.
  zoneKey: string;
  // Full invoke.js URL Adsterra gave us. Must start with https://. We can't
  // reconstruct this from just the zoneKey because the CDN subdomain embeds
  // a per-placement ID we only learn from the dashboard.
  scriptUrl: string;
  format: "banner" | "native";
  // Banner-specific size. Ignored for native format.
  width?: number;
  height?: number;
  className?: string;
}

function clearChildren(el: HTMLElement) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

// Adsterra injects its own markup via a script tag. Because React re-renders,
// we load the script into a ref'd container and clear on unmount so we never
// double-inject if the component flashes in/out.
export default function AdsterraBanner({
  zoneKey,
  scriptUrl,
  format,
  width = 300,
  height = 250,
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !zoneKey || !scriptUrl) return;

    clearChildren(container);

    if (format === "native") {
      // Native banner: Adsterra's invoke.js populates a div whose id must
      // be `container-<zoneKey>`. We create that div first, then inject the
      // async script.
      const holder = document.createElement("div");
      holder.id = `container-${zoneKey}`;
      container.appendChild(holder);

      const script = document.createElement("script");
      script.async = true;
      script.setAttribute("data-cfasync", "false");
      script.src = scriptUrl;
      container.appendChild(script);
    } else {
      // Standard banner: set atOptions first, then load invoke.js. The script
      // renders an <iframe> of the requested size inline wherever it runs.
      // textContent is safe — the template is fully controlled by us and the
      // zoneKey/size values come from env vars, not user input.
      const config = document.createElement("script");
      config.type = "text/javascript";
      config.textContent = [
        "atOptions = {",
        `  'key' : '${zoneKey}',`,
        "  'format' : 'iframe',",
        `  'height' : ${height},`,
        `  'width' : ${width},`,
        "  'params' : {}",
        "};",
      ].join("\n");
      container.appendChild(config);

      const invoke = document.createElement("script");
      invoke.type = "text/javascript";
      invoke.src = scriptUrl;
      container.appendChild(invoke);
    }

    return () => {
      clearChildren(container);
    };
  }, [zoneKey, scriptUrl, format, width, height]);

  if (!zoneKey || !scriptUrl) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      style={format === "banner" ? { width, height, margin: "0 auto" } : undefined}
    />
  );
}
