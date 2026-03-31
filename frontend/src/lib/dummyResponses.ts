export interface ItemData {
  name: string;
  category: "weapon" | "tool" | "armor" | "food" | "block";
  icon: string;
  stats: Record<string, string | number>;
  description: string;
}
