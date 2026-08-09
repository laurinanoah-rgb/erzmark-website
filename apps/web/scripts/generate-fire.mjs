/**
 * Erzeugt die Flammensequenz des Lagerfeuers als Flipbook-Atlas.
 *
 * Warum neu: Der bisherige Atlas (campfire-flame-atlas.png) enthaelt keine einzige
 * gesaettigte Feuerfarbe -- die Durchschnittswerte liegen zwischen Beige und Weiss --
 * und ist keine geschlossene Schleife, sondern eine monoton verpuffende Wolke. Als
 * Flamme war er praktisch unsichtbar. Als *Rauch* bleibt er brauchbar und wird dort
 * weiterverwendet (SmokeColumn).
 *
 *   node scripts/generate-fire.mjs
 *
 * Schreibt public/textures/campfire-flame.png. Deterministisch (fester Seed).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng, mulberry32 } from "./lib/png.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "textures", "campfire-flame.png");

const FRAME_W = 64;
const FRAME_H = 96;
const COLS = 8;
const ROWS = 4;
const FRAMES = COLS * ROWS; // 32 -- bei 18 fps eine knapp 1.8 s lange Schleife

/* --------------------------------------------------------- vertikal kachelndes Rauschen */

// Das Rauschgitter wird beim Sampling in beide Richtungen umgebrochen. Dadurch laesst
// es sich ueber die Laufzeit der Schleife um genau eine Gitterhoehe nach unten schieben
// und trifft im letzten Frame wieder exakt den Ausgangszustand -- die Sequenz schliesst
// sich also ohne sichtbaren Sprung.
const NOISE = 32;

function buildNoise(rand) {
  const grid = new Float32Array(NOISE * NOISE);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  return grid;
}

function wrap(v) {
  return ((v % NOISE) + NOISE) % NOISE;
}

function sampleNoise(grid, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const at = (xx, yy) => grid[wrap(yy) * NOISE + wrap(xx)];
  // Smoothstep-Interpolation statt linear -- sonst sieht man das Gitter als Rauten.
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const top = at(x0, y0) * (1 - ux) + at(x0 + 1, y0) * ux;
  const bottom = at(x0, y0 + 1) * (1 - ux) + at(x0 + 1, y0 + 1) * ux;
  return top * (1 - uy) + bottom * uy;
}

// Alle Oktaven vervielfachen die Koordinate ganzzahlig, deshalb kachelt auch die Summe.
function fbm(grid, x, y) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let octave = 0; octave < 4; octave++) {
    value += amplitude * sampleNoise(grid, x * frequency, y * frequency);
    frequency *= 2;
    amplitude *= 0.5;
  }
  return value;
}

/* ------------------------------------------------------------------- Feuer-Farbrampe */

// Von der kuehlen Aussenkante zum weissgluehenden Kern. Genau dieser Verlauf fehlte
// dem alten Atlas vollstaendig.
const RAMP = [
  { at: 0.0, color: [90, 12, 0] },
  { at: 0.25, color: [200, 45, 0] },
  { at: 0.45, color: [255, 105, 10] },
  { at: 0.65, color: [255, 170, 35] },
  { at: 0.85, color: [255, 226, 120] },
  { at: 1.0, color: [255, 250, 220] },
];

function rampColor(t) {
  const h = Math.max(0, Math.min(1, t));
  for (let i = 1; i < RAMP.length; i++) {
    if (h <= RAMP[i].at) {
      const a = RAMP[i - 1];
      const b = RAMP[i];
      const k = (h - a.at) / (b.at - a.at);
      return [
        Math.round(a.color[0] + (b.color[0] - a.color[0]) * k),
        Math.round(a.color[1] + (b.color[1] - a.color[1]) * k),
        Math.round(a.color[2] + (b.color[2] - a.color[2]) * k),
      ];
    }
  }
  return RAMP[RAMP.length - 1].color;
}

const smoothstep = (edge0, edge1, x) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/* --------------------------------------------------------------------------- Zeichnen */

const grid = buildNoise(mulberry32(90210));
const atlas = new Uint8Array(FRAME_W * COLS * FRAME_H * ROWS * 4);
const ATLAS_W = FRAME_W * COLS;

for (let frame = 0; frame < FRAMES; frame++) {
  const phase = frame / FRAMES; // 0..1 ueber die Schleife
  const scroll = phase * NOISE; // genau eine Gitterhoehe -> nahtloser Umbruch
  const originX = (frame % COLS) * FRAME_W;
  const originY = Math.floor(frame / COLS) * FRAME_H;

  for (let py = 0; py < FRAME_H; py++) {
    // 0 an der Glut, 1 an der Flammenspitze
    const yb = 1 - py / (FRAME_H - 1);

    // Silhouette: schmal an der Glut, am breitesten knapp darueber, spitz nach oben.
    const taper = Math.pow(1 - yb, 0.7);
    const footPinch = 0.45 + 0.55 * Math.min(yb * 7, 1);
    const halfWidth = FRAME_W * 0.44 * taper * footPinch;
    if (halfWidth < 0.5) continue;

    // Seitliches Wandern der Flammenachse, nach oben zunehmend.
    const drift =
      Math.sin(phase * Math.PI * 2 + yb * 4.5) * FRAME_W * 0.05 * yb +
      Math.sin(phase * Math.PI * 4 + yb * 2.0) * FRAME_W * 0.025 * yb;
    const centerX = FRAME_W / 2 + drift;

    for (let px = 0; px < FRAME_W; px++) {
      const dx = (px - centerX) / halfWidth;
      if (dx <= -1 || dx >= 1) continue;

      const radial = 1 - dx * dx; // 1 in der Achse, 0 am Rand
      const turbulence = fbm(grid, (px / FRAME_W) * 5.5, (py / FRAME_H) * 7 + scroll);

      // Nach oben kuehlt die Flamme ab; das Rauschen reisst die Zunge dort auf.
      let heat = radial * (0.45 + 1.15 * turbulence) * (1 - Math.pow(yb, 1.4));
      heat = Math.max(0, Math.min(1, heat));

      const alpha = smoothstep(0.16, 0.42, heat) * (1 - Math.pow(yb, 3));
      if (alpha <= 0.004) continue;

      const [r, g, b] = rampColor(heat);
      const i = ((originY + py) * ATLAS_W + originX + px) * 4;
      atlas[i] = r;
      atlas[i + 1] = g;
      atlas[i + 2] = b;
      atlas[i + 3] = Math.round(Math.min(1, alpha) * 255);
    }
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, encodePng(ATLAS_W, FRAME_H * ROWS, atlas));
console.log(`Flammen-Atlas: ${ATLAS_W}x${FRAME_H * ROWS} (${COLS}x${ROWS} Raster, ${FRAMES} Frames) -> ${OUT}`);
