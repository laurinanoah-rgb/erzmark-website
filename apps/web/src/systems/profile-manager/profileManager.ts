import { create } from "zustand";

export interface MinecraftProfile {
  username: string;
  skinUrl: string;
}

export interface ProfileState {
  isLoggedIn: boolean;
  profile: MinecraftProfile | null;
  login: (profile: MinecraftProfile) => void;
  logout: () => void;
}

// Phase 1: kein echtes MineTrax-Login-Binding, nur der Manager-Vertrag.
// login()/logout() werden später vom Auth-Flow aufgerufen; UI-Komponenten
// (Charakter am Feuer, Serverstatus-Begrüßung) reagieren rein über den Store.
export const useProfileStore = create<ProfileState>((set) => ({
  isLoggedIn: false,
  profile: null,
  login: (profile) => set({ isLoggedIn: true, profile }),
  logout: () => set({ isLoggedIn: false, profile: null }),
}));
