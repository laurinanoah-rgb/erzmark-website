"use client";

import { useEffect, useState } from "react";
import { easterEggManager } from "@/systems/easter-egg-manager";
import type { AmbientEventDefinition } from "@/systems/easter-egg-manager";

export function useEasterEggManager() {
  const [activeEvent, setActiveEvent] = useState<AmbientEventDefinition | null>(null);

  useEffect(() => {
    easterEggManager.start();
    const unsubscribe = easterEggManager.subscribe((event) => {
      setActiveEvent(event);
      setTimeout(() => setActiveEvent(null), event.durationSeconds * 1000);
    });
    return () => {
      unsubscribe();
      easterEggManager.stop();
    };
  }, []);

  return { activeEvent };
}
