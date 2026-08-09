"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWeather } from "@/hooks/useWeather";

/**
 * Aufsteigende Rauchsaeule ueber dem Lagerfeuer.
 *
 * In der Vorlage ist der Rauch das groesste bewegte Element des Bildes -- eine breite,
 * sich aufloesende Wolkensaeule, die bis in den Himmel reicht. In der Szene fehlte sie
 * bislang vollstaendig.
 *
 * Verwendet campfire-flame-atlas.png weiter: Die Messung hatte gezeigt, dass der Atlas
 * als Feuer unbrauchbar ist (keine Feuerfarben, kein Loop), aber genau das zeigt, was er
 * wirklich enthaelt -- eine verpuffende Wolke, deren Deckung ueber die Sequenz von 38%
 * auf 16% faellt. Als Rauchschwade ist das exakt der richtige Verlauf.
 *
 * Jede Schwade laeuft ihre Sequenz einmal von unten nach oben durch und startet dann neu.
 * Die Starts sind versetzt, sodass eine durchgehende Saeule entsteht statt eines Pulsierens.
 */

const ATLAS_URL = "/textures/campfire-flame-atlas.png";
const ATLAS_COLS = 5;
const ATLAS_ROWS = 4;
// Zelle 4 des Rasters ist leer (zellenweise auf Alpha-Deckung vermessen) -- sie wird
// uebersprungen, sonst verschwindet eine Schwade fuer einen Frame komplett.
const VALID_FRAMES = [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const PUFF_COUNT = 9;
// Bei FOV 46 und rund 4 Einheiten Kameraabstand sind nur ~3.5 Einheiten Bildhoehe
// sichtbar. Mit den urspruenglichen 6.5 stiegen die Schwaden sofort aus dem Bild und
// die Saeule war praktisch unsichtbar -- sie muss innerhalb des Ausschnitts leben.
const RISE_HEIGHT = 2.8;
const LIFETIME_SECONDS = 6;
const START_SCALE = 0.6;
const END_SCALE = 2.2;

interface Puff {
  /** Startversatz in der Lebenszeit, damit die Schwaden nicht im Gleichtakt laufen. */
  offset: number;
  /** Seitliche Grundtendenz -- ohne sie stapeln sich alle Schwaden exakt uebereinander. */
  lateral: number;
  swayPhase: number;
  swaySpeed: number;
}

function buildPuffs(): Puff[] {
  return Array.from({ length: PUFF_COUNT }, (_, i) => ({
    offset: (i / PUFF_COUNT) * LIFETIME_SECONDS,
    lateral: Math.sin(i * 2.7) * 0.22,
    swayPhase: i * 1.9,
    swaySpeed: 0.35 + (i % 3) * 0.12,
  }));
}

/**
 * Eine Schwade. Eigenes Material pro Schwade (billig), aber alle teilen sich dieselbe
 * Textur -- der Frameversatz steckt in einem Uniform statt in `texture.offset`, weil
 * dieser sonst global fuer alle Schwaden gelten wuerde.
 */
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uMap;
  uniform vec2 uFrameOffset;
  uniform vec2 uFrameScale;
  uniform float uOpacity;
  uniform vec3 uTint;
  uniform float uAlphaGain;

  void main() {
    vec4 texel = texture2D(uMap, vUv * uFrameScale + uFrameOffset);
    if (texel.a < 0.01) discard;
    // Nur der Alphakanal wird uebernommen, die Farbe kommt komplett aus uTint. Die
    // RGB-Werte des Atlas sind ein nahezu einheitliches Warmbeige -- als Rauchfarbe
    // unbrauchbar, und multipliziert man sie mit dem Tint, laesst sich die Helligkeit
    // der Saeule nicht mehr gezielt einstellen.
    //
    // Der Atlas erreicht gemessen hoechstens 123 von 255 Alpha (Mittel 40). Ohne
    // Verstaerkung bleibt die Saeule selbst bei voller Deckkraft unsichtbar; das Clamp
    // haelt den dichten Kern bei 1.0, statt ihn ueberzusteuern.
    float alpha = min(texel.a * uAlphaGain, 1.0) * uOpacity;
    gl_FragColor = vec4(uTint, alpha);
  }
`;

function SmokePuff({ puff, texture }: { puff: Puff; texture: THREE.Texture }) {
  const meshRef = useRef<THREE.Mesh>(null);
  // Pro-Frame-Uniforms werden ueber diese Referenz geschrieben, nicht ueber das unten
  // erzeugte Objekt: die Startwerte landen zwar im Material, spaetere Mutationen des
  // uebergebenen Objekts erreichten es aber nicht mehr (nachgewiesen -- die Schwaden
  // blieben unsichtbar, obwohl uOpacity rechnerisch bei ~0.8 lag). Der Umweg ueber das
  // Material trifft immer die Uniforms, die tatsaechlich gerendert werden.
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { windStrength } = useWeather();

  const initialUniforms = useMemo(() => ({
    uMap: { value: texture },
    uFrameOffset: { value: new THREE.Vector2() },
    uFrameScale: { value: new THREE.Vector2(1 / ATLAS_COLS, 1 / ATLAS_ROWS) },
    uOpacity: { value: 0 },
    // Warmes Hellgrau wie in der Vorlage: Holzrauch, der den Feuerschein aufnimmt --
    // ein kuehler Blaugrauton liess die Saeule wie Dampf wirken. Hell genug, um sich
    // vom Nachthimmel abzuheben.
    uTint: { value: new THREE.Color("#a7a29a") },
    // 255/123 waere die reine Normalisierung auf den gemessenen Spitzenwert des Atlas;
    // etwas darueber, damit auch die duennen Randbereiche noch Substanz bekommen.
    uAlphaGain: { value: 2.4 },
  }), [texture]);

  useFrame(({ clock, camera }) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;

    const t = (clock.getElapsedTime() + puff.offset) % LIFETIME_SECONDS;
    const life = t / LIFETIME_SECONDS; // 0..1

    // Steigt schnell an und wird nach oben hin traeger -- heisse Luft verliert Auftrieb.
    const rise = Math.pow(life, 0.75) * RISE_HEIGHT;
    const sway = Math.sin(clock.getElapsedTime() * puff.swaySpeed + puff.swayPhase) * 0.3 * life;

    mesh.position.set(
      puff.lateral + sway + windStrength * rise * 0.35,
      // Startet ueber der Flammenspitze (Sprite-Hoehe 1.5), nicht in ihr.
      0.95 + rise,
      puff.lateral * 0.5,
    );

    const scale = START_SCALE + (END_SCALE - START_SCALE) * life;
    mesh.scale.setScalar(scale);

    // Einblenden am Feuer, langes Ausblenden nach oben.
    material.uniforms.uOpacity.value = Math.min(life / 0.12, 1) * (1 - Math.pow(life, 2.2));

    const frame = VALID_FRAMES[Math.min(Math.floor(life * VALID_FRAMES.length), VALID_FRAMES.length - 1)];
    material.uniforms.uFrameOffset.value.set(
      (frame % ATLAS_COLS) / ATLAS_COLS,
      Math.floor(frame / ATLAS_COLS) / ATLAS_ROWS,
    );

    // Billboard von Hand: quaternion der Kamera uebernehmen ist billiger als eine
    // zusaetzliche <Billboard>-Gruppe pro Schwade.
    mesh.quaternion.copy(camera.quaternion);
  });

  return (
    <mesh ref={meshRef} renderOrder={2}>
      <planeGeometry args={[1, 1.4]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={initialUniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

export function SmokeColumn() {
  const puffs = useMemo(() => buildPuffs(), []);
  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load(ATLAS_URL);
    tex.colorSpace = THREE.SRGBColorSpace;
    // Ohne Mipmaps: beim Verkleinern blutet sonst die Nachbarzelle des Rasters ins Bild.
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  return (
    <group>
      {puffs.map((puff, i) => (
        <SmokePuff key={i} puff={puff} texture={texture} />
      ))}
    </group>
  );
}
