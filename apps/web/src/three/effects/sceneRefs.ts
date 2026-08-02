import type { Mesh } from "three";
import type { RefObject } from "react";

// Gemeinsame Objekt-Referenz zwischen Environment (Mond-Mesh) und PostProcessing
// (GodRays-Lichtquelle) — vermeidet Prop-Drilling durch den Szenenbaum fuer eine
// reine Rendering-Verkabelung, kein Teil des eigentlichen App-Zustands.
export const moonMeshRef: RefObject<Mesh | null> = { current: null };
