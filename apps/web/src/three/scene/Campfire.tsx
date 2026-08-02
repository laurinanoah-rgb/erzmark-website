"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { useWeather } from "@/hooks/useWeather";
import { assetLoader } from "@/systems/asset-loader";

const CAMPFIRE_BASE_MODEL_URL = "/models/campfire-base.glb";

// Erhoehte Plattform aus gekreuzten Balken auf vier Stelzen (Minecraft-Campfire-Block-Optik),
// gebaut in Blender. Ersetzt die fruehere Platzhalter-Zylinder-Loesung.
function CampfireBase() {
  const [scene, setScene] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let cancelled = false;
    assetLoader.loadGLTF(CAMPFIRE_BASE_MODEL_URL).then((gltf) => {
      if (cancelled) return;
      gltf.scene.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      setScene(gltf.scene);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!scene) return null;
  return <primitive object={scene} position={[0, 0, 0.3]} />;
}

// Sprite-Flipbook aus einer echten Blender-Mantaflow-Feuersimulation (EEVEE-gerendert,
// Alpha-Kanal), gepackt als 5x4-Grid-Atlas mit 19 gueltigen Frames (letzte Zelle leer).
// Kein Video/GIF im klassischen Sinn — die Wiedergabe reagiert live auf den Wind aus dem
// weather-manager (Tempo + seitliche Neigung), siehe VISION.md Wetter-Abschnitt.
const ATLAS_URL = "/textures/campfire-flame-atlas.png";
const ATLAS_COLS = 5;
const ATLAS_ROWS = 4;
const FRAME_COUNT = 19;
const BASE_FPS = 14;
const SPRITE_HEIGHT = 1.7;
const SPRITE_ASPECT = 320 / 448; // Breite/Hoehe eines einzelnen Frames im Atlas

function useFireAtlasTexture() {
  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load(ATLAS_URL);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false; // sonst blutet die Nachbarzelle beim Downsampling ins Bild
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1 / ATLAS_COLS, 1 / ATLAS_ROWS);
    return tex;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function FireSprite() {
  const texture = useFireAtlasTexture();
  const { windStrength } = useWeather();
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const playbackTime = useRef(0);
  const windRef = useRef(windStrength);
  windRef.current = windStrength;

  useFrame(({ clock }, delta) => {
    const wind = windRef.current;
    const speedMultiplier = 1 + wind * 1.2;
    playbackTime.current += delta * speedMultiplier;

    const frameIndex = Math.floor(playbackTime.current * BASE_FPS) % FRAME_COUNT;
    const col = frameIndex % ATLAS_COLS;
    const row = Math.floor(frameIndex / ATLAS_COLS);
    texture.offset.set(col / ATLAS_COLS, row / ATLAS_ROWS);

    if (groupRef.current) {
      const t = clock.getElapsedTime();
      const gust = Math.sin(t * 1.7) * 0.5 + 0.5; // 0..1, langsame Boe
      groupRef.current.rotation.z = -wind * 0.35 * gust;
      groupRef.current.position.x = wind * 0.06 * gust;
    }
  });

  return (
    <Billboard position={[0, 0.05, 0.3]}>
      <group ref={groupRef} position={[0, SPRITE_HEIGHT / 2, 0]}>
        <mesh>
          <planeGeometry args={[SPRITE_HEIGHT * SPRITE_ASPECT, SPRITE_HEIGHT]} />
          <meshBasicMaterial
            ref={materialRef}
            map={texture}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </Billboard>
  );
}

export function Campfire() {
  return (
    <group>
      <CampfireBase />
      <FireSprite />
    </group>
  );
}
