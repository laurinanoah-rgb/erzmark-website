import { create } from "zustand";

export type WeatherCondition = "clear" | "rain" | "snow" | "fog" | "storm";

export interface WeatherState {
  condition: WeatherCondition;
  windStrength: number; // 0..1
  isLoading: boolean;
  setCondition: (condition: WeatherCondition, windStrength?: number) => void;
  fetchRealWeather: () => Promise<void>;
}

// Phase 1: kein echtes Wetter-API-Binding, nur der Manager-Vertrag.
// fetchRealWeather wird später durch einen echten Provider ersetzt,
// ohne dass Konsumenten des Stores sich ändern müssen.
async function fetchWeatherMock(): Promise<{ condition: WeatherCondition; windStrength: number }> {
  return { condition: "clear", windStrength: 0.2 };
}

export const useWeatherStore = create<WeatherState>((set) => ({
  condition: "clear",
  windStrength: 0.2,
  isLoading: false,
  setCondition: (condition, windStrength = 0.2) => set({ condition, windStrength }),
  fetchRealWeather: async () => {
    set({ isLoading: true });
    try {
      const result = await fetchWeatherMock();
      set({ condition: result.condition, windStrength: result.windStrength, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
