"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { assetLoader } from "@/systems/asset-loader";
import { useAnimationManager } from "@/hooks/useAnimationManager";
import { useProfile } from "@/hooks/useProfile";

const MODEL_URL = "/models/character.glb";
const CROSSFADE_SECONDS = 0.6;
const SKIN_MATERIAL_NAME = "Skin_normal";
const textureLoader = new THREE.TextureLoader();

// Minecraft-Skins sind Pixel-Art auf 64x64: kein Mipmapping/Filtering, sonst verschwimmt die Textur.
// flipY=false, weil das GLB-UV-Layout der glTF-Konvention folgt (Blender-Export invertiert bereits).
function configureSkinTexture(texture: THREE.Texture) {
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function findSkinMaterial(scene: THREE.Object3D): THREE.MeshStandardMaterial | null {
  let found: THREE.MeshStandardMaterial | null = null;
  scene.traverse((node) => {
    if (found || !(node instanceof THREE.Mesh)) return;
    const material = node.material;
    if (!Array.isArray(material) && material.name === SKIN_MATERIAL_NAME) {
      found = material as THREE.MeshStandardMaterial;
    }
  });
  return found;
}

/**
 * Laedt das in Blender gebaute Charakter-Rig (Thomas Rig Legacy, Custom-Export)
 * und bindet die drei Idle-Clips an den bereits existierenden AnimationManager.
 * Der Manager selbst weiss nichts von three.js — er liefert nur die aktuelle Clip-ID,
 * dieser Consumer uebersetzt das in echte THREE.AnimationMixer-Wiedergabe.
 */
export function CharacterModel() {
  const { currentClipId } = useAnimationManager();
  const { profile } = useProfile();
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Record<string, THREE.AnimationAction>>({});
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const skinMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const defaultSkinTextureRef = useRef<THREE.Texture | null>(null);
  const [gltf, setGltf] = useState<GLTF | null>(null);

  useEffect(() => {
    let cancelled = false;
    assetLoader.loadGLTF(MODEL_URL).then((loaded) => {
      if (cancelled) return;
      const mixer = new THREE.AnimationMixer(loaded.scene);
      mixerRef.current = mixer;
      const actions: Record<string, THREE.AnimationAction> = {};
      for (const clip of loaded.animations) {
        actions[clip.name] = mixer.clipAction(clip);
      }
      actionsRef.current = actions;

      const skinMaterial = findSkinMaterial(loaded.scene);
      skinMaterialRef.current = skinMaterial;
      defaultSkinTextureRef.current = skinMaterial?.map ?? null;

      setGltf(loaded);
    });
    return () => {
      cancelled = true;
      mixerRef.current?.stopAllAction();
    };
  }, []);

  useEffect(() => {
    const next = actionsRef.current[currentClipId];
    if (!next) return;
    const previous = activeActionRef.current;
    next.reset().play();
    if (previous && previous !== next) {
      previous.crossFadeTo(next, CROSSFADE_SECONDS, false);
    } else {
      next.fadeIn(CROSSFADE_SECONDS);
    }
    activeActionRef.current = next;
    // gltf als Dep: erzwingt einen Re-Run, sobald das Modell (und damit actionsRef) bereit ist.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClipId, gltf]);

  // Personalisierung (VISION.md: "Der Skin wird automatisch geladen"): eingeloggt -> echter
  // Minecraft-Skin, ausgeloggt -> der neutrale Erzmark-Abenteurer (Default-Textur aus dem GLB).
  useEffect(() => {
    const material = skinMaterialRef.current;
    if (!material || !gltf) return;

    if (!profile?.skinUrl) {
      if (material.map !== defaultSkinTextureRef.current) {
        material.map = defaultSkinTextureRef.current;
        material.needsUpdate = true;
      }
      return;
    }

    let cancelled = false;
    textureLoader.load(profile.skinUrl, (texture) => {
      if (cancelled) return;
      material.map = configureSkinTexture(texture);
      material.needsUpdate = true;
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.skinUrl, gltf]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  if (!gltf) return null;

  return <primitive object={gltf.scene} position={[0, 0, -1]} />;
}
