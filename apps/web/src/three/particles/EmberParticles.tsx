"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWeather } from "@/hooks/useWeather";

const COUNT = 90;
const BASE_POSITION = new THREE.Vector3(0, 0.15, 0.3);
const RISE_HEIGHT = 2.4;

// GPU-getriebene Feuerfunken: Position/Groesse/Fade laufen komplett im Vertex-/
// Fragment-Shader ueber einen Zeit-Uniform, keine Pro-Frame-CPU-Buffer-Updates
// (siehe VISION.md Performance-Abschnitt: "GPU-Partikel, kein unnoetiges Re-Rendern").
const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uWind;
  attribute float aSeed;
  attribute float aSpeed;
  attribute float aSize;
  varying float vLife;

  // einfache Hash-basierte Pseudo-Zufallsfunktion, deterministisch pro Partikel
  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    float cycle = mod(uTime * aSpeed + aSeed * 10.0, 1.0);
    vLife = cycle;

    float wobblePhase = aSeed * 62.831853;
    float wobble = sin(uTime * (1.2 + aSeed) + wobblePhase) * (0.09 + 0.05 * hash(aSeed));
    float windDrift = uWind * cycle * 0.6;

    vec3 pos = position;
    pos.y += cycle * ${RISE_HEIGHT.toFixed(2)};
    pos.x += wobble + windDrift;
    pos.z += cos(uTime * (0.9 + aSeed) + wobblePhase) * 0.07;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float sizeFalloff = 1.0 - cycle;
    gl_PointSize = aSize * sizeFalloff * (220.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vLife;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float glow = smoothstep(0.5, 0.0, d);
    vec3 hot = vec3(1.0, 0.95, 0.55);
    vec3 cool = vec3(0.95, 0.35, 0.05);
    vec3 color = mix(hot, cool, clamp(vLife * 1.4, 0.0, 1.0));

    float fade = smoothstep(0.0, 0.12, vLife) * smoothstep(1.0, 0.6, vLife);
    gl_FragColor = vec4(color, glow * fade);
  }
`;

export function EmberParticles() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { windStrength } = useWeather();
  const windRef = useRef(windStrength);
  windRef.current = windStrength;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    const speeds = new Float32Array(COUNT);
    const sizes = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.18;
      positions[i * 3] = BASE_POSITION.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = BASE_POSITION.y;
      positions[i * 3 + 2] = BASE_POSITION.z + Math.sin(angle) * radius;
      seeds[i] = Math.random();
      speeds[i] = 0.15 + Math.random() * 0.2;
      sizes[i] = 3 + Math.random() * 5;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWind: { value: 0 },
    }),
    [],
  );

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uWind.value = windRef.current;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
