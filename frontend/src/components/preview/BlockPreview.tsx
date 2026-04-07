"use client";

import { useRef } from "react";
import { Edges, Html } from "@react-three/drei";
import type { PreviewBlock } from "./types";

interface Props {
  block: PreviewBlock;
}

export default function BlockPreview({ block }: Props) {
  const meshRef = useRef(null);

  return (
    <group position={[0, 0.5, 0]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={block.color} />
        <Edges color="#000000" threshold={15} />
      </mesh>
      <Html position={[0, -1, 0]} center>
        <div className="text-xs text-gray-300 bg-gray-900/80 px-2 py-0.5 rounded whitespace-nowrap">
          {block.display_name}
        </div>
      </Html>
    </group>
  );
}
