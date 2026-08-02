export interface AmbientEventDefinition {
  id: string;
  weight: number;
  durationSeconds: number;
}

type EventListener = (event: AmbientEventDefinition) => void;

const DEFAULT_MIN_INTERVAL_SECONDS = 90;
const DEFAULT_MAX_INTERVAL_SECONDS = 240;

/**
 * Ambient-Zufallsevents, die die Welt auch bei völliger Inaktivität lebendig
 * wirken lassen (rote Augen im Wald, ein Schatten, eine Rune) — siehe VISION.md,
 * Abschnitt Atmosphäre. Bewusst selten und unregelmäßig getaktet, nie im festen Loop.
 */
export class EasterEggManager {
  private events: AmbientEventDefinition[];
  private listeners = new Set<EventListener>();
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(events: AmbientEventDefinition[]) {
    this.events = events;
  }

  private scheduleNext() {
    const delaySeconds =
      DEFAULT_MIN_INTERVAL_SECONDS + Math.random() * (DEFAULT_MAX_INTERVAL_SECONDS - DEFAULT_MIN_INTERVAL_SECONDS);
    this.timeoutId = setTimeout(() => this.fireRandomEvent(), delaySeconds * 1000);
  }

  private fireRandomEvent() {
    if (this.events.length > 0) {
      const totalWeight = this.events.reduce((sum, e) => sum + e.weight, 0);
      let roll = Math.random() * totalWeight;
      let chosen = this.events[0];
      for (const event of this.events) {
        roll -= event.weight;
        if (roll <= 0) {
          chosen = event;
          break;
        }
      }
      for (const listener of this.listeners) listener(chosen);
    }
    this.scheduleNext();
  }

  start() {
    if (this.timeoutId !== null) return;
    this.scheduleNext();
  }

  stop() {
    if (this.timeoutId !== null) clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }

  subscribe(listener: EventListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const DEFAULT_AMBIENT_EVENTS: AmbientEventDefinition[] = [
  { id: "red-eyes-in-forest", weight: 2, durationSeconds: 1.5 },
  { id: "shadow-crossing", weight: 2, durationSeconds: 2 },
  { id: "rune-flicker", weight: 1, durationSeconds: 1 },
];

export const easterEggManager = new EasterEggManager(DEFAULT_AMBIENT_EVENTS);
