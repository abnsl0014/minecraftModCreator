"use client";

import { useRef } from "react";

interface Props {
  value: string | null;  // base64 data URL or null
  onChange: (dataUrl: string | null) => void;
  currentPreview: string | null;  // procedural preview for comparison
}

export default function TextureUpload({ value, onChange, currentPreview }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate: must be image
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Resize to 16x16 for Minecraft
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, 16, 16);
        const dataUrl = canvas.toDataURL("image/png");
        onChange(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const displayImage = value || currentPreview;

  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-400">Custom Texture (optional)</label>
      <div className="flex items-center gap-3">
        {/* Preview */}
        <div className="flex-shrink-0">
          {displayImage ? (
            <img
              src={displayImage}
              alt="texture"
              className={`w-16 h-16 rounded-lg border-2 bg-gray-900 ${value ? "border-green-500" : "border-gray-600"}`}
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div className="w-16 h-16 rounded-lg border-2 border-gray-700 bg-gray-900 flex items-center justify-center">
              <span className="text-gray-600 text-[10px]">16x16</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {value ? "Change Image" : "Upload Image"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30 rounded-md transition-colors"
            >
              Remove (use generated)
            </button>
          )}
          <span className="text-[10px] text-gray-500">
            {value ? "Custom texture active" : "Any image — auto-resized to 16x16"}
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </div>
  );
}
