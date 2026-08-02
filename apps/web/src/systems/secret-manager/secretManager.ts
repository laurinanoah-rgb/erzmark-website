import { SECRETS, type SecretDefinition } from "./secrets";

type SecretListener = (secret: SecretDefinition) => void;

const TYPED_BUFFER_MAX_LENGTH = 32;
const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
};

/**
 * Generischer Trigger-Erkenner für versteckte Events. Aktuell implementiert:
 * "typed-word" (globale Tastatureingabe außerhalb von Formularfeldern).
 * "key-combo"/"date"/"time-of-day" sind im Typsystem vorgesehen, aber noch
 * nicht verdrahtet — bewusst offen für spätere Ergänzung ohne Umbau.
 */
export class SecretManager {
  private secrets: SecretDefinition[];
  private typedBuffer = "";
  private listeners = new Set<SecretListener>();
  private boundKeydownHandler = this.handleKeydown.bind(this);
  private attached = false;

  constructor(secrets: SecretDefinition[] = SECRETS) {
    this.secrets = secrets;
  }

  attach() {
    if (this.attached || typeof window === "undefined") return;
    window.addEventListener("keydown", this.boundKeydownHandler);
    this.attached = true;
  }

  detach() {
    if (!this.attached) return;
    window.removeEventListener("keydown", this.boundKeydownHandler);
    this.attached = false;
  }

  subscribe(listener: SecretListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private handleKeydown(event: KeyboardEvent) {
    if (isEditableTarget(event.target)) return;
    if (event.key.length !== 1) return;

    this.typedBuffer = (this.typedBuffer + event.key.toLowerCase()).slice(-TYPED_BUFFER_MAX_LENGTH);

    for (const secret of this.secrets) {
      if (secret.triggerType !== "typed-word") continue;
      if (this.typedBuffer.endsWith(secret.value)) {
        this.typedBuffer = "";
        for (const listener of this.listeners) listener(secret);
      }
    }
  }
}

export const secretManager = new SecretManager();
