"use client";

const VANILLA_ITEMS = [
  "", "minecraft:diamond", "minecraft:iron_ingot", "minecraft:gold_ingot",
  "minecraft:stick", "minecraft:string", "minecraft:redstone",
  "minecraft:cobblestone", "minecraft:oak_planks", "minecraft:leather",
  "minecraft:coal", "minecraft:emerald", "minecraft:lapis_lazuli",
  "minecraft:quartz", "minecraft:blaze_rod", "minecraft:ender_pearl",
  "minecraft:bone", "minecraft:gunpowder", "minecraft:feather",
  "minecraft:glass", "minecraft:obsidian", "minecraft:netherite_ingot",
];

interface Props {
  recipe: string[];
  onChange: (recipe: string[]) => void;
}

export default function RecipeGrid({ recipe, onChange }: Props) {
  const updateSlot = (index: number, value: string) => {
    const newRecipe = [...recipe];
    newRecipe[index] = value;
    onChange(newRecipe);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">
        Select ingredients for the 3x3 crafting grid. Leave empty slots blank.
      </p>
      <div className="inline-grid grid-cols-3 gap-1 p-3 bg-gray-900/60 rounded-lg border border-gray-700/50">
        {Array.from({ length: 9 }).map((_, i) => (
          <select
            key={i}
            value={recipe[i] || ""}
            onChange={(e) => updateSlot(i, e.target.value)}
            className={`w-24 h-10 text-[10px] rounded border text-center transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-green-500 ${
              recipe[i]
                ? "bg-gray-700 border-gray-500 text-white"
                : "bg-gray-800/50 border-gray-600 text-gray-500"
            }`}
          >
            {VANILLA_ITEMS.map((item) => (
              <option key={item} value={item}>
                {item ? item.replace("minecraft:", "") : "Empty"}
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}
