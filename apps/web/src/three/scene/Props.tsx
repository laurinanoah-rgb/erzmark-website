"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { blockTexture, boxMaterials } from "@/three/assets/blockTextures";

/**
 * Requisiten der Lichtung. Aktuell die Sitzkiste des NPC, spaeter Spitzhacke und
 * weitere Fundstuecke aus der Vorlage.
 *
 * Die Kiste ist nicht nur Deko: die Beine des Rigs sind bereits nach vorn in eine
 * Sitzhaltung rotiert (Ergebnis der frueheren Sitzpose-Versuche, siehe Commit-Historie).
 * Ohne Sitzflaeche darunter wirkte das wie eine Fehlstellung -- mit ihr liest sich die
 * Haltung als das, was sie sein soll.
 */

const CHEST_SIZE = 0.9;

interface ChestProps {
  position: [number, number, number];
  rotationY?: number;
}

function Chest({ position, rotationY = 0 }: ChestProps) {
  const materials = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ map: blockTexture("planks"), roughness: 1 });
    const top = new THREE.MeshStandardMaterial({ map: blockTexture("log_top"), roughness: 1 });
    return boxMaterials(side, top, side);
  }, []);

  return (
    <mesh
      position={[position[0], position[1] + CHEST_SIZE / 2, position[2]]}
      rotation={[0, rotationY, 0]}
      material={materials}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[CHEST_SIZE, CHEST_SIZE, CHEST_SIZE]} />
    </mesh>
  );
}

export function Props() {
  return (
    <group>
      {/* Sitzkiste unter dem NPC */}
      <Chest position={[1.5, 0, -0.4]} rotationY={-0.3} />
      {/* Zweite Kiste rechts daneben, wie in der Vorlage */}
      <Chest position={[2.6, 0, -0.9]} rotationY={0.18} />
    </group>
  );
}
