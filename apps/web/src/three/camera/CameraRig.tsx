"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { PerspectiveCamera as ThreePerspectiveCamera } from "three";

/**
 * Bildaufbau nach dem Mockup: leichte Untersicht, Feuer im linken Bilddrittel,
 * NPC im rechten, viel Kopfraum fuer Rauch und Himmel.
 *
 * Die Kamera steht bewusst tiefer als die Blickhoehe eines Stehenden: dadurch ragen die
 * Baumkronen nach oben aus dem Bild, was dem Wald seine Groesse gibt. Das Blickziel liegt
 * zwischen Feuer (x=0) und NPC, aber naeher am Feuer -- so rutscht das Feuer links der
 * Mitte und der NPC nach rechts.
 */
// Abstand an die korrigierte Figurengroesse angepasst: der NPC ist jetzt echte 1.8
// Einheiten hoch (zuvor durch fehlerhafte Bounding-Box auf die Haelfte normalisiert)
// und fuellte bei 2.85 Abstand fast das ganze Bild.
const BASE_POSITION: [number, number, number] = [0.62, 1.18, 4.1];
const LOOK_AT = new THREE.Vector3(0.62, 0.98, 0);
const FOV = 46;

const SHAKE_AMOUNT = 0.012; // sehr dezent -- Handheld-Gefuehl, keine Ablenkung

/**
 * Statische Basis-Kamera + sehr sanftes prozedurales Wackeln (mehrere ueberlagerte
 * Sinusfrequenzen statt Pro-Frame-Zufall, siehe VISION.md Qualitaet-Abschnitt).
 *
 * Die Blickrichtung wird nach dem Versatz explizit auf LOOK_AT gesetzt, damit das
 * Wackeln die Bildkomposition nur minimal atmen laesst, statt sie wegdriften zu lassen.
 */
export function CameraRig() {
  const camRef = useRef<ThreePerspectiveCamera>(null);

  useFrame(({ clock }) => {
    const cam = camRef.current;
    if (!cam) return;
    const t = clock.getElapsedTime();
    cam.position.x = BASE_POSITION[0] + (Math.sin(t * 0.31) * 0.6 + Math.sin(t * 0.53) * 0.4) * SHAKE_AMOUNT;
    cam.position.y = BASE_POSITION[1] + (Math.sin(t * 0.27 + 1.7) * 0.6 + Math.sin(t * 0.47) * 0.4) * SHAKE_AMOUNT;
    cam.lookAt(LOOK_AT);
    cam.rotation.z += (Math.sin(t * 0.19) * 0.5 + Math.sin(t * 0.35 + 0.8) * 0.5) * SHAKE_AMOUNT * 0.3;
  });

  return <PerspectiveCamera ref={camRef} makeDefault position={BASE_POSITION} fov={FOV} />;
}
