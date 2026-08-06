"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWeather } from "@/hooks/useWeather";

/**
 * Atmosphaerische Himmelsdetails, die nicht zur Grundstimmung gehoeren: Sterne und
 * die angedeutete Rune.
 *
 * Baeume und Mond sind hier ausgezogen -- der Wald steckt jetzt in BlockTrees (echte
 * Bloecke statt der untexturierten Kegel aus trees.glb), Mond und Wolken in Sky.
 */

const RUNE_URL = "/textures/rune-circle.png";
const STAR_COUNT = 400;

function Stars() {
  const { condition } = useWeather();
  const pointsRef = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.9); // obere Himmelshalbkugel bevorzugt
      // Deutlich weiter draussen als zuvor (25), damit die Sterne hinter den Wolken
      // in ~34 Hoehe stehen und nicht zwischen ihnen hindurchscheinen.
      const r = 70;
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.abs(Math.cos(phi) * r) + 6;
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
      <pointsMaterial color="#ffffff" size={0.32} transparent opacity={0.6} depthWrite={false} fog={false} />
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
    <mesh ref={meshRef} position={[-3, 7, -16]}>
      {/* Bewusst blass: die Rune soll etwas sein, bei dem man sich nicht sicher ist,
          ob man es gesehen hat (VISION.md, Abschnitt Geheimnisse). */}
      <planeGeometry args={[4, 4]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.14}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
}

export function Environment() {
  return (
    <group>
      <Stars />
      <RuneCircle />
    </group>
  );
}
