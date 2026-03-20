"use client";

import { useRef, useEffect, useState } from "react";

interface PixelEmojiProps {
  emoji: string;
  size?: number;
  resolution?: number;
  className?: string;
}

/**
 * Renders an emoji onto a tiny canvas (e.g., 10x10) then displays it
 * at full size with image-rendering: pixelated — creating chunky
 * Minecraft-style pixel blocks from any system emoji.
 */
export default function PixelEmoji({
  emoji,
  size = 32,
  resolution = 10,
  className = "",
}: PixelEmojiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      setFallback(true);
      return;
    }

    canvas.width = resolution;
    canvas.height = resolution;

    ctx.clearRect(0, 0, resolution, resolution);
    ctx.font = `${resolution * 0.85}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, resolution / 2, resolution / 2 + 1);

    // If nothing was drawn (emoji not supported), show text fallback
    const data = ctx.getImageData(0, 0, resolution, resolution).data;
    let hasPixels = false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) {
        hasPixels = true;
        break;
      }
    }
    if (!hasPixels) setFallback(true);
  }, [emoji, resolution]);

  if (fallback) {
    return (
      <span className={className} style={{ fontSize: size * 0.7, lineHeight: 1 }}>
        {emoji}
      </span>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label={emoji}
      role="img"
      style={{
        width: size,
        height: size,
        imageRendering: "pixelated",
        display: "inline-block",
        verticalAlign: "middle",
      }}
    />
  );
}
