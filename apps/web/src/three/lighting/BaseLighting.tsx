"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { PointLight } from "three";

/**
 * Phase 1: Ambient-Nachtlicht + ein flackerndes Punktlicht als Lagerfeuer-Platzhalter.
 * Das Flackern ist absichtlich unregelmäßig (siehe VISION.md: keine linearen Loops).
 */
export function BaseLighting() {
  const fireLightRef = useRef<PointLight>(null);

  useFrame(({ clock }) => {
    if (!fireLightRef.current) return;
    const t = clock.getElapsedTime();
    const flicker = Math.sin(t * 8) * 0.15 + Math.sin(t * 17.3) * 0.1 + Math.random() * 0.1;
    fireLightRef.current.intensity = 2.2 + flicker;
  });

  return (
    <>
      <ambientLight intensity={0.15} color="#1a2440" />
      <pointLight ref={fireLightRef} position={[0, 0.6, 0]} color="#ff8a3d" intensity={2.2} distance={8} decay={2} />
    </>
  );
}
