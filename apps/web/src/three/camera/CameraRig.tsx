"use client";

import { PerspectiveCamera } from "@react-three/drei";

/** 35mm-aequivalentes Kino-Objektiv (VISION.md/Kamera-Anforderung), auf die Feuerstelle gerichtet. */
export function CameraRig() {
  return <PerspectiveCamera makeDefault position={[0, 1.6, 5]} fov={45} />;
}
