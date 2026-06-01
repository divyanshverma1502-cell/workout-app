"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WorkoutInput } from "@/types/domain";

type QueuedWorkout = WorkoutInput & {
  clientId: string;
  queuedAt: string;
};

type WorkoutStore = {
  draft: WorkoutInput | null;
  offlineQueue: QueuedWorkout[];
  setDraft: (draft: WorkoutInput | null) => void;
  queueWorkout: (workout: WorkoutInput) => void;
  removeQueuedWorkout: (clientId: string) => void;
  clearQueue: () => void;
};

// Only volatile gym-session data lives in Zustand. Saved workouts, sessions, and bodyweight history stay in SQLite through API routes.
export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set) => ({
      draft: null,
      offlineQueue: [],
      setDraft: (draft) => set({ draft }),
      queueWorkout: (workout) =>
        set((state) => ({
          offlineQueue: [
            ...state.offlineQueue,
            { ...workout, clientId: crypto.randomUUID(), queuedAt: new Date().toISOString() },
          ],
        })),
      removeQueuedWorkout: (clientId) =>
        set((state) => ({
          offlineQueue: state.offlineQueue.filter((workout) => workout.clientId !== clientId),
        })),
      clearQueue: () => set({ offlineQueue: [] }),
    }),
    {
      name: "lift-log-workout-store",
      partialize: (state) => ({ draft: state.draft, offlineQueue: state.offlineQueue }),
    },
  ),
);
