"use client";

import { useRef } from "react";
import { Edges, Html } from "@react-three/drei";
import type { PreviewItem } from "./types";

interface Props {
  item: PreviewItem;
}

export default function ItemPreview({ item }: Props) {
  const meshRef = useRef(null);

  // Sword/tool items are taller, basic items are square
  const isTall = ["sword", "tool"].includes(item.item_type);
  const width = isTall ? 0.5 : 0.8;
  const height = isTall ? 1.2 : 0.8;

  return (
    <group position={[0, height / 2 + 0.1, 0]}>
      <mesh ref={meshRef} rotation={[0, Math.PI / 8, isTall ? Math.PI / 6 : 0]}>
        <boxGeometry args={[width, height, 0.05]} />
        <meshStandardMaterial color={item.color} />
        <Edges color="#000000" threshold={15} />
      </mesh>
      <Html position={[0, -(height / 2 + 0.3), 0]} center>
        <div className="text-xs text-gray-300 bg-gray-900/80 px-2 py-0.5 rounded whitespace-nowrap">
          {item.display_name}
        </div>
      </Html>
    </group>
  );
}
