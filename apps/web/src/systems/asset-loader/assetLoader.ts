import * as THREE from "three";

export interface AssetProgress {
  loaded: number;
  total: number;
  fraction: number;
}

type ProgressListener = (progress: AssetProgress) => void;

/**
 * Zentrales Laden/Cachen von 3D-Assets über THREE.LoadingManager.
 * Phase 1: Interface + Progress-Tracking steht, es wird noch nichts Reales geladen.
 * Konkrete Loader (GLTF, Textur, Audio) hängen sich später über diesen einen
 * LoadingManager ein, damit ein einziger Fortschrittsbalken für die ganze Szene entsteht.
 */
export class AssetLoader {
  readonly manager = new THREE.LoadingManager();
  private cache = new Map<string, unknown>();
  private progressListeners = new Set<ProgressListener>();

  constructor() {
    this.manager.onProgress = (_url, loaded, total) => {
      const progress: AssetProgress = { loaded, total, fraction: total > 0 ? loaded / total : 1 };
      for (const listener of this.progressListeners) listener(progress);
    };
  }

  onProgress(listener: ProgressListener) {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  getCached<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  setCached(key: string, value: unknown) {
    this.cache.set(key, value);
  }

  dispose() {
    this.cache.clear();
    this.progressListeners.clear();
  }
}

export const assetLoader = new AssetLoader();
