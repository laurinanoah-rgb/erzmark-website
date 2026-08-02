"use client";

import { useEffect, useState } from "react";
import { useSecretManager } from "@/hooks/useSecretManager";

const CONSOLE_LINES = [
  "Initializing...",
  "Connection established...",
  "R.U.D.O.L.F",
  "Access Level 7",
  "Observer detected.",
  "...",
];

/** Rudolf-Geheimnis: Glitch → schwarzer Bildschirm → Fake-Konsole → Achievement. Siehe VISION.md. */
export function SecretOverlay() {
  const { activeSecret, clearActiveSecret } = useSecretManager();
  const [phase, setPhase] = useState<"idle" | "glitch" | "console" | "achievement">("idle");

  useEffect(() => {
    if (!activeSecret || activeSecret.id !== "rudolf") return;
    setPhase("glitch");
    const t1 = setTimeout(() => setPhase("console"), 1000);
    const t2 = setTimeout(() => setPhase("achievement"), 4000);
    const t3 = setTimeout(() => {
      setPhase("idle");
      clearActiveSecret();
    }, 7000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [activeSecret, clearActiveSecret]);

  if (phase === "idle") return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black">
      {phase === "glitch" && (
        <div className="h-full w-full animate-pulse bg-gradient-to-br from-red-900/40 via-black to-cyan-900/40" />
      )}
      {phase === "console" && (
        <pre className="font-mono text-sm text-green-400 md:text-base">
          {CONSOLE_LINES.join("\n")}
        </pre>
      )}
      {phase === "achievement" && (
        <div className="rounded border border-amber-400/60 bg-black/80 px-6 py-4 text-center">
          <p className="text-xs uppercase tracking-widest text-amber-400">Geheime Errungenschaft freigeschaltet</p>
          <p className="mt-1 text-white">&quot;Du solltest das eigentlich nicht wissen.&quot;</p>
        </div>
      )}
    </div>
  );
}
