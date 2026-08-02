"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { assetLoader } from "@/systems/asset-loader";
import { useAnimationManager } from "@/hooks/useAnimationManager";

const MODEL_URL = "/models/character.glb";
const CROSSFADE_SECONDS = 0.6;

/**
 * Laedt das in Blender gebaute Charakter-Rig (Thomas Rig Legacy, Custom-Export)
 * und bindet die drei Idle-Clips an den bereits existierenden AnimationManager.
 * Der Manager selbst weiss nichts von three.js — er liefert nur die aktuelle Clip-ID,
 * dieser Consumer uebersetzt das in echte THREE.AnimationMixer-Wiedergabe.
 */
export function CharacterModel() {
  const { currentClipId } = useAnimationManager();
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Record<string, THREE.AnimationAction>>({});
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
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

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  if (!gltf) return null;

  return <primitive object={gltf.scene} position={[0, 0, -1]} />;
}
