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
import { HeatHaze } from "@/three/effects/HeatHaze";

// Ungefaehre Bildschirmposition der Feuerstelle bei statischer Kamera (siehe CameraRig.tsx).
// Nachgezogen auf den Mockup-Bildaufbau: das Feuer sitzt jetzt links der Bildmitte.
const FIRE_SCREEN_POSITION = new Vector2(0.42, 0.25);

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
      <HeatHaze uFirePos={FIRE_SCREEN_POSITION} uStrength={0.004} />
      <N8AO aoRadius={0.6} intensity={2.2} distanceFalloff={1} halfRes />
      <Bloom mipmapBlur luminanceThreshold={0.78} luminanceSmoothing={0.2} intensity={0.5} radius={0.45} />
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
      {/* Ziel statt normierter focusDistance: robust gegenueber Kamera-Umbauten
          (Weltkoordinate = Ebene zwischen Feuer und NPC, siehe CameraRig.tsx).
          Vorher lagen mit focalLength 0.035 und bokehScale 2.2 praktisch alle Ebenen
          ausserhalb der Schaerfe -- auch Feuer und Figur. Im Mockup ist nur der ferne
          Hintergrund weich, der Vordergrund durchgehend scharf. */}
      <DepthOfField target={[0.6, 1.1, 0]} focalLength={0.32} bokehScale={0.9} height={480} />
      <ChromaticAberration offset={new Vector2(0.0006, 0.0006)} radialModulation={false} modulationOffset={0} />
      <HueSaturation hue={0} saturation={0.08} />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.06} />
      <Vignette eskil={false} offset={0.28} darkness={0.85} />
    </EffectComposer>
  );
}
