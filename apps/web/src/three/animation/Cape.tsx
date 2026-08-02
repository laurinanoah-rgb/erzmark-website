"use client";

import { useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { assetLoader } from "@/systems/asset-loader";
import { useWeather } from "@/hooks/useWeather";

const CAPE_URL = "/models/cape.glb";
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
          // position.z ist hier "Hoehe ab Schulteransatz nach unten" (lokaler Ursprung oben) --
          // je weiter unten (kleineres z), desto staerker schwingt der Saum.
          float hangMask = clamp(1.0 - position.z * 1.1, 0.0, 1.0);
          float sway = sin(uTime * 1.4 + position.x * 3.0) * 0.5 + sin(uTime * 2.6) * 0.3;
          transformed.x += sway * hangMask * uWindStrength;
          transformed.y -= abs(sin(uTime * 1.1)) * hangMask * uWindStrength * 0.4;
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
  return <primitive object={scene} position={[0, 0.78, -1.18]} />;
}
