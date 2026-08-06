"use client";

import { useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { assetLoader } from "@/systems/asset-loader";
import { useWeather } from "@/hooks/useWeather";

const CAPE_URL = "/models/cape.glb";
// Gemessene Meshhoehe (Box3 der geladenen Szene): y 0..0.85, Ursprung am unteren Saum.
const CAPE_HEIGHT = 0.85;
// Schulterhoehe eines 1.8 Einheiten hohen Spielers; der Umhang haengt von dort nach unten.
const CAPE_SHOULDER_Y = 1.4;
const capeWindUniforms = { uTime: { value: 0 }, uWindStrength: { value: 0.25 } };

function patchCapeWind(material: THREE.Material) {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = capeWindUniforms.uTime;
    shader.uniforms.uWindStrength = capeWindUniforms.uWindStrength;
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
          // Die Hoehe des Umhangs liegt in y (gemessen: y 0..0.85, z nur 0..0.05).
          // Zuvor stand hier position.z als Hoehenachse -- ueber die 5 cm Tiefe ergab die
          // Maske ueberall ~0.95, wodurch das gesamte Mesh starr mitschwang statt den Saum
          // ausschwingen zu lassen. Oben (Schulteransatz) muss die Maske 0 sein, unten 1.
          float hangMask = clamp(1.0 - position.y / ${CAPE_HEIGHT.toFixed(2)}, 0.0, 1.0);
          float sway = sin(uTime * 1.4 + position.x * 3.0) * 0.5 + sin(uTime * 2.6) * 0.3;
          transformed.x += sway * hangMask * uWindStrength;
          transformed.z -= abs(sin(uTime * 1.1)) * hangMask * uWindStrength * 0.4;
        }`,
      );
  };
  material.needsUpdate = true;
}

// Umhang: eigenstaendiges, nicht ans Skelett gebundenes Mesh (Armature-Bindung
// verzerrte die Geometrie unvorhersehbar, siehe character.blend-Historie) --
// haengt starr am Ruecken, Leben kommt komplett aus dem Wind-Vertex-Shader.
export function Cape() {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const { windStrength } = useWeather();

  useEffect(() => {
    let cancelled = false;
    assetLoader.loadGLTF(CAPE_URL).then((gltf) => {
      if (cancelled) return;
      gltf.scene.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.castShadow = true;
          const material = node.material as THREE.Material;
          patchCapeWind(material);
        }
      });
      setScene(gltf.scene);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useFrame(({ clock }) => {
    capeWindUniforms.uTime.value = clock.getElapsedTime();
    capeWindUniforms.uWindStrength.value = 0.12 + windStrength * 0.35;
  });

  if (!scene) return null;
  // Lokal zum NPC statt in Weltkoordinaten: die Platzierung in der Welt macht die
  // <Npc>-Gruppe in SceneRoot. Zuvor stand hier eine feste Weltposition, die sich vom
  // Charakter geloest haette, sobald dieser verschoben oder skaliert wird.
  return <primitive object={scene} position={[0, CAPE_SHOULDER_Y - CAPE_HEIGHT, -0.14]} />;
}
