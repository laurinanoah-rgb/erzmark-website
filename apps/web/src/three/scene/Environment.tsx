"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { assetLoader } from "@/systems/asset-loader";
import { useWeather } from "@/hooks/useWeather";
import { moonMeshRef } from "@/three/effects/sceneRefs";

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

// Gemeinsamer Wind-Uniform fuer alle Baum-Klone (ein Material, per onBeforeCompile
// gepatcht -> ein Zeit-Update pro Frame reicht fuer die ganze Waldkulisse).
const windUniforms = { uTime: { value: 0 }, uWindStrength: { value: 0.35 } };

function patchFoliageWind(material: THREE.Material) {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uWindStrength = windUniforms.uWindStrength;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uTime;
        uniform float uWindStrength;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        {
          float treePhase = (modelMatrix[3].x * 12.9898 + modelMatrix[3].z * 78.233);
          float sway = sin(uTime * 1.1 + treePhase) * 0.5 + sin(uTime * 2.3 + treePhase * 1.7) * 0.3;
          float heightMask = clamp(position.y * 0.35, 0.0, 1.0);
          transformed.x += sway * heightMask * uWindStrength;
          transformed.z += cos(uTime * 0.9 + treePhase) * heightMask * uWindStrength * 0.6;
        }`,
      );
  };
  material.needsUpdate = true;
}

function Trees() {
  const [variants, setVariants] = useState<THREE.Object3D[] | null>(null);
  const placements = useMemo(generateTreePlacements, []);
  const { windStrength } = useWeather();
  const windRef = useRef(windStrength);
  windRef.current = windStrength;

  useEffect(() => {
    let cancelled = false;
    assetLoader.loadGLTF(TREES_URL).then((gltf) => {
      if (cancelled) return;
      const a = gltf.scene.getObjectByName("Tree_Pine_A");
      const b = gltf.scene.getObjectByName("Tree_Pine_B");
      for (const tree of [a, b]) {
        tree?.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            const material = node.material as THREE.Material;
            if (material.name === "Tree_Foliage_Mat") patchFoliageWind(material);
          }
        });
      }
      if (a && b) setVariants([a, b]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useFrame(({ clock }) => {
    windUniforms.uTime.value = clock.getElapsedTime();
    windUniforms.uWindStrength.value = 0.15 + windRef.current * 0.5;
  });

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
    <mesh ref={moonMeshRef} position={[6, 9, -12]}>
      <circleGeometry args={[1.2, 32]} />
      <meshBasicMaterial color="#dfe4ff" toneMapped={false} />
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
