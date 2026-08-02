export type SecretTriggerType = "typed-word" | "key-combo" | "date" | "time-of-day";

export interface SecretDefinition {
  id: string;
  triggerType: SecretTriggerType;
  /** für "typed-word": das Wort; für "key-combo": z.B. "ctrl+shift+e"; für "date": "MM-DD" */
  value: string;
}

/**
 * Datengetriebene Liste aller versteckten Events. Neue Geheimnisse werden hier
 * ergänzt, nicht als Sonderfall-Code im Manager (siehe VISION.md, Abschnitt Geheimnisse).
 * Bewusst nicht weiter dokumentiert/kommentiert — Besucher sollen sie entdecken.
 */
export const SECRETS: SecretDefinition[] = [
  { id: "rudolf", triggerType: "typed-word", value: "rudolf" },
];
