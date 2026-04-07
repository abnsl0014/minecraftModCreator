"use client";

import { Edges, Html } from "@react-three/drei";
import type { PreviewMob, BedrockBone } from "./types";

interface Props {
  mob: PreviewMob;
}

// Bedrock geometry uses pixel units (16px = 1 block).
// Scale down so the entity is roughly 1 block tall.
const SCALE = 1 / 16;

function BoneMesh({ bone, color }: { bone: BedrockBone; color: string }) {
  return (
    <>
      {bone.cubes.map((cube, i) => {
        // Bedrock origin is the min corner; Three.js box is centered.
        const px = (cube.origin[0] + cube.size[0] / 2) * SCALE;
        const py = (cube.origin[1] + cube.size[1] / 2) * SCALE;
        const pz = (cube.origin[2] + cube.size[2] / 2) * SCALE;

        const sx = cube.size[0] * SCALE;
        const sy = cube.size[1] * SCALE;
        const sz = cube.size[2] * SCALE;

        // Slightly vary brightness per bone for visual depth
        const isHead = bone.name === "head";

        return (
          <mesh key={`${bone.name}-${i}`} position={[px, py, pz]}>
            <boxGeometry args={[sx, sy, sz]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isHead ? 0.08 : 0.02}
            />
            <Edges color="#000000" threshold={15} />
          </mesh>
        );
      })}
    </>
  );
}

export default function EntityPreview({ mob }: Props) {
  const geometryData = mob.geometry?.["minecraft:geometry"]?.[0];
  const bones = geometryData?.bones ?? [];

  if (bones.length === 0) {
    return (
      <group position={[0, 0.5, 0]}>
        <mesh>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshStandardMaterial color={mob.color} />
          <Edges color="#000000" threshold={15} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      {bones.map((bone) => (
        <BoneMesh key={bone.name} bone={bone} color={mob.color} />
      ))}
      <Html position={[0, -0.3, 0]} center>
        <div className="text-xs text-gray-300 bg-gray-900/80 px-2 py-0.5 rounded whitespace-nowrap">
          {mob.display_name}
        </div>
      </Html>
    </group>
  );
}
