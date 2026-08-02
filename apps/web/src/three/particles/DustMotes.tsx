"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 26;

// Feine Staub-/Aschepartikel, nur im Feuerlicht-Kegel sichtbar (additive, warme
// Farbe, sehr dezent) -- traegt zur Aussage "das Feuer haelt die Szene zusammen" bei.
const vertexShader = /* glsl */ `
  uniform float uTime;
  attribute float aSeed;
  attribute vec3 aOrigin;

  void main() {
    float t = uTime * (0.15 + aSeed * 0.1);
    vec3 pos = aOrigin;
    pos.y += mod(t + aSeed * 3.0, 1.6);
    pos.x += sin(uTime * 0.5 + aSeed * 20.0) * 0.15;
    pos.z += cos(uTime * 0.4 + aSeed * 20.0) * 0.15;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float dist = max(-mvPosition.z, 0.5);
    gl_PointSize = min((2.0 + aSeed * 2.0) * (120.0 / dist), 14.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float glow = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vec3(1.0, 0.75, 0.45), glow * 0.35);
  }
`;

export function DustMotes() {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const origins = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1.6;
      const x = Math.cos(angle) * radius;
      const z = 0.3 + Math.sin(angle) * radius;
      const y = Math.random() * 1.6;
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
