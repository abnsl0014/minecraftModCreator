export interface PreviewItem {
  registry_name: string;
  display_name: string;
  item_type: string;
  color: string;
}

export interface PreviewBlock {
  registry_name: string;
  display_name: string;
  color: string;
}

export interface BedrockCube {
  origin: [number, number, number];
  size: [number, number, number];
  uv: [number, number];
}

export interface BedrockBone {
  name: string;
  parent?: string;
  pivot: [number, number, number];
  cubes: BedrockCube[];
}

export interface BedrockGeometry {
  format_version: string;
  "minecraft:geometry": Array<{
    description: {
      identifier: string;
      texture_width: number;
      texture_height: number;
      visible_bounds_width: number;
      visible_bounds_height: number;
      visible_bounds_offset: [number, number, number];
    };
    bones: BedrockBone[];
  }>;
}

export interface PreviewMob {
  registry_name: string;
  display_name: string;
  color: string;
  geometry: BedrockGeometry;
}

export interface PreviewData {
  mod_name: string;
  mod_id: string;
  items: PreviewItem[];
  blocks: PreviewBlock[];
  mobs: PreviewMob[];
}
