"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { AnimationManager, DEFAULT_CAMPFIRE_IDLE_CLIPS, type IdleClipDefinition } from "@/systems/animation-manager";

/** Muss innerhalb eines R3F <Canvas> verwendet werden (nutzt useFrame). */
export function useAnimationManager(clips: IdleClipDefinition[] = DEFAULT_CAMPFIRE_IDLE_CLIPS) {
  const managerRef = useRef<AnimationManager | null>(null);
  if (!managerRef.current) managerRef.current = new AnimationManager(clips);

  const [currentClipId, setCurrentClipId] = useState(managerRef.current.getCurrentClipId());

  useEffect(() => {
    const unsubscribe = managerRef.current!.subscribe(setCurrentClipId);
    return () => {
      unsubscribe();
    };
  }, []);
  useFrame((_, delta) => managerRef.current!.tick(delta));

  return { currentClipId };
}
