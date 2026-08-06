"use client";

import { ContactShadows, Environment as EnvironmentProbe, Lightformer } from "@react-three/drei";
import { CameraRig } from "@/three/camera/CameraRig";
import { BaseLighting } from "@/three/lighting/BaseLighting";
import { CharacterModel } from "@/three/animation/CharacterModel";
import { Cape } from "@/three/animation/Cape";
import { Campfire } from "@/three/scene/Campfire";
import { Environment } from "@/three/scene/Environment";
import { PostProcessing } from "@/three/effects/PostProcessing";
import { FallingLeaves } from "@/three/particles/FallingLeaves";
import { Fireflies } from "@/three/particles/Fireflies";
import { DustMotes } from "@/three/particles/DustMotes";
import { GroundFog } from "@/three/weather/GroundFog";

// Weltmassstab: 1 Einheit = 1 Minecraft-Block. Die Feuerstelle liegt im Ursprung,
// der NPC sitzt rechts davon -- entsprechend der Bildaufteilung im Mockup
// (Feuer im linken Drittel, NPC im rechten).
const NPC_POSITION: [number, number, number] = [1.05, 0, 0.15];
// -90 Grad wuerde den NPC exakt zum Feuer drehen; die Abweichung dreht ihn zusaetzlich
// leicht zur Kamera, damit das Gesicht sichtbar bleibt (wie im Mockup).
const NPC_ROTATION_Y = -Math.PI / 2 + 0.55;

function PlaceholderGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      {/* Platzhalter bis zur texturierten Gras-/Steinweg-Flaeche aus Phase 2 (PLAN.md).
          Sehr dunkel und stumpf, damit das Mondlicht die Flaeche nicht als helle
          Graustufe ausbrennt und der Feuerschein die dominante Lichtquelle bleibt. */}
      <meshStandardMaterial color="#070c15" roughness={1} metalness={0} />
    </mesh>
  );
}

/**
 * Charakter und Umhang als eine Einheit. Beide rendern intern am lokalen Ursprung;
 * die Weltplatzierung passiert ausschliesslich hier -- damit kann der NPC verschoben
 * oder gedreht werden, ohne dass der Umhang zurueckbleibt.
 */
function Npc() {
  return (
    <group position={NPC_POSITION} rotation={[0, NPC_ROTATION_Y, 0]}>
      <CharacterModel />
      <Cape />
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
      <PlaceholderGround />
      <ContactShadows position={[0, 0.005, 0]} opacity={0.55} scale={9} blur={2.2} far={3} color="#000000" />
      <Campfire />
      <Npc />
      <Environment />
      <FallingLeaves />
      <Fireflies />
      <DustMotes />
      <GroundFog />
      {/* Reichweite an den groesseren Bildausschnitt angepasst: bei 4/18 verschwand der
          Waldrand (Radius ~5.5) fast vollstaendig im Nebel. */}
      <fog attach="fog" args={["#05070d", 6, 26]} />
      <PostProcessing />
    </>
  );
}
