/**
 * Rendert die laufende Seite und legt einen Screenshot ab.
 *
 * Hintergrund: Die Commit-Historie enthaelt mehrere Render-Regressionen, die erst
 * spaeter aufgefallen sind (siehe auch die Warnung in three/camera/CameraRig.tsx).
 * Eine 3D-Szene laesst sich nicht am Code beurteilen -- sie muss angesehen werden.
 * Dieses Skript macht daraus einen wiederholbaren Schritt statt einer Handarbeit.
 *
 * Voraussetzung: `npm run dev` laeuft bereits.
 *
 *   node scripts/screenshot.mjs [ziel.png] [--url=...] [--wait=20000] [--width=1600] [--height=750]
 *
 * Der Standard-Ausschnitt entspricht dem Seitenverhaeltnis des Mockups (1600x750),
 * damit sich Ergebnis und Vorlage direkt uebereinanderlegen lassen.
 */

import { createRequire } from "node:module";

// Playwright wird bewusst nicht als Projekt-Abhaengigkeit gefuehrt: es zieht
// Browser-Binaries nach, die im Produktions-Build nichts zu suchen haben. Die
// Aufloesung ueber createRequire findet sowohl eine lokale als auch eine global
// installierte Version (ESM-Imports beachten NODE_PATH nicht, require schon).
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error(
    "Playwright fehlt.\n" +
      "  lokal : npm i -D playwright\n" +
      "  global: npm i -g playwright   (dann mit NODE_PATH=$(npm root -g) aufrufen)",
  );
  process.exit(1);
}

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const output = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "screenshot.png";
const url = arg("url", "http://localhost:3000");
const waitMs = Number(arg("wait", "20000"));
const width = Number(arg("width", "1600"));
const height = Number(arg("height", "750"));

const browser = await chromium.launch({
  // Ohne GPU faellt Chromium auf SwiftShader zurueck; ohne diese Flags gibt es
  // in Container-/CI-Umgebungen gar keinen WebGL-Kontext und damit ein leeres Bild.
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

try {
  const page = await browser.newPage({ viewport: { width, height } });

  const problems = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`console: ${msg.text()}`);
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });

  // Assets laden asynchron nach und die Idle-Animationen brauchen Anlauf --
  // ein Screenshot direkt nach "networkidle" zeigt eine halb aufgebaute Szene.
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: output });

  const canvasCount = await page.evaluate(() => document.querySelectorAll("canvas").length);
  if (canvasCount === 0) {
    console.error("FEHLER: kein <canvas> im DOM -- die Szene hat nicht gerendert.");
    if (problems.length > 0) console.error(problems.join("\n"));
    process.exit(1);
  }

  console.log(`Screenshot: ${output} (${width}x${height})`);
  if (problems.length > 0) {
    console.warn(`\n${problems.length} Meldung(en) waehrend des Renderns:`);
    console.warn([...new Set(problems)].join("\n"));
  }
} finally {
  await browser.close();
}
