"use client";

import { Canvas } from "@react-three/fiber";
import { SceneRoot } from "@/three/scene/SceneRoot";
import { SecretOverlay } from "@/components/hero/SecretOverlay";
import { useEasterEggManager } from "@/hooks/useEasterEggManager";

export function HeroScene() {
  useEasterEggManager();

  return (
    <div className="relative h-screen w-full bg-black">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1.6, 5], fov: 45 }}>
        <SceneRoot />
      </Canvas>
      <SecretOverlay />
    </div>
  );
}
