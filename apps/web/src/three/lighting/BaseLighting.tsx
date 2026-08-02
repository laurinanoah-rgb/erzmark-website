"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { PointLight } from "three";

const FLICKER_TARGET_CHANGE_SECONDS = 0.18; // wie oft sich das Flacker-Ziel aendert
const FLICKER_SMOOTHING = 4; // hoeher = traegeres, weicheres Nachziehen

/**
 * Ambient-Nachtlicht + gedaempftes Mondlicht-Fuellicht + flackerndes Feuer-Punktlicht.
 * Das Fuelllicht verhindert, dass das Feuer als einzige Lichtquelle das Gesicht wie in
 * einer Taschenlampen-Grusel-Szene von unten anstrahlt (siehe VISION.md: atmosphärisch,
 * nicht gruselig). Das Flackern ist ein geglätteter Random-Walk statt Pro-Frame-Rauschen,
 * damit es "langsam" statt "hektisch" wirkt (VISION.md, Abschnitt Qualität).
 */
export function BaseLighting() {
  const fireLightRef = useRef<PointLight>(null);
  const flickerTarget = useRef(0);
  const flickerCurrent = useRef(0);
  const timeSinceTargetChange = useRef(0);

  useFrame(({ clock }, delta) => {
    if (!fireLightRef.current) return;
    const t = clock.getElapsedTime();

    timeSinceTargetChange.current += delta;
    if (timeSinceTargetChange.current > FLICKER_TARGET_CHANGE_SECONDS) {
      flickerTarget.current = (Math.random() - 0.5) * 0.5;
      timeSinceTargetChange.current = 0;
    }
    flickerCurrent.current += (flickerTarget.current - flickerCurrent.current) * Math.min(delta * FLICKER_SMOOTHING, 1);

    const breathing = Math.sin(t * 1.3) * 0.12;
    fireLightRef.current.intensity = 2.0 + breathing + flickerCurrent.current;
  });

  return (
    <>
      <ambientLight intensity={0.26} color="#212c4a" />
      {/* Kaltes, gedaempftes Mondlicht-Fuellicht von schraeg oben-vorne, damit Gesicht/Koerper
          nicht ausschliesslich von unten durchs Feuer beleuchtet werden. */}
      <directionalLight
        position={[2, 4, 4]}
        intensity={0.45}
        color="#5f7bb8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0025}
      />
      <pointLight
        ref={fireLightRef}
        position={[0, 0.35, 0.3]}
        color="#ff8a3d"
        intensity={2.0}
        distance={8}
        decay={2}
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.004}
      />
    </>
  );
}
