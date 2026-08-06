"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { blockTexture, boxMaterials } from "@/three/assets/blockTextures";
import { useWeather } from "@/hooks/useWeather";

/**
 * Waldkulisse aus echten Bloecken.
 *
 * Ersetzt trees.glb -- das enthielt zwei untexturierte Kegel ("Cylinder", "Cylinder.001"),
 * die aus der Vorlage heraus wie Platzhalter wirkten. Baeume werden hier prozedural aus
 * Stamm- und Laubbloecken gesetzt, sodass Anzahl, Hoehe und Kronenform ueber Parameter
 * steuerbar sind, ohne neu zu exportieren.
 *
 * Der komplette Wald belegt zwei InstancedMesh (Staemme, Laub), unabhaengig von der
 * Baumzahl.
 */

// Grosszuegig angesetzt: rund die Haelfte faellt durch den z-Filter weg, uebrig bleiben
// etwa 20 Baeume, die den Hintergrund und die Bildraender fuellen.
const TREE_COUNT = 42;
const INNER_RADIUS = 8.5; // Lichtung freihalten -- Feuer und NPC brauchen Platz
const RADIUS_SPREAD = 6;

// Die Kamera steht auf der positiven z-Achse und blickt Richtung Ursprung. Baeume auf der Kamera-Seite
// landen dadurch neben oder hinter der Linse: im Bild standen ihre Staemme als Saeulen im
// Vordergrund und die Kronen legten sich als Decke ueber die Szene. Gefiltert wird
// deshalb nach der fertigen Position statt nach dem Winkel -- ein Winkelfenster hatte
// Baeume bei 30 Grad (also z=+5) noch durchgelassen.
const MAX_TREE_Z = 0.5;

/** Deterministisch, damit der Wald bei jedem Laden identisch steht. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Block {
  x: number;
  y: number;
  z: number;
}

function buildForest() {
  const rand = mulberry32(20260806);
  const logs: Block[] = [];
  const leaves: Block[] = [];

  for (let i = 0; i < TREE_COUNT; i++) {
    // Winkel gleichmaessig verteilt, aber pro Baum verrauscht -- ein exakter Ring
    // liest sich sofort als Kreis statt als Wald.
    const angle = (i / TREE_COUNT) * Math.PI * 2 + (rand() - 0.5) * 0.42;
    const radius = INNER_RADIUS + rand() * RADIUS_SPREAD;
    const baseX = Math.round(Math.cos(angle) * radius);
    const baseZ = Math.round(Math.sin(angle) * radius);
    if (baseZ > MAX_TREE_Z) continue;
    const trunkHeight = 5 + Math.floor(rand() * 4);

    for (let y = 0; y < trunkHeight; y++) logs.push({ x: baseX, y, z: baseZ });

    // Krone: klassische Minecraft-Eiche -- zwei breite Lagen um die Stammspitze,
    // darueber eine schmale Kappe. Ecken werden ausgeduennt, damit kein Wuerfel entsteht.
    const crownBase = trunkHeight - 2;
    const layers = [
      { dy: 0, extent: 2 },
      { dy: 1, extent: 2 },
      { dy: 2, extent: 1 },
      { dy: 3, extent: 1 },
    ];
    for (const { dy, extent } of layers) {
      for (let dx = -extent; dx <= extent; dx++) {
        for (let dz = -extent; dz <= extent; dz++) {
          const isCorner = Math.abs(dx) === extent && Math.abs(dz) === extent;
          if (isCorner && (dy >= 2 || rand() < 0.65)) continue;
          if (dx === 0 && dz === 0 && dy + crownBase < trunkHeight) continue; // Stamm nicht zubauen
          if (rand() < 0.06) continue; // vereinzelte Luecken
          leaves.push({ x: baseX + dx, y: crownBase + dy, z: baseZ + dz });
        }
      }
    }
  }

  return { logs, leaves };
}

function useMatrices(blocks: Block[]) {
  return useMemo(() => {
    const matrix = new THREE.Matrix4();
    const list = new Float32Array(blocks.length * 16);
    blocks.forEach((b, i) => {
      matrix.makeTranslation(b.x, b.y + 0.5, b.z);
      matrix.toArray(list, i * 16);
    });
    return list;
  }, [blocks]);
}

function Instanced({
  blocks,
  materials,
}: {
  blocks: Block[];
  materials: THREE.Material | THREE.Material[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const matrices = useMatrices(blocks);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < blocks.length; i++) {
      matrix.fromArray(matrices, i * 16);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [blocks, matrices]);

  return (
    // Der Wald steht als Kulisse hinter der Lichtung und wirft keine Schatten: Laub mit
    // alphaTest im Schattendurchlauf ist teuer, und die Kronen liegen ohnehin ausserhalb
    // des Bereichs, den die Schattenkamera abdeckt.
    <instancedMesh ref={ref} args={[undefined, undefined, blocks.length]} material={materials} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}

// Wind-Uniform fuer das Laub: ein Material, ein Zeit-Update pro Frame fuer den ganzen Wald.
const windUniforms = { uTime: { value: 0 }, uWindStrength: { value: 0.2 } };

function patchLeafWind(material: THREE.Material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uWindStrength = windUniforms.uWindStrength;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uTime;
        uniform float uWindStrength;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        {
          // Phase aus der Instanz-Position, damit nicht der ganze Wald im Gleichtakt wippt.
          vec3 instanceOrigin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          float phase = instanceOrigin.x * 0.7 + instanceOrigin.z * 1.3;
          float sway = sin(uTime * 0.9 + phase) * 0.6 + sin(uTime * 1.7 + phase * 1.4) * 0.4;
          // Nur die Krone bewegt sich; bodennahe Bloecke bleiben stehen.
          float heightMask = clamp((instanceOrigin.y - 3.0) * 0.25, 0.0, 1.0);
          transformed.x += sway * heightMask * uWindStrength;
          transformed.z += cos(uTime * 0.75 + phase) * heightMask * uWindStrength * 0.6;
        }`,
      );
  };
  material.needsUpdate = true;
}

export function BlockTrees() {
  const { logs, leaves } = useMemo(() => buildForest(), []);
  const { windStrength } = useWeather();

  const logMaterials = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ map: blockTexture("log_side"), roughness: 1 });
    const top = new THREE.MeshStandardMaterial({ map: blockTexture("log_top"), roughness: 1 });
    return boxMaterials(side, top, top);
  }, []);

  const leafMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      map: blockTexture("leaves"),
      roughness: 1,
      // alphaTest statt transparent: Laub muss sich korrekt in den Tiefenpuffer
      // schreiben, sonst sortieren sich hunderte Bloecke sichtbar falsch.
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });
    patchLeafWind(material);
    return material;
  }, []);

  useFrame(({ clock }) => {
    windUniforms.uTime.value = clock.getElapsedTime();
    // useFrame registriert den Callback bei jedem Render neu -- windStrength ist hier
    // also immer aktuell, ein Ref-Umweg waere ueberfluessig.
    windUniforms.uWindStrength.value = 0.08 + windStrength * 0.3;
  });

  return (
    <group>
      <Instanced blocks={logs} materials={logMaterials} />
      <Instanced blocks={leaves} materials={leafMaterial} />
    </group>
  );
}
