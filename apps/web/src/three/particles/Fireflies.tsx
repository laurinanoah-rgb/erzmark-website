"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 11;
const AREA_RADIUS = 4.0;
const MIN_RADIUS = 2.2;

// Glühwürmchen: organische Drift ueber mehrere ueberlagerte Sinusfrequenzen
// mit irrationalen Verhaeltnissen (kein sauberer Kreis/keine Wiederholung,
// wirkt zufaellig statt mechanisch — siehe VISION.md Qualitaet-Abschnitt).
const vertexShader = /* glsl */ `
  uniform float uTime;
  attribute float aSeed;
  attribute vec3 aOrigin;
  varying float vPulse;

  void main() {
    float t = uTime * 0.4 + aSeed * 100.0;
    vec3 drift = vec3(
      sin(t * 0.9) * 0.7 + sin(t * 2.17) * 0.3,
      sin(t * 0.63 + aSeed * 12.0) * 0.35 + 0.4,
      cos(t * 1.13) * 0.7 + cos(t * 1.71) * 0.3
    );
    vec3 pos = aOrigin + drift;

    vPulse = 0.5 + 0.5 * sin(uTime * (1.5 + aSeed * 2.0) + aSeed * 50.0);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float dist = max(-mvPosition.z, 0.5);
    gl_PointSize = min((5.0 + vPulse * 3.0) * (150.0 / dist), 22.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vPulse;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float glow = smoothstep(0.5, 0.0, d);
    vec3 color = vec3(0.75, 1.0, 0.45);
    gl_FragColor = vec4(color, glow * (0.25 + vPulse * 0.65));
  }
`;

export function Fireflies() {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const origins = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = MIN_RADIUS + Math.random() * (AREA_RADIUS - MIN_RADIUS);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 0.3 + Math.random() * 1.2;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      origins[i * 3] = x;
      origins[i * 3 + 1] = y;
      origins[i * 3 + 2] = z;
      seeds[i] = Math.random();
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aOrigin", new THREE.BufferAttribute(origins, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return geo;
  }, []);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
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
