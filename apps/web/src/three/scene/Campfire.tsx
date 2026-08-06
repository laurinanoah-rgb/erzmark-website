"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { useWeather } from "@/hooks/useWeather";
import { assetLoader } from "@/systems/asset-loader";
import { EmberParticles } from "@/three/particles/EmberParticles";

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
  return <primitive object={scene} />;
}

// Sprite-Flipbook aus einer echten Blender-Mantaflow-Feuersimulation (EEVEE-gerendert,
// Alpha-Kanal), gepackt als 5x4-Grid-Atlas mit 19 gueltigen Frames (letzte Zelle leer).
// Kein Video/GIF im klassischen Sinn — die Wiedergabe reagiert live auf den Wind aus dem
// weather-manager (Tempo + seitliche Neigung), siehe VISION.md Wetter-Abschnitt.
const ATLAS_URL = "/textures/campfire-flame-atlas.png";
const ATLAS_COLS = 5;
const ATLAS_ROWS = 4;
const BASE_FPS = 14;

// Der Atlas wurde zellenweise auf Alpha-Deckung vermessen: Zelle 4 ist komplett leer,
// Zelle 19 dagegen gefuellt. Die fruehere Wiedergabe "frameIndex % 19" lief ueber 0..18,
// zeigte damit einmal pro Durchlauf einen Leerframe (Feuer blinkt aus) und liess die
// letzte gueltige Zelle ungenutzt. Deshalb eine explizite Liste statt eines Modulo.
const VALID_FRAMES = [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

// Die Sequenz ist keine geschlossene Schleife: die Deckung faellt ueber den Atlas monoton
// von 38% auf 16% (aufloesende Wolke, siehe PLAN.md 1.2). Vorwaerts-und-zurueck vermeidet
// den harten Sprung am Ende, bis das Feuer in Phase 2 durch echte Flammen ersetzt wird.
const PING_PONG_LENGTH = VALID_FRAMES.length * 2 - 2;

function frameAt(step: number): number {
  const cycle = ((step % PING_PONG_LENGTH) + PING_PONG_LENGTH) % PING_PONG_LENGTH;
  const index = cycle < VALID_FRAMES.length ? cycle : PING_PONG_LENGTH - cycle;
  return VALID_FRAMES[index];
}
// Die Feuerstelle ist 0.62 Einheiten breit; bei 1.7 Hoehe war das Sprite mit 1.21 Breite
// fast doppelt so breit wie die Holzscheite darunter. 1.25 ergibt 0.89 Breite -- die Flamme
// steht damit auf den Scheiten, ohne seitlich darueber hinauszuquellen.
const SPRITE_HEIGHT = 1.25;
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

    const frameIndex = frameAt(Math.floor(playbackTime.current * BASE_FPS));
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
    <Billboard position={[0, 0.05, 0]}>
      <group ref={groupRef} position={[0, SPRITE_HEIGHT / 2, 0]}>
        <mesh>
          <planeGeometry args={[SPRITE_HEIGHT * SPRITE_ASPECT, SPRITE_HEIGHT]} />
          {/* Zwischenloesung: Der Atlas enthaelt keine gesaettigten Feuerfarben (gemessen:
              Ø RGB zwischen Beige und Weiss), weshalb die Flamme praktisch unsichtbar blieb.
              Die Einfaerbung macht sie erkennbar, ersetzt aber keinen echten Farbverlauf --
              die neue Flammensequenz kommt in Phase 2 (PLAN.md). */}
          <meshBasicMaterial
            ref={materialRef}
            map={texture}
            color="#ff7020"
            transparent
            // Additiv statt normal ueberblendet: eine Flamme strahlt selbst, sie verdeckt
            // den Hintergrund nicht. Bei normaler Ueberblendung ging das blasse Sprite in
            // der dunklen Szene praktisch unter; additiv addiert es Licht und wird vom
            // Bloom in PostProcessing korrekt als Glut aufgenommen.
            blending={THREE.AdditiveBlending}
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
      <EmberParticles />
    </group>
  );
}
