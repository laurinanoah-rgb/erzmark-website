"use client";

import { useEffect, useState } from "react";
import { secretManager } from "@/systems/secret-manager";
import type { SecretDefinition } from "@/systems/secret-manager";

/** Bindet den globalen secretManager an React; liefert das zuletzt ausgelöste Secret. */
export function useSecretManager() {
  const [activeSecret, setActiveSecret] = useState<SecretDefinition | null>(null);

  useEffect(() => {
    secretManager.attach();
    const unsubscribe = secretManager.subscribe((secret) => setActiveSecret(secret));
    return () => {
      unsubscribe();
      secretManager.detach();
    };
  }, []);

  return { activeSecret, clearActiveSecret: () => setActiveSecret(null) };
}
