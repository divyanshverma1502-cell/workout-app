"use client";

import { seedExercises, seedTemplates } from "@/lib/seed-data";
import { workoutVolume } from "@/lib/metrics";
import type {
  BodyweightEntry,
  Exercise,
  ExerciseInput,
  User,
  Workout,
  WorkoutInput,
  WorkoutTemplate,
} from "@/types/domain";

const databaseName = "lift-log-offline";
const databaseVersion = 1;

const stores = {
  meta: "meta",
  profile: "profile",
  exercises: "exercises",
  workouts: "workouts",
  bodyweight: "bodyweight",
  templates: "templates",
} as const;

type StoreName = (typeof stores)[keyof typeof stores];

export type LocalSnapshot = {
  version: 1;
  exportedAt: string;
  profile: User | null;
  exercises: Exercise[];
  workouts: Workout[];
  bodyweight: BodyweightEntry[];
  templates: WorkoutTemplate[];
};

let databasePromise: Promise<IDBDatabase> | null = null;

export async function initLocalDatabase() {
  const db = await getDatabase();
  const seeded = await getValue<boolean>(db, stores.meta, "seeded");
  if (seeded) return;

  const now = new Date().toISOString();
  await putMany(
    db,
    stores.exercises,
    seedExercises.map((exercise) => ({ ...exercise, createdAt: now, updatedAt: now })),
  );
  await putMany(db, stores.templates, seedTemplates);
  await putValue(db, stores.meta, "seeded", true);
}

export async function getLocalProfile() {
  const db = await getDatabase();
  return ((await getValue<User>(db, stores.profile, "current")) || null);
}

export async function setLocalProfile(user: User | null) {
  const db = await getDatabase();
  if (user) {
    await putValue(db, stores.profile, "current", user);
  } else {
    await deleteValue(db, stores.profile, "current");
  }
}

export async function getLocalData() {
  await initLocalDatabase();
  const db = await getDatabase();
  const [profile, exercises, workouts, bodyweight, templates] = await Promise.all([
    getLocalProfile(),
    getAll<Exercise>(db, stores.exercises),
    getAll<Workout>(db, stores.workouts),
    getAll<BodyweightEntry>(db, stores.bodyweight),
    getAll<WorkoutTemplate>(db, stores.templates),
  ]);

  return {
    profile,
    exercises: exercises
      .map(normalizeExercise)
      .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name)),
    workouts: workouts.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()),
    bodyweight: bodyweight.sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()),
    templates: templates.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  };
}

export async function mergeServerData(input: {
  user?: User | null;
  exercises?: Exercise[];
  workouts?: Workout[];
  bodyweight?: BodyweightEntry[];
  templates?: WorkoutTemplate[];
}) {
  await initLocalDatabase();
  const db = await getDatabase();

  if (input.user) await setLocalProfile(input.user);
  if (input.exercises) {
    const localExercises = await getAll<Exercise>(db, stores.exercises);
    const localById = new Map(localExercises.map((exercise) => [exercise.id, exercise]));
    await putMany(
      db,
      stores.exercises,
      input.exercises.map((exercise) => {
        const existing = localById.get(exercise.id);
        return normalizeExercise({
          ...exercise,
          isFavorite: existing?.isFavorite || exercise.isFavorite,
          source: existing?.source || exercise.source || "seed",
          notes: existing?.notes || exercise.notes || null,
          archivedAt: existing?.archivedAt || null,
          createdAt: existing?.createdAt || exercise.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }),
    );
  }
  if (input.workouts) await putMany(db, stores.workouts, input.workouts.map(normalizeWorkout));
  if (input.bodyweight) await putMany(db, stores.bodyweight, input.bodyweight);
  if (input.templates) await putMany(db, stores.templates, input.templates);
}

export async function saveLocalExercise(input: ExerciseInput) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const exercise: Exercise = normalizeExercise({
    id: slugId(input.name),
    name: input.name.trim(),
    category: input.category,
    isBodyweight: Boolean(input.isBodyweight),
    isFavorite: false,
    primaryMuscles: input.category === "Custom" ? ["Custom"] : [input.category],
    notes: input.notes?.trim() || null,
    source: "custom",
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  const existing = await getValue<Exercise>(db, stores.exercises, exercise.id);
  if (existing) {
    exercise.id = `${exercise.id}-${Date.now().toString(36)}`;
  }

  await putValue(db, stores.exercises, exercise.id, exercise);
  return exercise;
}

export async function updateLocalExercise(exerciseId: string, changes: Partial<ExerciseInput> & { isFavorite?: boolean }) {
  const db = await getDatabase();
  const current = await getValue<Exercise>(db, stores.exercises, exerciseId);
  if (!current) throw new Error("Exercise not found.");

  const next = normalizeExercise({
    ...current,
    name: changes.name?.trim() || current.name,
    category: changes.category || current.category,
    notes: typeof changes.notes === "string" ? changes.notes.trim() : current.notes,
    isBodyweight: typeof changes.isBodyweight === "boolean" ? changes.isBodyweight : current.isBodyweight,
    isFavorite: typeof changes.isFavorite === "boolean" ? changes.isFavorite : current.isFavorite,
    updatedAt: new Date().toISOString(),
  });

  await putValue(db, stores.exercises, next.id, next);
  return next;
}

export async function archiveLocalExercise(exerciseId: string, archive: boolean) {
  const db = await getDatabase();
  const exercise = await getValue<Exercise>(db, stores.exercises, exerciseId);
  if (!exercise) throw new Error("Exercise not found.");
  const next = normalizeExercise({
    ...exercise,
    archivedAt: archive ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  });
  await putValue(db, stores.exercises, next.id, next);
  return next;
}

export async function deleteLocalExercise(exerciseId: string) {
  const db = await getDatabase();
  const exercise = await getValue<Exercise>(db, stores.exercises, exerciseId);
  if (exercise?.source !== "custom") {
    throw new Error("Built-in exercises can be archived, not deleted.");
  }
  await deleteValue(db, stores.exercises, exerciseId);
}

export async function setLocalFavorite(exerciseId: string, favorite: boolean) {
  return updateLocalExercise(exerciseId, { isFavorite: favorite });
}

export async function saveLocalWorkout(input: WorkoutInput) {
  const db = await getDatabase();
  const workoutId = crypto.randomUUID();
  const workout: Workout = normalizeWorkout({
    id: workoutId,
    name: input.name.trim() || "Workout",
    performedAt: input.performedAt,
    bodyweightKg: input.bodyweightKg ?? null,
    notes: input.notes || "",
    totalVolume: workoutVolume(input),
    createdAt: new Date().toISOString(),
    exercises: input.exercises.map((exercise) => ({
      id: crypto.randomUUID(),
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      category: exercise.category,
      notes: exercise.notes || "",
      sets: exercise.sets.map((set, index) => ({
        id: crypto.randomUUID(),
        ...set,
        setNumber: index + 1,
      })),
    })),
  });

  await putValue(db, stores.workouts, workout.id, workout);
  if (workout.bodyweightKg) {
    await putValue(db, stores.bodyweight, `${workout.id}-bodyweight`, {
      id: `${workout.id}-bodyweight`,
      loggedAt: workout.performedAt,
      weightKg: workout.bodyweightKg,
      notes: "Logged with workout",
    } satisfies BodyweightEntry);
  }
  return workout;
}

export async function saveLocalTemplate(input: Pick<WorkoutTemplate, "name" | "category" | "exercises">) {
  const db = await getDatabase();
  const template: WorkoutTemplate = {
    id: crypto.randomUUID(),
    name: input.name.trim() || "Workout Template",
    category: input.category,
    createdAt: new Date().toISOString(),
    exercises: input.exercises.map((exercise, index) => ({
      ...exercise,
      id: exercise.id || crypto.randomUUID(),
      targetSets: Number(exercise.targetSets || 3),
      targetReps: exercise.targetReps || "8-12",
    })),
  };
  await putValue(db, stores.templates, template.id, template);
  return template;
}

export async function exportLocalSnapshot(): Promise<LocalSnapshot> {
  const data = await getLocalData();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: data.profile,
    exercises: data.exercises,
    workouts: data.workouts,
    bodyweight: data.bodyweight,
    templates: data.templates,
  };
}

export async function importLocalSnapshot(snapshot: LocalSnapshot) {
  if (!snapshot || snapshot.version !== 1) throw new Error("Unsupported backup file.");

  await initLocalDatabase();
  const db = await getDatabase();
  await clearStores(db, [stores.exercises, stores.workouts, stores.bodyweight, stores.templates]);
  await putMany(db, stores.exercises, snapshot.exercises.map(normalizeExercise));
  await putMany(db, stores.workouts, snapshot.workouts.map(normalizeWorkout));
  await putMany(db, stores.bodyweight, snapshot.bodyweight);
  await putMany(db, stores.templates, snapshot.templates);
  await setLocalProfile(snapshot.profile);
  await putValue(db, stores.meta, "seeded", true);
}

export function exportWorkoutsCsv(workouts: Workout[]) {
  const rows = [
    ["Workout Date", "Workout", "Exercise", "Category", "Set", "Kind", "Reps", "Weight Kg", "Assistance Kg", "Duration Seconds", "Exercise Notes", "Workout Notes"],
  ];

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        rows.push([
          workout.performedAt,
          workout.name,
          exercise.exerciseName,
          exercise.category,
          String(set.setNumber),
          set.kind,
          String(set.reps),
          String(set.weightKg),
          String(set.assistanceKg ?? ""),
          String(set.durationSeconds ?? ""),
          exercise.notes || "",
          workout.notes || "",
        ]);
      }
    }
  }

  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function getDatabase() {
  if (databasePromise) return databasePromise;
  if (typeof indexedDB === "undefined") {
    databasePromise = Promise.reject(new Error("IndexedDB is not available in this browser."));
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      const db = request.result;
      Object.values(stores).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open IndexedDB."));
  });

  return databasePromise;
}

function getStore(db: IDBDatabase, storeName: StoreName, mode: IDBTransactionMode) {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function getValue<T>(db: IDBDatabase, storeName: StoreName, key: IDBValidKey) {
  return requestToPromise<T | undefined>(getStore(db, storeName, "readonly").get(key));
}

function putValue<T>(db: IDBDatabase, storeName: StoreName, key: IDBValidKey, value: T) {
  return requestToPromise(getStore(db, storeName, "readwrite").put(value, key));
}

function deleteValue(db: IDBDatabase, storeName: StoreName, key: IDBValidKey) {
  return requestToPromise(getStore(db, storeName, "readwrite").delete(key));
}

function getAll<T>(db: IDBDatabase, storeName: StoreName) {
  return requestToPromise<T[]>(getStore(db, storeName, "readonly").getAll());
}

function putMany<T extends { id: string }>(db: IDBDatabase, storeName: StoreName, values: T[]) {
  if (values.length === 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    values.forEach((value) => store.put(value, value.id));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error(`Could not write ${storeName}.`));
  });
}

function clearStores(db: IDBDatabase, storeNames: StoreName[]) {
  return Promise.all(
    storeNames.map(
      (storeName) =>
        new Promise<void>((resolve, reject) => {
          const request = getStore(db, storeName, "readwrite").clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error || new Error(`Could not clear ${storeName}.`));
        }),
    ),
  );
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function normalizeExercise(exercise: Exercise): Exercise {
  return {
    ...exercise,
    isFavorite: Boolean(exercise.isFavorite),
    isBodyweight: Boolean(exercise.isBodyweight),
    primaryMuscles: exercise.primaryMuscles?.length ? exercise.primaryMuscles : [exercise.category],
    source: exercise.source || (exercise.id.startsWith("custom-") ? "custom" : "seed"),
    archivedAt: exercise.archivedAt || null,
    notes: exercise.notes || null,
  };
}

function normalizeWorkout(workout: Workout): Workout {
  return {
    ...workout,
    notes: workout.notes || "",
    totalVolume: Number(workout.totalVolume || workoutVolume(workout)),
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      notes: exercise.notes || "",
      sets: exercise.sets.map((set, index) => ({ ...set, setNumber: set.setNumber || index + 1 })),
    })),
  };
}

function slugId(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `custom-${slug || crypto.randomUUID()}`;
}

function escapeCsv(value: string | number | null | undefined) {
  const stringValue = String(value ?? "");
  if (!/[",\n]/.test(stringValue)) return stringValue;
  return `"${stringValue.replaceAll('"', '""')}"`;
}
