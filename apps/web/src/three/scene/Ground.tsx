"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { blockTexture, boxMaterials } from "@/three/assets/blockTextures";

/**
 * Blockgelaende statt einer eingefaerbten Ebene.
 *
 * Die Vorlage zeigt eine durchgehend texturierte Lichtung mit sichtbaren Blockkanten
 * und einem Pflasterweg. Eine flache Farbflaeche kann das nicht leisten -- ihr fehlen
 * genau die Kanten, an denen sich Feuer- und Mondlicht brechen, und damit der Eindruck
 * von Material. Umgesetzt als zwei InstancedMesh (Gras, Pflaster), also zwei Draw Calls
 * fuer das gesamte Gelaende (VISION.md, Abschnitt Performance: Instancing).
 */

// Ungerade Kantenlaenge, damit ein Block exakt im Ursprung unter der Feuerstelle sitzt.
const GRID = 33;
const HALF = (GRID - 1) / 2;

/**
 * Der Weg verlaeuft im Vordergrund quer durchs Bild und schwingt leicht -- eine
 * schnurgerade Achse wuerde sofort gebaut statt gewachsen wirken.
 */
function pathCenterZ(x: number): number {
  // Weiter von der Kamera weg als zuvor (2.1): dort lag der Weg direkt unter der Linse
  // und fuellte als graue Flaeche das gesamte untere Bilddrittel. Jetzt laeuft er hinter
  // der Feuerstelle durch, und im Vordergrund bleibt Gras.
  return 0.6 + Math.sin(x * 0.42) * 0.9 + Math.sin(x * 0.17 + 1.3) * 0.5;
}

function isPath(x: number, z: number): boolean {
  // Schmaler (zuvor 1.1): der Weg soll die Lichtung queren, nicht sie ersetzen.
  return Math.abs(z - pathCenterZ(x)) < 0.75;
}

/**
 * Sehr flaches, deterministisches Hoehenrauschen. Die Lichtung soll eben genug bleiben,
 * dass Feuer und NPC sauber stehen -- die Stufen dienen nur der Silhouette am Rand.
 */
function heightAt(x: number, z: number): number {
  const distance = Math.hypot(x, z);
  if (distance < 3.2) return 0; // ebener Kern um Feuerstelle und NPC
  const noise = Math.sin(x * 0.7) * Math.cos(z * 0.55) + Math.sin((x + z) * 0.31);
  const ramp = Math.min((distance - 3.2) / 6, 1); // Stufen erst nach aussen zulassen
  return Math.round(noise * ramp * 1.4);
}

interface Cell {
  x: number;
  z: number;
  y: number;
}

function buildCells() {
  const grass: Cell[] = [];
  const path: Cell[] = [];
  for (let ix = -HALF; ix <= HALF; ix++) {
    for (let iz = -HALF; iz <= HALF; iz++) {
      // Der Weg liegt auf Nullhoehe, sonst wuerde er ueber die Stufen springen.
      const onPath = isPath(ix, iz);
      const y = onPath ? 0 : heightAt(ix, iz);
      (onPath ? path : grass).push({ x: ix, z: iz, y });
    }
  }
  return { grass, path };
}

function useInstanceMatrices(cells: Cell[]) {
  return useMemo(() => {
    const matrix = new THREE.Matrix4();
    const list = new Float32Array(cells.length * 16);
    cells.forEach((cell, i) => {
      // Blockoberkante liegt auf cell.y -- die Box ist 1 hoch, ihr Mittelpunkt also 0.5 tiefer.
      matrix.makeTranslation(cell.x, cell.y - 0.5, cell.z);
      matrix.toArray(list, i * 16);
    });
    return list;
  }, [cells]);
}

function InstancedBlocks({
  cells,
  materials,
}: {
  cells: Cell[];
  materials: THREE.Material | THREE.Material[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const matrices = useInstanceMatrices(cells);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < cells.length; i++) {
      matrix.fromArray(matrices, i * 16);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [cells, matrices]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cells.length]} material={materials} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}

export function Ground() {
  const { grass, path } = useMemo(() => buildCells(), []);

  const grassMaterials = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ map: blockTexture("grass_side"), roughness: 1 });
    const top = new THREE.MeshStandardMaterial({ map: blockTexture("grass_top"), roughness: 1 });
    const bottom = new THREE.MeshStandardMaterial({ map: blockTexture("dirt"), roughness: 1 });
    return boxMaterials(side, top, bottom);
  }, []);

  const pathMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ map: blockTexture("cobble_path"), roughness: 1 }),
    [],
  );

  return (
    <group>
      {/* Das Gelaende empfaengt Schatten, wirft aber selbst keine: ueber tausend
          schattenwerfende Instanzen kosten jeden Frame einen zweiten Durchlauf durch
          die komplette Geometrie, und das Ergebnis waere nur die Selbstverschattung
          einer nahezu ebenen Flaeche. Schatten kommen von NPC und Feuerstelle -- den
          Objekten, bei denen sie das Bild tragen. */}
      <InstancedBlocks cells={grass} materials={grassMaterials} />
      <InstancedBlocks cells={path} materials={pathMaterial} />
    </group>
  );
}
