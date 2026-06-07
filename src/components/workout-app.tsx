"use client";

import { Activity, BarChart3, BookOpen, Dumbbell, LogOut, Menu, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Analytics } from "@/components/analytics";
import { AuthPanel } from "@/components/auth-panel";
import { Dashboard } from "@/components/dashboard";
import { ExerciseLibrary } from "@/components/exercise-library";
import { WorkoutLogger } from "@/components/workout-logger";
import { api } from "@/lib/client-api";
import {
  archiveLocalExercise,
  deleteLocalExercise,
  exportLocalSnapshot,
  exportWorkoutsCsv,
  getLocalData,
  importLocalSnapshot,
  initLocalDatabase,
  mergeServerData,
  saveLocalExercise,
  saveLocalTemplate,
  saveLocalWorkout,
  setLocalFavorite,
  setLocalProfile,
  updateLocalExercise,
  type LocalSnapshot,
} from "@/lib/local-db";
import type { BodyweightEntry, Exercise, ExerciseInput, User, Workout, WorkoutInput, WorkoutTemplate } from "@/types/domain";
import { GhostButton, IconButton, PrimaryButton } from "@/components/ui";

type View = "dashboard" | "log" | "analytics" | "library";

const navItems: Array<{ id: View; label: string; icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }> }> = [
  { id: "dashboard", label: "Dashboard", icon: Activity },
  { id: "log", label: "Log", icon: Dumbbell },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "library", label: "Library", icon: BookOpen },
];

function initialView(): View {
  if (typeof window === "undefined") return "dashboard";
  const requested = new URLSearchParams(window.location.search).get("view");
  return navItems.some((item) => item.id === requested) ? (requested as View) : "dashboard";
}

export function WorkoutApp() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>(initialView);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [bodyweight, setBodyweight] = useState<BodyweightEntry[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const latestBodyweight = useMemo(() => bodyweight.at(-1)?.weightKg || null, [bodyweight]);

  const loadLocalData = useCallback(async () => {
    const data = await getLocalData();
    setExercises(data.exercises);
    setWorkouts(data.workouts);
    setBodyweight(data.bodyweight);
    setTemplates(data.templates);
    if (data.profile) setUser(data.profile);
  }, []);

  const refreshFromServer = useCallback(async () => {
    setError("");
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      await loadLocalData();
      return;
    }

    const response = await api.me();
    if (!response.user) {
      await loadLocalData();
      return;
    }

    const [exerciseData, workoutData, bodyweightData, templateData] = await Promise.all([
      api.exercises(),
      api.workouts(),
      api.bodyweight(),
      api.templates(),
    ]);

    await mergeServerData({
      user: response.user,
      exercises: exerciseData.exercises,
      workouts: workoutData.workouts,
      bodyweight: bodyweightData.bodyweight,
      templates: templateData.templates,
    });
    await loadLocalData();
  }, [loadLocalData]);

  useEffect(() => {
    async function boot() {
      try {
        await initLocalDatabase();
        await loadLocalData();
        await refreshFromServer();
      } catch (err) {
        await loadLocalData();
        setError(err instanceof Error ? err.message : "Loaded offline data.");
      } finally {
        setLoading(false);
      }
    }

    boot();
  }, [loadLocalData, refreshFromServer]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const updateStatus = () => setIsOffline(!navigator.onLine);
    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  async function handleAuthenticated(nextUser: User) {
    setUser(nextUser);
    await setLocalProfile(nextUser);
    await refreshFromServer();
  }

  async function logout() {
    await api.logout().catch(() => undefined);
    await setLocalProfile(null);
    setUser(null);
  }

  async function toggleFavorite(exerciseId: string, favorite: boolean) {
    setExercises((current) =>
      current.map((exercise) => (exercise.id === exerciseId ? { ...exercise, isFavorite: favorite } : exercise)),
    );
    await setLocalFavorite(exerciseId, favorite);
    api.favorite(exerciseId, favorite).catch(() => undefined);
  }

  async function createExercise(input: ExerciseInput) {
    const exercise = await saveLocalExercise(input);
    await loadLocalData();
    return exercise;
  }

  async function updateExercise(exerciseId: string, input: ExerciseInput) {
    await updateLocalExercise(exerciseId, input);
    await loadLocalData();
  }

  async function archiveExercise(exerciseId: string, archive: boolean) {
    await archiveLocalExercise(exerciseId, archive);
    await loadLocalData();
  }

  async function deleteExercise(exerciseId: string) {
    if (!window.confirm("Delete this custom exercise? Existing workout history will stay intact.")) return;
    await deleteLocalExercise(exerciseId);
    await loadLocalData();
  }

  async function saveWorkout(workoutInput: WorkoutInput) {
    const workout = await saveLocalWorkout(workoutInput);
    handleWorkoutSaved(workout);
    if (navigator.onLine) {
      api.saveWorkout(workoutInput).catch(() => undefined);
    }
    return workout;
  }

  async function saveTemplate(templateInput: Pick<WorkoutTemplate, "name" | "category" | "exercises">) {
    const template = await saveLocalTemplate(templateInput);
    setTemplates((current) => [...current, template]);
    if (navigator.onLine) {
      api.saveTemplate(templateInput).catch(() => undefined);
    }
    return template;
  }

  function handleWorkoutSaved(workout: Workout) {
    setWorkouts((current) =>
      [workout, ...current.filter((item) => item.id !== workout.id)].sort(
        (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime(),
      ),
    );
    if (workout.bodyweightKg) {
      setBodyweight((current) => [
        ...current,
        {
          id: `${workout.id}-bodyweight`,
          loggedAt: workout.performedAt,
          weightKg: workout.bodyweightKg || 0,
          notes: "Logged with workout",
        },
      ]);
    }
  }

  async function exportJson() {
    const snapshot = await exportLocalSnapshot();
    downloadFile("lift-log-backup.json", JSON.stringify(snapshot, null, 2), "application/json");
  }

  function exportCsv() {
    downloadFile("workout-history.csv", exportWorkoutsCsv(workouts), "text/csv");
  }

  async function importJson(file: File) {
    const text = await file.text();
    const snapshot = JSON.parse(text) as LocalSnapshot;
    if (!window.confirm("Restore this backup? Current local data will be replaced.")) return;
    await importLocalSnapshot(snapshot);
    await loadLocalData();
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-lg bg-lift/15 text-lift">
            <Dumbbell aria-hidden />
          </div>
          <p className="text-lg font-semibold text-white">Loading Lift Log</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return <AuthPanel onAuthenticated={handleAuthenticated} />;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-3 pb-24 pt-3 md:px-6 md:pb-8">
      <header className="sticky top-0 z-30 -mx-3 border-b border-line bg-coal/88 px-3 py-3 backdrop-blur md:-mx-6 md:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-lift text-coal">
              <Dumbbell size={22} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lift">Lift Log</p>
              <h1 className="text-lg font-semibold leading-tight text-white">Hi, {user.name}</h1>
            </div>
          </div>

          <nav className="hidden rounded-lg border border-line bg-white/[0.04] p-1 md:flex" aria-label="Primary">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${view === item.id ? "bg-lift text-coal" : "text-slate-300 hover:bg-white/[0.06]"}`}
                  onClick={() => setView(item.id)}
                >
                  <Icon size={16} aria-hidden />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <GhostButton className="hidden min-h-10 md:inline-flex" onClick={refreshFromServer}>
              <RefreshCw size={16} aria-hidden />
              Sync
            </GhostButton>
            <GhostButton className="hidden min-h-10 md:inline-flex" onClick={logout}>
              <LogOut size={16} aria-hidden />
              Logout
            </GhostButton>
            <IconButton aria-label="Open menu" className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
              <Menu size={20} aria-hidden />
            </IconButton>
          </div>
        </div>

        {menuOpen ? (
          <div className="mt-3 grid gap-2 md:hidden">
            <PrimaryButton onClick={() => { setView("log"); setMenuOpen(false); }}>Log workout</PrimaryButton>
            <GhostButton onClick={refreshFromServer}>Sync data</GhostButton>
            <GhostButton onClick={logout}>Logout</GhostButton>
          </div>
        ) : null}
      </header>

      {error ? (
        <div className="my-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {isOffline ? (
        <div className="my-4 rounded-lg border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
          Offline mode: workouts, custom exercises, charts, and backups are using local device storage.
        </div>
      ) : null}

      <div className="py-5">
        {view === "dashboard" ? (
          <Dashboard workouts={workouts} bodyweight={bodyweight} onLogWorkout={() => setView("log")} />
        ) : null}
        {view === "log" ? (
          <WorkoutLogger
            exercises={exercises}
            workouts={workouts}
            templates={templates}
            latestBodyweight={latestBodyweight}
            onSaveWorkout={saveWorkout}
            onSaveTemplate={saveTemplate}
            onCreateExercise={createExercise}
          />
        ) : null}
        {view === "analytics" ? (
          <Analytics workouts={workouts} onExportCsv={exportCsv} onExportJson={exportJson} onImportJson={importJson} />
        ) : null}
        {view === "library" ? (
          <ExerciseLibrary
            exercises={exercises}
            workouts={workouts}
            bodyweight={bodyweight}
            onFavorite={toggleFavorite}
            onCreateExercise={createExercise}
            onUpdateExercise={updateExercise}
            onArchiveExercise={archiveExercise}
            onDeleteExercise={deleteExercise}
          />
        ) : null}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-coal/92 px-2 py-2 backdrop-blur md:hidden" aria-label="Mobile primary">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold transition ${view === item.id ? "bg-lift text-coal" : "text-slate-400"}`}
                onClick={() => setView(item.id)}
              >
                <Icon size={19} aria-hidden />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
