"use client";

import { useEffect } from "react";
import { audioManager } from "@/systems/audio-manager";

export function useAudioManager() {
  useEffect(() => () => audioManager.dispose(), []);
  return audioManager;
}
