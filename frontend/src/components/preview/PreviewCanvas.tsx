"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import BlockPreview from "./BlockPreview";
import ItemPreview from "./ItemPreview";
import EntityPreview from "./EntityPreview";
import type { PreviewBlock, PreviewItem, PreviewMob } from "./types";

interface Props {
  activeType: "items" | "blocks" | "mobs";
  activeItem?: PreviewItem;
  activeBlock?: PreviewBlock;
  activeMob?: PreviewMob;
}

export default function PreviewCanvas({ activeType, activeItem, activeBlock, activeMob }: Props) {
  return (
    <Canvas
      camera={{ position: [2, 2, 2], fov: 50 }}
      style={{ background: "#0a0a0f" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.0} />
      <directionalLight position={[-3, 4, -3]} intensity={0.3} />

      {activeType === "blocks" && activeBlock && (
        <BlockPreview block={activeBlock} />
      )}
      {activeType === "items" && activeItem && (
        <ItemPreview item={activeItem} />
      )}
      {activeType === "mobs" && activeMob && (
        <EntityPreview mob={activeMob} />
      )}

      <Grid
        args={[10, 10]}
        position={[0, 0, 0]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#1a1a2e"
        sectionSize={1}
        sectionThickness={1}
        sectionColor="#2a2a4a"
        fadeDistance={8}
        infiniteGrid
      />

      <OrbitControls
        autoRotate
        autoRotateSpeed={1.5}
        enableDamping
        dampingFactor={0.1}
        minDistance={1}
        maxDistance={10}
        target={[0, 0.5, 0]}
      />
    </Canvas>
  );
}
