"use client";

import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  GodRays,
  HueSaturation,
  N8AO,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Vector2 } from "three";
import { moonMeshRef } from "@/three/effects/sceneRefs";

/**
 * Zentrale Filmlook-Pipeline (VISION.md: "kinoreif" statt "Website"). Bloom fuer
 * Feuer-/Mondglut, weiche Kontaktschatten kommen separat aus BaseLighting/SoftShadows.
 * God-Rays haengen am Mond-Mesh (sceneRefs.ts) — wird erst gerendert, sobald das
 * Mesh im Baum gemountet ist, sonst crasht der Effekt beim ersten Frame.
 */
export function PostProcessing() {
  const [moonReady, setMoonReady] = useState(false);

  useFrame(() => {
    if (!moonReady && moonMeshRef.current) setMoonReady(true);
  });

  return (
    <EffectComposer multisampling={4}>
      <N8AO aoRadius={0.6} intensity={2.2} distanceFalloff={1} halfRes />
      <Bloom mipmapBlur luminanceThreshold={0.55} luminanceSmoothing={0.25} intensity={0.85} radius={0.8} />
      {moonReady ? (
        <GodRays
          sun={moonMeshRef as never}
          blendFunction={BlendFunction.SCREEN}
          samples={40}
          density={0.9}
          decay={0.92}
          weight={0.4}
          exposure={0.35}
          clampMax={1}
          blur
        />
      ) : (
        <></>
      )}
      <DepthOfField focusDistance={0.045} focalLength={0.035} bokehScale={2.2} height={480} />
      <ChromaticAberration offset={new Vector2(0.0006, 0.0006)} radialModulation={false} modulationOffset={0} />
      <HueSaturation hue={0} saturation={0.08} />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.06} />
      <Vignette eskil={false} offset={0.28} darkness={0.85} />
    </EffectComposer>
  );
}
