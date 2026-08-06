import * as THREE from "three";

/**
 * Zentrale Quelle fuer die Block-Texturen aus scripts/generate-textures.mjs.
 *
 * Pixel-Art braucht exakt die gegenteilige Filterung von Fototexturen: ohne
 * NearestFilter verwaschen 16x16-Texturen zu Farbbrei, sobald sie nah an der Kamera
 * liegen. Mipmaps bleiben dagegen aktiv -- die Bodenflaeche reicht bis zum Waldrand,
 * und ohne Mipmaps flimmert das Raster in der Entfernung stark.
 */

const BASE = "/textures/blocks";
const loader = new THREE.TextureLoader();
const cache = new Map<string, THREE.Texture>();

export type BlockTextureName =
  | "grass_top"
  | "grass_side"
  | "dirt"
  | "cobble_path"
  | "log_side"
  | "log_top"
  | "leaves"
  | "planks";

export function blockTexture(name: BlockTextureName, repeat = 1): THREE.Texture {
  const key = `${name}:${repeat}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const texture = loader.load(`${BASE}/${name}.png`);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  // Nearest innerhalb der Mip-Stufe, linear zwischen den Stufen: harte Pixelkanten
  // in der Nahsicht, aber ruhiger Uebergang in die Tiefe statt Moire.
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  // Flache Blickwinkel auf den Boden lassen die Textur ohne anisotrope Filterung
  // in der Tiefe zu Streifen zerfallen.
  texture.anisotropy = 4;

  cache.set(key, texture);
  return texture;
}

/**
 * Materialreihenfolge einer BoxGeometry: +X, -X, +Y, -Y, +Z, -Z.
 * Ein Grasblock braucht drei verschiedene Texturen (Seite, Oberseite, Unterseite) --
 * diese Helfer halten die Reihenfolge an einer Stelle statt in jeder Komponente.
 */
export function boxMaterials(side: THREE.Material, top: THREE.Material, bottom: THREE.Material) {
  return [side, side, top, bottom, side, side];
}
