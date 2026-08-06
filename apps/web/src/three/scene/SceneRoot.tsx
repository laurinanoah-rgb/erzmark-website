"use client";

import { Environment as EnvironmentProbe, Lightformer } from "@react-three/drei";
import { CameraRig } from "@/three/camera/CameraRig";
import { BaseLighting } from "@/three/lighting/BaseLighting";
import { CharacterModel } from "@/three/animation/CharacterModel";
import { Campfire } from "@/three/scene/Campfire";
import { Environment } from "@/three/scene/Environment";
import { Ground } from "@/three/scene/Ground";
import { BlockTrees } from "@/three/scene/BlockTrees";
import { Sky } from "@/three/scene/Sky";
import { Props } from "@/three/scene/Props";
import { PostProcessing } from "@/three/effects/PostProcessing";
import { FallingLeaves } from "@/three/particles/FallingLeaves";
import { Fireflies } from "@/three/particles/Fireflies";
import { DustMotes } from "@/three/particles/DustMotes";
import { GroundFog } from "@/three/weather/GroundFog";

// Weltmassstab: 1 Einheit = 1 Minecraft-Block. Die Feuerstelle liegt im Ursprung,
// der NPC sitzt rechts davon -- entsprechend der Bildaufteilung im Mockup
// (Feuer im linken Drittel, NPC im rechten).
// Sitzhoehe: der NPC sitzt auf der Kiste aus Props.tsx (0.9 hoch), nicht auf dem Boden.
const NPC_POSITION: [number, number, number] = [1.5, 0.62, -0.35];
// -90 Grad wuerde den NPC exakt zum Feuer drehen; die Abweichung dreht ihn zusaetzlich
// leicht zur Kamera, damit das Gesicht sichtbar bleibt (wie im Mockup).
const NPC_ROTATION_Y = -Math.PI / 2 + 0.55;

/**
 * Der NPC rendert intern am lokalen Ursprung; die Weltplatzierung passiert
 * ausschliesslich hier.
 *
 * Ohne Umhang: cape.glb ist eine freistehende, nicht ans Skelett gebundene Plane. Sie
 * folgt keiner Animation, haengt sichtbar neben dem Ruecken statt an ihm, und in der
 * Vorlage gibt es ohnehin kein separates Tuch -- dort ist die Kapuze Teil der Blockfigur
 * selbst. Der Umhang kommt in Phase 3 zurueck, dann als echter Minecraft-Cape am neu
 * exportierten Rig (PLAN.md). Das Asset bleibt dafuer im Repo.
 */
function Npc() {
  return (
    <group position={NPC_POSITION} rotation={[0, NPC_ROTATION_Y, 0]}>
      <CharacterModel />
    </group>
  );
}

/**
 * Lokal gerenderte Umgebungsbeleuchtung. Zuvor stand hier <Environment preset="night" />,
 * das eine HDR-Datei zur Laufzeit von einem fremden CDN nachlaedt: schlaegt der Download
 * fehl, wirft der Loader und die komplette Seite bleibt schwarz, statt lediglich die
 * Reflexionen zu verlieren. Die Lightformer erzeugen dieselbe Grundstimmung (kalter
 * Himmel, Mondfleck, warme Bodenglut) ohne jede Netzwerkabhaengigkeit; frames={1}
 * rendert die Cubemap einmalig statt in jedem Frame.
 */
function LocalEnvironment() {
  return (
    <EnvironmentProbe frames={1} resolution={64} environmentIntensity={0.35} background={false}>
      <color attach="background" args={["#0a1020"]} />
      <Lightformer intensity={1.6} color="#7d98d8" position={[6, 9, -12]} scale={6} />
      {/* Bewusst schwach: als warmes Umgebungslicht faerbt dieser Lightformer die
          gesamte Szene ein, auch den weit entfernten Waldrand. Der Feuerschein selbst
          kommt aus den Punktlichtern in BaseLighting und faellt korrekt mit der
          Entfernung ab -- hier geht es nur um eine Spur Restwaerme. */}
      <Lightformer intensity={0.3} color="#ff7a2a" position={[0, 0.4, 0]} scale={2.5} />
    </EnvironmentProbe>
  );
}

export function SceneRoot() {
  return (
    <>
      <LocalEnvironment />
      <CameraRig />
      <BaseLighting />
      <Sky />
      <Ground />
      <BlockTrees />
      <Props />
      <Campfire />
      <Npc />
      <Environment />
      <FallingLeaves />
      <Fireflies />
      <DustMotes />
      <GroundFog />
      {/* Nebelfarbe am Horizontton des Himmels statt an Schwarz: so laeuft der Waldrand
          in den Himmel aus, statt als schwarzes Band davor zu stehen. Reichweite deckt
          den Waldring (Radius 6.5-11) ab -- ContactShadows entfaellt, das Gelaende
          besteht jetzt aus echten Bloecken, die selbst Schatten werfen. */}
      <fog attach="fog" args={["#0b1526", 9, 42]} />
      <PostProcessing />
    </>
  );
}
