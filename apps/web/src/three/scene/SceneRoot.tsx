"use client";

import { CameraRig } from "@/three/camera/CameraRig";
import { BaseLighting } from "@/three/lighting/BaseLighting";
import { useAnimationManager } from "@/hooks/useAnimationManager";

/**
 * Platzhalter-Charakter am Lagerfeuer, solange kein echtes Asset geladen wird.
 * Zeigt bereits, dass der Animation-Manager läuft (Würfel-Farbe wechselt mit dem Clip).
 */
function PlaceholderCharacter() {
  const { currentClipId } = useAnimationManager();
  const color = currentClipId === "look-into-fire" ? "#ff8a3d" : currentClipId === "glance-at-visitor" ? "#7dd3fc" : "#94a3b8";

  return (
    <mesh position={[0, 0.4, -1]}>
      <boxGeometry args={[0.5, 0.8, 0.5]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function PlaceholderGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#0b1220" />
    </mesh>
  );
}

export function SceneRoot() {
  return (
    <>
      <CameraRig />
      <BaseLighting />
      <PlaceholderGround />
      <PlaceholderCharacter />
      <fog attach="fog" args={["#05070d", 4, 18]} />
    </>
  );
}
