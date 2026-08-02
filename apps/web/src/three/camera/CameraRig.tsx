"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import type { PerspectiveCamera as ThreePerspectiveCamera } from "three";

const BASE_POSITION: [number, number, number] = [0, 1.6, 5];
const SHAKE_AMOUNT = 0.012; // sehr dezent -- Handheld-Gefuehl, keine Ablenkung

/**
 * Statische Basis-Kamera + sehr sanftes prozedurales Wackeln (mehrere ueberlagerte
 * Sinusfrequenzen statt Pro-Frame-Zufall, siehe VISION.md Qualitaet-Abschnitt).
 * Bewusst KEINE Positions-/FOV-Aenderung der Basis-Kamera hier -- ein Repositionierungs-
 * Versuch fuehrte zweimal zu Render-Regressionen (siehe Commit-Historie); die Basis
 * bleibt die verifiziert funktionierende Einstellung, nur die Mikro-Bewegung ist neu.
 */
export function CameraRig() {
  const camRef = useRef<ThreePerspectiveCamera>(null);

  useFrame(({ clock }) => {
    const cam = camRef.current;
    if (!cam) return;
    const t = clock.getElapsedTime();
    cam.position.x = BASE_POSITION[0] + (Math.sin(t * 0.31) * 0.6 + Math.sin(t * 0.53) * 0.4) * SHAKE_AMOUNT;
    cam.position.y = BASE_POSITION[1] + (Math.sin(t * 0.27 + 1.7) * 0.6 + Math.sin(t * 0.47) * 0.4) * SHAKE_AMOUNT;
    cam.rotation.z = (Math.sin(t * 0.19) * 0.5 + Math.sin(t * 0.35 + 0.8) * 0.5) * SHAKE_AMOUNT * 0.3;
  });

  return <PerspectiveCamera ref={camRef} makeDefault position={BASE_POSITION} fov={45} />;
}
