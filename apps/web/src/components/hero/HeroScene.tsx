"use client";

import { Canvas } from "@react-three/fiber";
import { SceneRoot } from "@/three/scene/SceneRoot";
import { SecretOverlay } from "@/components/hero/SecretOverlay";
import { useEasterEggManager } from "@/hooks/useEasterEggManager";
import { useWeather } from "@/hooks/useWeather";

export function HeroScene() {
  useEasterEggManager();
  // Visuelle Kopplung an die Szene folgt in Phase 2.5 — hier nur der Live-Fetch.
  useWeather();

  return (
    <div className="relative h-screen w-full bg-black">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1.6, 5], fov: 45 }}>
        <SceneRoot />
      </Canvas>
      <SecretOverlay />
    </div>
  );
}
