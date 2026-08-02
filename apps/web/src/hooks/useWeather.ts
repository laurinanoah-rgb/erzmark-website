"use client";

import { useEffect } from "react";
import { useWeatherStore } from "@/systems/weather-manager";

export function useWeather() {
  const state = useWeatherStore();

  useEffect(() => {
    state.fetchRealWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
