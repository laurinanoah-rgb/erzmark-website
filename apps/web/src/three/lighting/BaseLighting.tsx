"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { DirectionalLight, PointLight } from "three";

const MOON_BASE_INTENSITY = 0.45;

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
  const moonLightRef = useRef<DirectionalLight>(null);
  const flickerTarget = useRef(0);
  const flickerCurrent = useRef(0);
  const timeSinceTargetChange = useRef(0);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    if (fireLightRef.current) {
      timeSinceTargetChange.current += delta;
      if (timeSinceTargetChange.current > FLICKER_TARGET_CHANGE_SECONDS) {
        flickerTarget.current = (Math.random() - 0.5) * 0.5;
        timeSinceTargetChange.current = 0;
      }
      flickerCurrent.current += (flickerTarget.current - flickerCurrent.current) * Math.min(delta * FLICKER_SMOOTHING, 1);

      const breathing = Math.sin(t * 1.3) * 0.12;
      fireLightRef.current.intensity = 2.0 + breathing + flickerCurrent.current;
    }

    if (moonLightRef.current) {
      // Sehr langsame, mehrstufige Modulation -- wirkt wie ziehende Wolken vor dem
      // Mond, kein hartes Blinken (Anforderung: "Mondlicht veraendert leicht die Stimmung").
      const drift = Math.sin(t * 0.05) * 0.5 + Math.sin(t * 0.013 + 2.1) * 0.5;
      moonLightRef.current.intensity = MOON_BASE_INTENSITY + drift * 0.12;
    }
  });

  return (
    <>
      <ambientLight intensity={0.26} color="#212c4a" />
      {/* Kaltes Mondlicht aus Richtung des Mond-Meshes (Environment.tsx: [6, 9, -12]),
          also von oben-rechts-hinten. Zuvor stand es bei [2, 4, 4] -- vor der Szene und
          damit auf der gleichen Seite wie die Kamera, wodurch der kalte Kantenlicht-Saum
          fehlte, der im Mockup die Silhouette des NPC gegen den dunklen Wald absetzt. */}
      <directionalLight
        ref={moonLightRef}
        position={[5, 7, -6]}
        intensity={MOON_BASE_INTENSITY}
        color="#5f7bb8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0025}
      />
      {/* Schwaches kaltes Fuelllicht von vorne: verhindert, dass das Gesicht bei
          reinem Gegenlicht komplett absaeuft, ohne den Kantenlicht-Effekt aufzuheben. */}
      <directionalLight position={[1, 2.5, 5]} intensity={0.12} color="#4a5f92" />
      <pointLight
        ref={fireLightRef}
        position={[0, 0.35, 0]}
        color="#ff8a3d"
        intensity={2.0}
        distance={8}
        decay={2}
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.004}
      />
      {/* Zweites, schattenloses Bodenglut-Licht: tiefer + weiter gestreut, damit warmes
          Licht auch auf Bodendecke, Baumstaemme und Charakter-Beine "blutet" statt nur
          direkt an der Flamme sichtbar zu sein (Anforderung: "Licht streut auf
          umliegende Objekte", "orangefarbene Reflexionen"). */}
      <pointLight position={[0, 0.05, 0]} color="#ff5f1a" intensity={0.35} distance={4} decay={1.8} />
    </>
  );
}
