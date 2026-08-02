import { create } from "zustand";

export type WeatherCondition = "clear" | "rain" | "snow" | "fog" | "storm";

export interface WeatherState {
  condition: WeatherCondition;
  windStrength: number; // 0..1
  isLoading: boolean;
  setCondition: (condition: WeatherCondition, windStrength?: number) => void;
  fetchRealWeather: () => Promise<void>;
}

// Fallback-Koordinaten (Berlin), falls Geolocation verweigert wird oder fehlschlägt.
const FALLBACK_COORDS = { latitude: 52.52, longitude: 13.405 };
const GEOLOCATION_TIMEOUT_MS = 5000;
const MAX_WIND_SPEED_KMH = 60; // ab hier gilt windStrength als 1.0

function getCoords(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(FALLBACK_COORDS);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(FALLBACK_COORDS),
      { timeout: GEOLOCATION_TIMEOUT_MS },
    );
  });
}

// WMO Weather interpretation codes (Open-Meteo), gruppiert auf unsere 5 Zustände.
// https://open-meteo.com/en/docs -> "WMO Weather interpretation codes"
function mapWmoCodeToCondition(code: number): WeatherCondition {
  if (code === 45 || code === 48) return "fog";
  if (code === 95 || code === 96 || code === 99) return "storm";
  if ([71, 73, 75, 77, 85, 86, 56, 57, 66, 67].includes(code)) return "snow";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "rain";
  return "clear"; // 0, 1, 2, 3 (klar bis bewölkt, kein Niederschlag)
}

function normalizeWindStrength(windSpeedKmh: number, condition: WeatherCondition): number {
  const fromSpeed = Math.min(windSpeedKmh / MAX_WIND_SPEED_KMH, 1);
  return condition === "storm" ? Math.max(fromSpeed, 0.7) : fromSpeed;
}

async function fetchOpenMeteoWeather(): Promise<{ condition: WeatherCondition; windStrength: number }> {
  const { latitude, longitude } = await getCoords();
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code,wind_speed_10m`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Open-Meteo request failed: ${response.status}`);

  const data = await response.json();
  const condition = mapWmoCodeToCondition(data.current.weather_code);
  const windStrength = normalizeWindStrength(data.current.wind_speed_10m, condition);

  return { condition, windStrength };
}

export const useWeatherStore = create<WeatherState>((set) => ({
  condition: "clear",
  windStrength: 0.2,
  isLoading: false,
  setCondition: (condition, windStrength = 0.2) => set({ condition, windStrength }),
  fetchRealWeather: async () => {
    set({ isLoading: true });
    try {
      const result = await fetchOpenMeteoWeather();
      set({ condition: result.condition, windStrength: result.windStrength, isLoading: false });
    } catch {
      // Bei Fehler (Netzwerk, blockiertes Geolocation-Prompt etc.) bleibt der zuletzt
      // bekannte Zustand erhalten statt die Szene auf einen Fehlerzustand zu setzen.
      set({ isLoading: false });
    }
  },
}));
