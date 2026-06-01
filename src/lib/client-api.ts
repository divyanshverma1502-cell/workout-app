import type { BodyweightEntry, Exercise, User, Workout, WorkoutInput, WorkoutTemplate } from "@/types/domain";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Request failed.");
  }

  return response.json() as Promise<T>;
}

export const api = {
  me: () => requestJson<{ user: User | null }>("/api/auth/me"),
  login: (email: string, password: string) =>
    requestJson<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signup: (name: string, email: string, password: string) =>
    requestJson<{ user: User }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  logout: () => requestJson<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  exercises: () => requestJson<{ exercises: Exercise[] }>("/api/exercises"),
  favorite: (exerciseId: string, favorite: boolean) =>
    requestJson<{ ok: true }>("/api/exercises/favorites", {
      method: "PATCH",
      body: JSON.stringify({ exerciseId, favorite }),
    }),
  workouts: () => requestJson<{ workouts: Workout[] }>("/api/workouts"),
  saveWorkout: (workout: WorkoutInput) =>
    requestJson<{ workout: Workout }>("/api/workouts", {
      method: "POST",
      body: JSON.stringify(workout),
    }),
  bodyweight: () => requestJson<{ bodyweight: BodyweightEntry[] }>("/api/bodyweight"),
  saveBodyweight: (weightKg: number, notes?: string) =>
    requestJson<{ entry: BodyweightEntry }>("/api/bodyweight", {
      method: "POST",
      body: JSON.stringify({ weightKg, notes, loggedAt: new Date().toISOString() }),
    }),
  templates: () => requestJson<{ templates: WorkoutTemplate[] }>("/api/templates"),
  saveTemplate: (template: Pick<WorkoutTemplate, "name" | "category" | "exercises">) =>
    requestJson<{ template: WorkoutTemplate }>("/api/templates", {
      method: "POST",
      body: JSON.stringify(template),
    }),
};
