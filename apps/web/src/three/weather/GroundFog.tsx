"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Prozedurale, driftende Bodennebel-Ebene (kein Video/keine Textur -- reines
// Shader-Rauschen, animiert), siehe VISION.md "kein volumetrisches Raymarching
// noetig, aber ueberzeugend genug" (ARCHITECTURE-Leitplanke aus dem AAA-Plan).
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec2 uDrift;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.55;
    for (int i = 0; i < 4; i++) {
      v += amp * noise(p);
      p *= 2.05;
      amp *= 0.55;
    }
    return v;
  }

  void main() {
    vec2 p = vUv * 3.0 + uDrift * uTime;
    float n = fbm(p);
    float edge = smoothstep(0.0, 0.45, vUv.x) * smoothstep(1.0, 0.55, vUv.x)
      * smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
    float alpha = smoothstep(0.35, 0.75, n) * edge * uOpacity;
    gl_FragColor = vec4(vec3(0.55, 0.6, 0.7), alpha);
  }
`;

interface FogLayerProps {
  position: [number, number, number];
  size: [number, number];
  speed: [number, number];
  opacity: number;
}

function FogLayer({ position, size, speed, opacity }: FogLayerProps) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: opacity },
      uDrift: { value: new THREE.Vector2(...speed) },
    }),
    [opacity, speed],
  );

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={size} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

export function GroundFog() {
  return (
    <group>
      <FogLayer position={[0, 0.08, 0]} size={[16, 16]} speed={[0.012, 0.006]} opacity={0.22} />
      <FogLayer position={[1.5, 0.18, -1]} size={[14, 14]} speed={[-0.008, 0.01]} opacity={0.15} />
      <FogLayer position={[-1, 0.28, 1]} size={[12, 12]} speed={[0.006, -0.009]} opacity={0.12} />
    </group>
  );
}
