"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { assetLoader } from "@/systems/asset-loader";
import { useWeather } from "@/hooks/useWeather";

const TREES_URL = "/models/trees.glb";
const RUNE_URL = "/textures/rune-circle.png";

interface TreePlacement {
  variant: 0 | 1;
  x: number;
  z: number;
  rotationY: number;
  scale: number;
}

// Waldrand als grober Ring um die Lichtung, zwei Baum-Varianten alternierend,
// leicht randomisiert (siehe VISION.md: nichts wirkt exakt gleich/mechanisch).
function generateTreePlacements(): TreePlacement[] {
  const placements: TreePlacement[] = [];
  const count = 16;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 2 === 0 ? 0.15 : -0.1);
    const radius = 5.5 + ((i * 37) % 5) * 0.4;
    placements.push({
      variant: i % 2 === 0 ? 0 : 1,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      rotationY: (i * 2.4) % (Math.PI * 2),
      scale: 0.85 + ((i * 13) % 7) * 0.05,
    });
  }
  return placements;
}

function Trees() {
  const [variants, setVariants] = useState<THREE.Object3D[] | null>(null);
  const placements = useMemo(generateTreePlacements, []);

  useEffect(() => {
    let cancelled = false;
    assetLoader.loadGLTF(TREES_URL).then((gltf) => {
      if (cancelled) return;
      const a = gltf.scene.getObjectByName("Tree_Pine_A");
      const b = gltf.scene.getObjectByName("Tree_Pine_B");
      if (a && b) setVariants([a, b]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!variants) return null;

  return (
    <group>
      {placements.map((p, i) => (
        <primitive
          key={i}
          object={variants[p.variant].clone(true)}
          position={[p.x, 0, p.z]}
          rotation={[0, p.rotationY, 0]}
          scale={p.scale}
        />
      ))}
    </group>
  );
}

function Moon() {
  return (
    <mesh position={[6, 9, -12]}>
      <circleGeometry args={[1.2, 32]} />
      <meshStandardMaterial color="#d8dcf0" emissive="#c0c8ff" emissiveIntensity={1.8} toneMapped={false} />
    </mesh>
  );
}

const STAR_COUNT = 400;

function Stars() {
  const { condition } = useWeather();
  const pointsRef = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.9); // obere Himmelshalbkugel bevorzugt
      const r = 25;
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.abs(Math.cos(phi) * r) + 3;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame(({ clock }) => {
    const mat = pointsRef.current?.material as THREE.PointsMaterial | undefined;
    if (!mat) return;
    // Funkeln: sanfte Helligkeitsschwankung, kein starres An/Aus
    mat.opacity = 0.55 + Math.sin(clock.getElapsedTime() * 1.3) * 0.15;
  });

  if (condition !== "clear") return null;

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial color="#ffffff" size={0.06} transparent opacity={0.6} depthWrite={false} />
    </points>
  );
}

function RuneCircle() {
  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load(RUNE_URL);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.z += delta * 0.02;
  });

  return (
    <mesh ref={meshRef} position={[-3, 6, -13]}>
      <planeGeometry args={[5, 5]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

export function Environment() {
  return (
    <group>
      <Trees />
      <Moon />
      <Stars />
      <RuneCircle />
    </group>
  );
}
