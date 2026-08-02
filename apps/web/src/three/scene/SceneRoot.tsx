"use client";

import { ContactShadows, Environment as EnvironmentProbe } from "@react-three/drei";
import { CameraRig } from "@/three/camera/CameraRig";
import { BaseLighting } from "@/three/lighting/BaseLighting";
import { CharacterModel } from "@/three/animation/CharacterModel";
import { Campfire } from "@/three/scene/Campfire";
import { Environment } from "@/three/scene/Environment";
import { PostProcessing } from "@/three/effects/PostProcessing";

function PlaceholderGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#0b1220" roughness={0.95} />
    </mesh>
  );
}

export function SceneRoot() {
  return (
    <>
      {/* Guenstige Ambient-/Reflexions-Naeherung statt echter Echtzeit-GI (siehe Plan) */}
      <EnvironmentProbe preset="night" environmentIntensity={0.35} background={false} />
      <CameraRig />
      <BaseLighting />
      <PlaceholderGround />
      <ContactShadows position={[0, 0.005, 0]} opacity={0.55} scale={9} blur={2.2} far={3} color="#000000" />
      <Campfire />
      <CharacterModel />
      <Environment />
      <fog attach="fog" args={["#05070d", 4, 18]} />
      <PostProcessing />
    </>
  );
}
