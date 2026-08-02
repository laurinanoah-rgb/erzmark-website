"use client";

import { useProfileStore } from "@/systems/profile-manager";

export function useProfile() {
  return useProfileStore();
}
