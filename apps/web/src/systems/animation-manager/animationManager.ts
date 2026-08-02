export interface IdleClipDefinition {
  id: string;
  /** relatives Gewicht bei der Zufallsauswahl, kein fixer Loop */
  weight: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
}

type Listener = (clipId: string) => void;

/**
 * Steuert, welcher Idle-Animations-Clip gerade aktiv ist, ohne selbst zu wissen,
 * wie ein Clip abgespielt wird (three/animation bindet das an echte AnimationActions).
 * Auswahl ist gewichtet-zufällig mit variabler Dauer, damit sich nichts linear
 * oder mechanisch anfühlt (siehe VISION.md, Abschnitt Qualität).
 */
export class AnimationManager {
  private clips: IdleClipDefinition[];
  private currentClipId: string;
  private remainingSeconds: number;
  private listeners = new Set<Listener>();

  constructor(clips: IdleClipDefinition[]) {
    if (clips.length === 0) throw new Error("AnimationManager benötigt mindestens einen Clip");
    this.clips = clips;
    this.currentClipId = clips[0].id;
    this.remainingSeconds = this.randomDuration(clips[0]);
  }

  private randomDuration(clip: IdleClipDefinition) {
    return clip.minDurationSeconds + Math.random() * (clip.maxDurationSeconds - clip.minDurationSeconds);
  }

  private pickNextClip(): IdleClipDefinition {
    const totalWeight = this.clips.reduce((sum, c) => sum + c.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const clip of this.clips) {
      roll -= clip.weight;
      if (roll <= 0) return clip;
    }
    return this.clips[this.clips.length - 1];
  }

  getCurrentClipId() {
    return this.currentClipId;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Vom R3F useFrame-Loop aufzurufen. */
  tick(deltaSeconds: number) {
    this.remainingSeconds -= deltaSeconds;
    if (this.remainingSeconds > 0) return;

    const next = this.pickNextClip();
    this.currentClipId = next.id;
    this.remainingSeconds = this.randomDuration(next);
    for (const listener of this.listeners) listener(next.id);
  }
}

export const DEFAULT_CAMPFIRE_IDLE_CLIPS: IdleClipDefinition[] = [
  { id: "sit-idle", weight: 5, minDurationSeconds: 4, maxDurationSeconds: 9 },
  { id: "look-into-fire", weight: 3, minDurationSeconds: 2, maxDurationSeconds: 5 },
  { id: "glance-at-visitor", weight: 1, minDurationSeconds: 1.5, maxDurationSeconds: 2.5 },
];
