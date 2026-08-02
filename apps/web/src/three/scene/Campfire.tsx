"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";

const LOG_POSITIONS: Array<{ rotationY: number; rotationZ: number }> = [
  { rotationY: 0, rotationZ: 0.06 },
  { rotationY: Math.PI / 3, rotationZ: -0.05 },
  { rotationY: (Math.PI / 3) * 2, rotationZ: 0.04 },
];

function Logs() {
  return (
    <group position={[0, 0.06, 0.3]}>
      {LOG_POSITIONS.map((log, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, log.rotationY]} rotation-z={log.rotationZ}>
          <cylinderGeometry args={[0.05, 0.06, 0.55, 8]} />
          <meshStandardMaterial color="#2b1a12" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

// Drei uebereinander gestapelte, additiv schimmernde Kegel als einfache Flamme.
// Echte GPU-Partikel-Funken folgen in Phase 2.4 — hier geht es nur darum, dass
// das Feuerlicht eine sichtbare Quelle hat statt frei zu schweben.
function Flame() {
  const groupRef = useRef<Group>(null);
  const coneRefs = useRef<Array<Mesh | null>>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    coneRefs.current.forEach((cone, i) => {
      if (!cone) return;
      const phase = i * 1.7;
      const sway = Math.sin(t * 2.2 + phase) * 0.08;
      const stretch = 1 + Math.sin(t * 3.1 + phase) * 0.12;
      cone.rotation.z = sway;
      cone.scale.y = stretch;
    });
  });

  return (
    <group ref={groupRef} position={[0, 0.18, 0.3]}>
      <mesh ref={(el) => { coneRefs.current[0] = el; }} position={[0, 0.05, 0]}>
        <coneGeometry args={[0.16, 0.42, 8]} />
        <meshStandardMaterial color="#ff6a1a" emissive="#ff6a1a" emissiveIntensity={2.2} transparent opacity={0.85} />
      </mesh>
      <mesh ref={(el) => { coneRefs.current[1] = el; }} position={[0, 0.14, 0]}>
        <coneGeometry args={[0.1, 0.3, 8]} />
        <meshStandardMaterial color="#ffb238" emissive="#ffb238" emissiveIntensity={2.6} transparent opacity={0.9} />
      </mesh>
      <mesh ref={(el) => { coneRefs.current[2] = el; }} position={[0, 0.2, 0]}>
        <coneGeometry args={[0.05, 0.18, 8]} />
        <meshStandardMaterial color="#fff2b0" emissive="#fff2b0" emissiveIntensity={3} transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

export function Campfire() {
  return (
    <group>
      <Logs />
      <Flame />
    </group>
  );
}
