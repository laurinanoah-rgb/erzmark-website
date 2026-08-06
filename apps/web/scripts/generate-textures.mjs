/**
 * Erzeugt die Block-Texturen der Hero-Szene als 16x16-Pixel-Art-PNGs.
 *
 * Warum generiert statt gemalt: Die Texturen sollen im Repo reproduzierbar sein und
 * keine fremden Minecraft-/Resource-Pack-Dateien enthalten (Lizenzfrage, siehe PLAN.md
 * Abschnitt 7). Ein Generator laesst sich ausserdem nachtraeglich umfaerben, ohne dass
 * jemand Pixel nachzeichnen muss.
 *
 *   node scripts/generate-textures.mjs
 *
 * Schreibt nach public/textures/blocks/. Das Ergebnis ist deterministisch (fester Seed),
 * ein erneuter Lauf erzeugt also byte-gleiche Dateien und keine Diff-Unruhe.
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "textures", "blocks");
const SIZE = 16;

/* ---------------------------------------------------------------- PNG-Encoder */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** rgba: Uint8Array der Laenge size*size*4 */
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // Jede Scanline bekommt ein fuehrendes Filter-Byte 0 (kein Filter) -- bei 16x16
  // Pixelart bringt Filterung nichts und haelt den Encoder trivial.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ Zeichnen */

/** Deterministischer PRNG, damit wiederholte Laeufe identische Dateien erzeugen. */
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Canvas {
  constructor(size) {
    this.size = size;
    this.data = new Uint8Array(size * size * 4);
  }
  set(x, y, [r, g, b], a = 255) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return;
    const i = (y * this.size + x) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = a;
  }
  fill(color) {
    for (let y = 0; y < this.size; y++) for (let x = 0; x < this.size; x++) this.set(x, y, color);
  }
}

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
/** Helligkeitsvariation um einen Basiston -- das Rauschen macht Pixelart lebendig. */
const vary = ([r, g, b], amount) => [clamp(r + amount), clamp(g + amount), clamp(b + amount)];

/* -------------------------------------------------------------- Die Texturen */

function grassTop(rand) {
  const c = new Canvas(SIZE);
  const base = [74, 106, 48];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // Zwei Rauschebenen: grobe Flecken + feines Korn, sonst wirkt die Flaeche wie TV-Schnee.
      const patch = Math.floor((rand() - 0.5) * 12);
      const grain = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0 ? 4 : -4;
      c.set(x, y, vary(base, patch + grain));
    }
  }
  return c;
}

function dirt(rand) {
  const c = new Canvas(SIZE);
  const base = [96, 68, 46];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      c.set(x, y, vary(base, Math.floor((rand() - 0.5) * 26)));
    }
  }
  return c;
}

function grassSide(rand) {
  const c = dirt(rand);
  const green = [74, 106, 48];
  // Unregelmaessige Grasnarbe, die ueber die Kante haengt -- eine gerade Trennlinie
  // wuerde sofort wie ein Platzhalter aussehen.
  for (let x = 0; x < SIZE; x++) {
    const depth = 3 + Math.floor(rand() * 3);
    for (let y = 0; y < depth; y++) {
      c.set(x, y, vary(green, Math.floor((rand() - 0.5) * 14)));
    }
  }
  return c;
}

function cobblePath(rand) {
  const c = new Canvas(SIZE);
  const mortar = [44, 43, 42];
  c.fill(mortar);
  const base = [98, 96, 92];
  // Unterschiedlich grosse Steine mit Fuge dazwischen; jeder Stein bekommt einen
  // eigenen Grundton, damit das Pflaster nicht wie ein Raster wirkt.
  const stones = [
    [0, 0, 6, 5], [7, 0, 5, 4], [13, 0, 3, 6],
    [0, 6, 4, 5], [5, 5, 6, 6], [12, 7, 4, 4],
    [0, 12, 7, 4], [8, 12, 4, 4], [13, 11, 3, 5],
  ];
  for (const [sx, sy, w, h] of stones) {
    const tone = Math.floor((rand() - 0.5) * 22);
    for (let y = sy; y < sy + h - 1 && y < SIZE; y++) {
      for (let x = sx; x < sx + w - 1 && x < SIZE; x++) {
        const edge = y === sy || x === sx ? 10 : 0; // leichte Oberkante
        c.set(x, y, vary(base, tone + edge + Math.floor((rand() - 0.5) * 10)));
      }
    }
  }
  return c;
}

function logSide(rand) {
  const c = new Canvas(SIZE);
  const base = [74, 54, 34];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      c.set(x, y, vary(base, Math.floor((rand() - 0.5) * 12)));
    }
  }
  // Senkrechte Rindenfurchen -- geben dem Stamm auf Distanz seine Richtung.
  for (const x of [2, 3, 7, 11, 12]) {
    for (let y = 0; y < SIZE; y++) {
      if (rand() > 0.18) c.set(x, y, vary([54, 38, 23], Math.floor((rand() - 0.5) * 10)));
    }
  }
  return c;
}

function logTop(rand) {
  const c = new Canvas(SIZE);
  const base = [110, 84, 53];
  const mid = (SIZE - 1) / 2;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = Math.hypot(x - mid, y - mid);
      const ring = Math.sin(d * 2.1) * 10; // Jahresringe
      c.set(x, y, vary(base, Math.floor(ring + (rand() - 0.5) * 8)));
    }
  }
  return c;
}

function leaves(rand) {
  const c = new Canvas(SIZE);
  const base = [42, 70, 28];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // Lueckenhaftes Laub: einzelne voll transparente Pixel lassen Licht durch und
      // verhindern, dass die Krone als massiver Wuerfel liest (Minecraft "Fancy"-Optik).
      if (rand() < 0.14) {
        c.set(x, y, base, 0);
        continue;
      }
      c.set(x, y, vary(base, Math.floor((rand() - 0.5) * 34)));
    }
  }
  return c;
}

function planks(rand) {
  const c = new Canvas(SIZE);
  const base = [112, 84, 50];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      c.set(x, y, vary(base, Math.floor((rand() - 0.5) * 14)));
    }
  }
  for (const y of [0, 5, 10, 15]) {
    for (let x = 0; x < SIZE; x++) c.set(x, y, vary([78, 57, 33], Math.floor((rand() - 0.5) * 8)));
  }
  return c;
}

/* ---------------------------------------------------------------------- Lauf */

// Feste, unterschiedliche Seeds pro Textur: gleicher Seed fuer alle wuerde
// sichtbar dieselben Rauschmuster in verschiedenen Bloecken erzeugen.
const TEXTURES = [
  ["grass_top.png", grassTop, 1],
  ["grass_side.png", grassSide, 2],
  ["dirt.png", dirt, 3],
  ["cobble_path.png", cobblePath, 4],
  ["log_side.png", logSide, 5],
  ["log_top.png", logTop, 6],
  ["leaves.png", leaves, 7],
  ["planks.png", planks, 8],
];

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, draw, seed] of TEXTURES) {
  const canvas = draw(mulberry32(seed));
  writeFileSync(join(OUT_DIR, name), encodePng(SIZE, canvas.data));
  console.log(`  ${name}`);
}
console.log(`${TEXTURES.length} Texturen -> ${OUT_DIR}`);
