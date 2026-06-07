"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WorkoutInput } from "@/types/domain";

type WorkoutStore = {
  draft: WorkoutInput | null;
  setDraft: (draft: WorkoutInput | null) => void;
};

// Zustand is intentionally limited to the active gym-session draft. Durable data lives in IndexedDB.
export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set) => ({
      draft: null,
      setDraft: (draft) => set({ draft }),
    }),
    {
      name: "lift-log-workout-store",
      partialize: (state) => ({ draft: state.draft }),
    },
  ),
);
