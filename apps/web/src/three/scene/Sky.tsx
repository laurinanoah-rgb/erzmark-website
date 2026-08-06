"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWeather } from "@/hooks/useWeather";
import { moonMeshRef } from "@/three/effects/sceneRefs";

/**
 * Nachthimmel: Farbverlauf, blockige Wolkenbaender und der Mond.
 *
 * Zuvor war der Himmel schlicht schwarz -- also rund die Haelfte des Bildes. In der
 * Vorlage traegt genau diese Flaeche die Stimmung: tiefes Nachtblau, das zum Horizont
 * hin aufhellt, davor flache Wolkenbaender in Blockoptik.
 *
 * Die Szene bleibt immer Nacht (VISION.md) -- der Verlauf wird nicht tageszeitabhaengig,
 * nur wetterabhaengig gedaempft.
 */

const SKY_RADIUS = 90;

const vertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vWorldPosition;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform float uMix;

  void main() {
    // Hoehe ueber dem Horizont, 0..1 -- pow zieht den helleren Saum dicht an den Horizont,
    // statt den halben Himmel aufzuhellen.
    float h = clamp(normalize(vWorldPosition).y, 0.0, 1.0);
    vec3 color = mix(uHorizon, uZenith, pow(h, 0.55));
    gl_FragColor = vec4(color * uMix, 1.0);
  }
`;

function SkyDome() {
  const { condition } = useWeather();
  // useRef statt useMemo: die Uniforms werden pro Frame beschrieben, und genau dafuer
  // sind Refs da -- ein useMemo-Ergebnis zu mutieren ist ein Regelverstoss.
  const uniforms = useRef({
    uZenith: { value: new THREE.Color("#050a18") },
    uHorizon: { value: new THREE.Color("#1b2c50") },
    uMix: { value: 1 },
  }).current;

  // Bewoelkt/Regen/Sturm daempfen den Himmel, ohne den Farbton zu wechseln --
  // die Szene soll stilistisch gleich bleiben (VISION.md, Abschnitt Wetter).
  const target = condition === "clear" ? 1 : condition === "fog" ? 0.7 : 0.55;
  useFrame((_, delta) => {
    uniforms.uMix.value += (target - uniforms.uMix.value) * Math.min(delta * 0.6, 1);
  });

  return (
    // renderOrder -1: der Dom zeichnet vor allem anderen und schreibt keine Tiefe --
    // die klassische Skybox-Reihenfolge, damit er zuverlaessig hinter der Szene bleibt.
    <mesh renderOrder={-1}>
      <sphereGeometry args={[SKY_RADIUS, 32, 16]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}

/**
 * Wolkenbaender in Blockoptik: flache Quader hoch oben, in lockeren Reihen. Minecraft
 * rendert Wolken als eine flache Ebene aus Bloecken -- diese Silhouette ist ein
 * wesentlicher Teil des Wiedererkennungswerts in der Vorlage.
 */
// Hoehe so gewaehlt, dass die Baender im oberen Bilddrittel stehen. Bei 34 lagen sie
// vollstaendig ueber dem Bildausschnitt und waren schlicht nicht zu sehen.
const CLOUD_ALTITUDE = 15;
const CLOUD_COUNT = 90;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Clouds() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const drift = useRef(0);
  const { windStrength } = useWeather();

  const blocks = useMemo(() => {
    const rand = mulberry32(4711);
    const out: { x: number; z: number; w: number; d: number }[] = [];
    for (let i = 0; i < CLOUD_COUNT; i++) {
      out.push({
        x: (rand() - 0.5) * 160,
        z: -20 - rand() * 110,
        w: 6 + rand() * 16,
        d: 4 + rand() * 9,
      });
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    blocks.forEach((b, i) => {
      matrix.compose(
        new THREE.Vector3(b.x, CLOUD_ALTITUDE + (i % 3) * 2.5, b.z),
        new THREE.Quaternion(),
        new THREE.Vector3(b.w, 1.6, b.d),
      );
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [blocks]);

  // Sehr langsames Ziehen -- ueber die gesamte Gruppe, damit die Instanzmatrizen
  // nicht jeden Frame neu geschrieben werden muessen.
  useFrame((_, delta) => {
    drift.current += delta * (0.12 + windStrength * 0.5);
    if (ref.current) ref.current.position.x = (drift.current % 160) - 80;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, blocks.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#5f7196" transparent opacity={0.5} fog={false} />
    </instancedMesh>
  );
}

/**
 * Der Mond als Quadrat statt als Kreis -- in Minecraft ist er ein Blocksprite, und die
 * Vorlage zeigt genau diese harte Kante. Der Halo ist eine zweite, groessere Flaeche
 * mit additivem Verlauf.
 */
// Rechts oben im Bild, wie in der Vorlage. Die Werte folgen dem Sichtwinkel der Kamera
// (CameraRig): bei y=34 lag der Mond knapp ueber der oberen Bildkante.
const MOON_POSITION: [number, number, number] = [19, 16, -62];

function Moon() {
  const haloTexture = useMemo(() => {
    // Radialer Verlauf, zur Laufzeit erzeugt: eine 64x64-Datei waere fuer einen
    // weichen Kreis unnoetiger Ballast im Repo.
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(190,210,255,0.55)");
    gradient.addColorStop(0.4, "rgba(150,175,235,0.18)");
    gradient.addColorStop(1, "rgba(120,150,220,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  useLayoutEffect(() => () => haloTexture.dispose(), [haloTexture]);

  return (
    <group position={MOON_POSITION}>
      {/* Deutlich kleiner als zuvor (26): der Halo deckte additiv fast die gesamte
          rechte Bildhaelfte ab und hellte Boden und NPC mit auf. */}
      <mesh>
        <planeGeometry args={[15, 15]} />
        <meshBasicMaterial map={haloTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} toneMapped={false} />
      </mesh>
      <mesh ref={moonMeshRef} position={[0, 0, 0.1]}>
        <planeGeometry args={[7, 7]} />
        <meshBasicMaterial color="#e8eeff" fog={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function Sky() {
  return (
    <group>
      <SkyDome />
      <Clouds />
      <Moon />
    </group>
  );
}
