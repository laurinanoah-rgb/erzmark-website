"use client";

import { wrapEffect } from "@react-three/postprocessing";
import { Effect } from "postprocessing";
import { Uniform, Vector2 } from "three";

// Echtes Screen-Space-Hitzeflimmern: verzerrt den bereits gerenderten Frame lokal
// um die Feuerposition (Bildschirmkoordinaten), nicht nur eine kosmetische Textur-
// Animation auf der Flammen-Sprite selbst. Faellt mit der Distanz zur Feuerposition ab.
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uFirePos;
  uniform float uStrength;

  void mainUv(inout vec2 uv) {
    float horizontalFalloff = smoothstep(0.16, 0.0, abs(uv.x - uFirePos.x));
    float verticalBand = smoothstep(uFirePos.y - 0.02, uFirePos.y + 0.05, uv.y)
      * smoothstep(uFirePos.y + 0.34, uFirePos.y + 0.1, uv.y);
    float influence = horizontalFalloff * verticalBand;
    float wave = sin((uv.y * 55.0) - uTime * 3.2) * 0.5 + sin((uv.y * 97.0) - uTime * 5.1) * 0.5;
    uv.x += wave * uStrength * influence;
  }
`;

class HeatHazeEffectImpl extends Effect {
  constructor() {
    super("HeatHazeEffect", fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ["uTime", new Uniform(0)],
        ["uFirePos", new Uniform(new Vector2(0.5, 0.68))],
        ["uStrength", new Uniform(0.0035)],
      ]),
    });
  }

  update(_renderer: unknown, _inputBuffer: unknown, deltaTime: number) {
    const time = this.uniforms.get("uTime")!;
    time.value += deltaTime;
  }
}

export const HeatHaze = wrapEffect(HeatHazeEffectImpl);
