"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWeather } from "@/hooks/useWeather";

const COUNT = 14;
const AREA_RADIUS = 4.2;
const MIN_RADIUS = 1.8;
const FALL_HEIGHT = 4.5;

// Trudelndes Laub aus den Baumkronen: fallen + seitliches Pendeln + Rotation,
// komplett GPU-getrieben (ein Zeit-Uniform), damit auch der "leere" Wald-Ring
// staendig etwas Bewegung zeigt (VISION.md: "Blaetter fallen herunter").
const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uWind;
  attribute float aSeed;
  attribute float aSpeed;
  attribute vec2 aOrigin;
  varying float vSpin;
  varying float vFade;

  void main() {
    float cycle = mod(uTime * aSpeed + aSeed * 5.0, 1.0);
    vFade = smoothstep(0.0, 0.08, cycle) * smoothstep(1.0, 0.85, cycle);

    float sway = sin(uTime * (0.8 + aSeed * 0.6) + aSeed * 40.0) * (0.6 + aSeed * 0.5);
    vec3 pos = position;
    pos.y -= cycle * ${FALL_HEIGHT.toFixed(2)};
    pos.x = aOrigin.x + sway + uWind * cycle * 1.2;
    pos.z = aOrigin.y + cos(uTime * (0.6 + aSeed) + aSeed * 21.0) * (0.5 + aSeed * 0.4);

    vSpin = uTime * (2.0 + aSeed * 3.0) + aSeed * 30.0;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float dist = max(-mvPosition.z, 0.5);
    gl_PointSize = min((5.0 + aSeed * 3.0) * (150.0 / dist), 22.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vSpin;
  varying float vFade;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    // Rotierendes ovales Blatt statt rundem Punkt
    float c = cos(vSpin);
    float s = sin(vSpin);
    vec2 ruv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
    ruv.x *= 2.2;
    float d = length(ruv);
    if (d > 0.5) discard;

    vec3 color = mix(vec3(0.5, 0.28, 0.07), vec3(0.28, 0.38, 0.1), 0.5 + 0.5 * sin(vSpin * 0.3));
    gl_FragColor = vec4(color, vFade * 0.45);
  }
`;

export function FallingLeaves() {
  const { windStrength } = useWeather();
  const windRef = useRef(windStrength);
  windRef.current = windStrength;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    const speeds = new Float32Array(COUNT);
    const origins = new Float32Array(COUNT * 2);

    for (let i = 0; i < COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = MIN_RADIUS + Math.random() * (AREA_RADIUS - MIN_RADIUS);
      const ox = Math.cos(angle) * radius;
      const oz = Math.sin(angle) * radius;
      positions[i * 3] = ox;
      positions[i * 3 + 1] = 2 + Math.random() * 2.5;
      positions[i * 3 + 2] = oz;
      origins[i * 2] = ox;
      origins[i * 2 + 1] = oz;
      seeds[i] = Math.random();
      speeds[i] = 0.04 + Math.random() * 0.05;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute("aOrigin", new THREE.BufferAttribute(origins, 2));
    return geo;
  }, []);

  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uWind: { value: 0 } }), []);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uWind.value = windRef.current;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </points>
  );
}
