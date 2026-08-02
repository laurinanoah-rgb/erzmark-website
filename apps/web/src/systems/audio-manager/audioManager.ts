export type AudioLayer = "ambient" | "weather" | "effect";

interface RegisteredTrack {
  id: string;
  layer: AudioLayer;
  element: HTMLAudioElement;
}

/**
 * Framework-neutraler Audio-Manager. Kein React, kein globaler Singleton-Import-Zwang
 * aus anderen Managern heraus — Konsumenten binden sich über hooks/useAudioManager.
 * Phase 1: Interface steht, es werden noch keine echten Sounds ausgeliefert.
 */
export class AudioManager {
  private tracks = new Map<string, RegisteredTrack>();
  private layerVolumes: Record<AudioLayer, number> = {
    ambient: 0.6,
    weather: 0.5,
    effect: 0.8,
  };
  private muted = false;

  register(id: string, src: string, layer: AudioLayer = "ambient", loop = true) {
    if (this.tracks.has(id)) return;
    const element = new Audio(src);
    element.loop = loop;
    element.volume = this.muted ? 0 : this.layerVolumes[layer];
    this.tracks.set(id, { id, layer, element });
  }

  play(id: string) {
    this.tracks.get(id)?.element.play().catch(() => {
      // Autoplay-Policy: wird ignoriert, bis eine erste Nutzerinteraktion stattfand.
    });
  }

  stop(id: string) {
    const track = this.tracks.get(id);
    if (!track) return;
    track.element.pause();
    track.element.currentTime = 0;
  }

  setLayerVolume(layer: AudioLayer, volume: number) {
    this.layerVolumes[layer] = volume;
    for (const track of this.tracks.values()) {
      if (track.layer === layer) track.element.volume = this.muted ? 0 : volume;
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    for (const track of this.tracks.values()) {
      track.element.volume = muted ? 0 : this.layerVolumes[track.layer];
    }
  }

  dispose() {
    for (const track of this.tracks.values()) {
      track.element.pause();
    }
    this.tracks.clear();
  }
}

export const audioManager = new AudioManager();
