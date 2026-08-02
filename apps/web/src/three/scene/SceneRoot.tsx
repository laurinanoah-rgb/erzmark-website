"use client";

import { CameraRig } from "@/three/camera/CameraRig";
import { BaseLighting } from "@/three/lighting/BaseLighting";
import { CharacterModel } from "@/three/animation/CharacterModel";
import { Campfire } from "@/three/scene/Campfire";
import { Environment } from "@/three/scene/Environment";

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
      <Campfire />
      <CharacterModel />
      <Environment />
      <fog attach="fog" args={["#05070d", 4, 18]} />
    </>
  );
}
