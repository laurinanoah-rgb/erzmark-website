"use client";

import { PerspectiveCamera } from "@react-three/drei";

/** Phase 1: statische Kamera auf das Lagerfeuer gerichtet. Bewegung folgt später. */
export function CameraRig() {
  return <PerspectiveCamera makeDefault position={[0, 1.6, 5]} fov={45} />;
}
