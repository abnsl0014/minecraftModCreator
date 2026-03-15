"use client";

import { useRef } from "react";

interface QuickTexture {
  name: string;
  dataUrl: string;
}

interface Props {
  textures: QuickTexture[];
  setTextures: (textures: QuickTexture[]) => void;
}

export default function QuickTextureUpload({ textures, setTextures }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const name = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/\s+/g, "_");

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, 16, 16);
        const dataUrl = canvas.toDataURL("image/png");
        setTextures([...textures, { name, dataUrl }]);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const remove = (index: number) => {
    setTextures(textures.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 hover:text-white border border-gray-700/50 rounded-md transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Upload Custom Texture
        </button>
        <span className="text-[10px] text-gray-500">Optional — uploaded images become in-game item textures (auto-resized to 16x16)</span>
      </div>

      {textures.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {textures.map((tex, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1 bg-gray-800/40 border border-green-600/30 rounded-md">
              <img
                src={tex.dataUrl}
                alt={tex.name}
                className="w-8 h-8 rounded border border-gray-600"
                style={{ imageRendering: "pixelated" }}
              />
              <span className="text-xs text-gray-300">{tex.name}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
