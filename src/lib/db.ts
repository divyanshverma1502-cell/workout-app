import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  BodyweightEntry,
  Exercise,
  ExerciseCategory,
  Workout,
  WorkoutInput,
  WorkoutTemplate,
} from "@/types/domain";
import { workoutVolume } from "@/lib/metrics";

type DbUser = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
};

type ExerciseRow = {
  id: string;
  name: string;
  category: ExerciseCategory;
  is_bodyweight: number;
  primary_muscles: string;
  is_favorite?: number;
};

let database: DatabaseSync | null = null;

const seedExercises: Array<Omit<Exercise, "isFavorite">> = [
  { id: "bench-press", name: "Bench Press", category: "Push", isBodyweight: false, primaryMuscles: ["Chest", "Triceps", "Shoulders"] },
  { id: "incline-press", name: "Incline Press", category: "Push", isBodyweight: false, primaryMuscles: ["Upper Chest", "Shoulders"] },
  { id: "lat-pulldown", name: "Lat Pulldown", category: "Pull", isBodyweight: false, primaryMuscles: ["Lats", "Biceps"] },
  { id: "pull-up", name: "Pull-up", category: "Calisthenics", isBodyweight: true, primaryMuscles: ["Lats", "Biceps", "Core"] },
  { id: "leg-press", name: "Leg Press", category: "Legs", isBodyweight: false, primaryMuscles: ["Quads", "Glutes"] },
  { id: "romanian-deadlift", name: "Romanian Deadlift", category: "Legs", isBodyweight: false, primaryMuscles: ["Hamstrings", "Glutes"] },
  { id: "overhead-press", name: "Overhead Press", category: "Push", isBodyweight: false, primaryMuscles: ["Shoulders", "Triceps"] },
  { id: "rows", name: "Rows", category: "Pull", isBodyweight: false, primaryMuscles: ["Back", "Biceps"] },
  { id: "push-ups", name: "Push-ups", category: "Calisthenics", isBodyweight: true, primaryMuscles: ["Chest", "Triceps", "Core"] },
  { id: "squats", name: "Squats", category: "Legs", isBodyweight: false, primaryMuscles: ["Quads", "Glutes", "Core"] },
  { id: "planks", name: "Planks", category: "Core", isBodyweight: true, primaryMuscles: ["Core"] },
  { id: "dips", name: "Dips", category: "Calisthenics", isBodyweight: true, primaryMuscles: ["Chest", "Triceps"] },
  { id: "treadmill-run", name: "Treadmill Run", category: "Cardio", isBodyweight: false, primaryMuscles: ["Heart", "Legs"] },
];

export function getDb() {
  if (database) return database;

  const dataDir = path.join(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });
  database = new DatabaseSync(process.env.WORKOUT_DB_PATH || path.join(dataDir, "workout.sqlite"));

  // SQLite is the server-side source of truth. The browser keeps its offline-first copy in IndexedDB.
  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      is_bodyweight INTEGER NOT NULL DEFAULT 0,
      primary_muscles TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, exercise_id)
    );

    CREATE TABLE IF NOT EXISTS bodyweight_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      logged_at TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      performed_at TEXT NOT NULL,
      bodyweight_kg REAL,
      notes TEXT,
      total_volume REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id TEXT PRIMARY KEY,
      workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      exercise_name TEXT NOT NULL,
      category TEXT NOT NULL,
      notes TEXT,
      position INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_sets (
      id TEXT PRIMARY KEY,
      workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
      set_number INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight_kg REAL NOT NULL DEFAULT 0,
      assistance_kg REAL,
      duration_seconds INTEGER,
      kind TEXT NOT NULL DEFAULT 'standard',
      completed INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS workout_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS template_exercises (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      exercise_name TEXT NOT NULL,
      category TEXT NOT NULL,
      target_sets INTEGER NOT NULL,
      target_reps TEXT NOT NULL,
      position INTEGER NOT NULL
    );
  `);

  for (const exercise of seedExercises) {
    database
      .prepare(
        `INSERT OR IGNORE INTO exercises (id, name, category, is_bodyweight, primary_muscles, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        exercise.id,
        exercise.name,
        exercise.category,
        exercise.isBodyweight ? 1 : 0,
        JSON.stringify(exercise.primaryMuscles),
        new Date().toISOString(),
      );
  }

  return database;
}

export function findUserByEmail(email: string) {
  return getDb()
    .prepare("SELECT * FROM users WHERE lower(email) = lower(?)")
    .get(email.trim()) as DbUser | undefined;
}

export function findUserById(id: string) {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser | undefined;
}

export function createUserRecord(input: { name: string; email: string; passwordHash: string; passwordSalt: string }) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.name.trim(), input.email.trim().toLowerCase(), input.passwordHash, input.passwordSalt, createdAt);
  createStarterTemplates(id);
  return findUserById(id);
}

export function createSessionRecord(userId: string, tokenHash: string, expiresAt: string) {
  const id = crypto.randomUUID();
  getDb()
    .prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, userId, tokenHash, expiresAt, new Date().toISOString());
}

export function findUserBySessionToken(tokenHash: string) {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
  return db
    .prepare(
      `SELECT users.*
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at >= ?`,
    )
    .get(tokenHash, new Date().toISOString()) as DbUser | undefined;
}

export function deleteSession(tokenHash: string) {
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

export function toPublicUser(user: DbUser) {
  return { id: user.id, name: user.name, email: user.email };
}

function mapExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    isBodyweight: Boolean(row.is_bodyweight),
    isFavorite: Boolean(row.is_favorite),
    primaryMuscles: JSON.parse(row.primary_muscles) as string[],
  };
}

export function listExercises(userId: string) {
  const rows = getDb()
    .prepare(
      `SELECT exercises.*, CASE WHEN favorites.exercise_id IS NULL THEN 0 ELSE 1 END AS is_favorite
       FROM exercises
       LEFT JOIN favorites ON favorites.exercise_id = exercises.id AND favorites.user_id = ?
       ORDER BY is_favorite DESC, category ASC, name ASC`,
    )
    .all(userId) as ExerciseRow[];

  return rows.map(mapExercise);
}

export function setExerciseFavorite(userId: string, exerciseId: string, favorite: boolean) {
  const db = getDb();
  if (favorite) {
    db.prepare("INSERT OR IGNORE INTO favorites (user_id, exercise_id) VALUES (?, ?)").run(userId, exerciseId);
  } else {
    db.prepare("DELETE FROM favorites WHERE user_id = ? AND exercise_id = ?").run(userId, exerciseId);
  }
}

export function latestBodyweight(userId: string) {
  return getDb()
    .prepare("SELECT * FROM bodyweight_entries WHERE user_id = ? ORDER BY logged_at DESC LIMIT 1")
    .get(userId) as (BodyweightEntry & { logged_at: string; weight_kg: number }) | undefined;
}

export function listBodyweight(userId: string) {
  const rows = getDb()
    .prepare("SELECT id, logged_at, weight_kg, notes FROM bodyweight_entries WHERE user_id = ? ORDER BY logged_at ASC")
    .all(userId) as Array<{ id: string; logged_at: string; weight_kg: number; notes?: string | null }>;

  return rows.map((row) => ({
    id: row.id,
    loggedAt: row.logged_at,
    weightKg: row.weight_kg,
    notes: row.notes,
  }));
}

export function addBodyweight(userId: string, weightKg: number, notes?: string | null, loggedAt = new Date().toISOString()) {
  const entry = {
    id: crypto.randomUUID(),
    loggedAt,
    weightKg,
    notes: notes || null,
  };
  getDb()
    .prepare("INSERT INTO bodyweight_entries (id, user_id, logged_at, weight_kg, notes) VALUES (?, ?, ?, ?, ?)")
    .run(entry.id, userId, entry.loggedAt, entry.weightKg, entry.notes);
  return entry;
}

export function listWorkouts(userId: string, limit = 80) {
  const db = getDb();
  const workoutRows = db
    .prepare(
      `SELECT id, name, performed_at, bodyweight_kg, notes, total_volume, created_at
       FROM workouts
       WHERE user_id = ?
       ORDER BY performed_at DESC
       LIMIT ?`,
    )
    .all(userId, limit) as Array<{
    id: string;
    name: string;
    performed_at: string;
    bodyweight_kg?: number | null;
    notes?: string | null;
    total_volume: number;
    created_at: string;
  }>;

  return workoutRows.map((workoutRow) => {
    const exerciseRows = db
      .prepare(
        `SELECT id, exercise_id, exercise_name, category, notes
         FROM workout_exercises
         WHERE workout_id = ?
         ORDER BY position ASC`,
      )
      .all(workoutRow.id) as Array<{
      id: string;
      exercise_id: string;
      exercise_name: string;
      category: ExerciseCategory;
      notes?: string | null;
    }>;

    const exercises = exerciseRows.map((exerciseRow) => {
      const setRows = db
        .prepare(
          `SELECT id, set_number, reps, weight_kg, assistance_kg, duration_seconds, kind, completed
           FROM workout_sets
           WHERE workout_exercise_id = ?
           ORDER BY set_number ASC`,
        )
        .all(exerciseRow.id) as Array<{
        id: string;
        set_number: number;
        reps: number;
        weight_kg: number;
        assistance_kg?: number | null;
        duration_seconds?: number | null;
        kind: "standard" | "assisted" | "negative" | "partial";
        completed: number;
      }>;

      return {
        id: exerciseRow.id,
        exerciseId: exerciseRow.exercise_id,
        exerciseName: exerciseRow.exercise_name,
        category: exerciseRow.category,
        notes: exerciseRow.notes || "",
        sets: setRows.map((setRow) => ({
          id: setRow.id,
          setNumber: setRow.set_number,
          reps: setRow.reps,
          weightKg: setRow.weight_kg,
          assistanceKg: setRow.assistance_kg,
          durationSeconds: setRow.duration_seconds,
          kind: setRow.kind,
          completed: Boolean(setRow.completed),
        })),
      };
    });

    return {
      id: workoutRow.id,
      name: workoutRow.name,
      performedAt: workoutRow.performed_at,
      bodyweightKg: workoutRow.bodyweight_kg,
      notes: workoutRow.notes || "",
      totalVolume: workoutRow.total_volume,
      createdAt: workoutRow.created_at,
      exercises,
    } satisfies Workout;
  });
}

export function saveWorkout(userId: string, input: WorkoutInput) {
  const db = getDb();
  const workoutId = crypto.randomUUID();
  const now = new Date().toISOString();
  const totalVolume = workoutVolume(input);

  db.exec("BEGIN");
  try {
    db.prepare(
      `INSERT INTO workouts (id, user_id, name, performed_at, bodyweight_kg, notes, total_volume, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      workoutId,
      userId,
      input.name.trim() || "Workout",
      input.performedAt,
      input.bodyweightKg ?? null,
      input.notes || null,
      totalVolume,
      now,
    );

    input.exercises.forEach((exercise, exerciseIndex) => {
      const workoutExerciseId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, exercise_name, category, notes, position)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        workoutExerciseId,
        workoutId,
        exercise.exerciseId,
        exercise.exerciseName,
        exercise.category,
        exercise.notes || null,
        exerciseIndex,
      );

      exercise.sets.forEach((set) => {
        db.prepare(
          `INSERT INTO workout_sets
           (id, workout_exercise_id, set_number, reps, weight_kg, assistance_kg, duration_seconds, kind, completed)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          crypto.randomUUID(),
          workoutExerciseId,
          set.setNumber,
          set.reps,
          set.weightKg || 0,
          set.assistanceKg ?? null,
          set.durationSeconds ?? null,
          set.kind,
          set.completed ? 1 : 0,
        );
      });
    });

    if (input.bodyweightKg) {
      addBodyweight(userId, input.bodyweightKg, "Logged with workout", input.performedAt);
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return listWorkouts(userId, 1000).find((workout) => workout.id === workoutId) || listWorkouts(userId, 1)[0];
}

export function listTemplates(userId: string) {
  const db = getDb();
  const templates = db
    .prepare(
      `SELECT id, name, category, created_at
       FROM workout_templates
       WHERE user_id = ?
       ORDER BY created_at ASC`,
    )
    .all(userId) as Array<{ id: string; name: string; category: ExerciseCategory | "Mixed"; created_at: string }>;

  return templates.map((template) => {
    const exercises = db
      .prepare(
        `SELECT id, exercise_id, exercise_name, category, target_sets, target_reps
         FROM template_exercises
         WHERE template_id = ?
         ORDER BY position ASC`,
      )
      .all(template.id) as Array<{
      id: string;
      exercise_id: string;
      exercise_name: string;
      category: ExerciseCategory;
      target_sets: number;
      target_reps: string;
    }>;

    return {
      id: template.id,
      name: template.name,
      category: template.category,
      createdAt: template.created_at,
      exercises: exercises.map((exercise) => ({
        id: exercise.id,
        exerciseId: exercise.exercise_id,
        exerciseName: exercise.exercise_name,
        category: exercise.category,
        targetSets: exercise.target_sets,
        targetReps: exercise.target_reps,
      })),
    } satisfies WorkoutTemplate;
  });
}

export function saveTemplate(userId: string, input: Pick<WorkoutTemplate, "name" | "category" | "exercises">) {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO workout_templates (id, user_id, name, category, created_at) VALUES (?, ?, ?, ?, ?)").run(
    id,
    userId,
    input.name.trim() || "Workout Template",
    input.category,
    new Date().toISOString(),
  );

  input.exercises.forEach((exercise, index) => {
    db.prepare(
      `INSERT INTO template_exercises
       (id, template_id, exercise_id, exercise_name, category, target_sets, target_reps, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      crypto.randomUUID(),
      id,
      exercise.exerciseId,
      exercise.exerciseName,
      exercise.category,
      exercise.targetSets,
      exercise.targetReps,
      index,
    );
  });

  return listTemplates(userId).find((template) => template.id === id);
}

function createStarterTemplates(userId: string) {
  const existing = listTemplates(userId);
  if (existing.length > 0) return;

  const templates: Array<Pick<WorkoutTemplate, "name" | "category" | "exercises">> = [
    {
      name: "Upper Strength",
      category: "Mixed",
      exercises: [
        { id: "t1-e1", exerciseId: "bench-press", exerciseName: "Bench Press", category: "Push", targetSets: 3, targetReps: "5-8" },
        { id: "t1-e2", exerciseId: "rows", exerciseName: "Rows", category: "Pull", targetSets: 3, targetReps: "8-10" },
        { id: "t1-e3", exerciseId: "overhead-press", exerciseName: "Overhead Press", category: "Push", targetSets: 3, targetReps: "6-8" },
        { id: "t1-e4", exerciseId: "lat-pulldown", exerciseName: "Lat Pulldown", category: "Pull", targetSets: 3, targetReps: "10-12" },
      ],
    },
    {
      name: "Legs + Core",
      category: "Legs",
      exercises: [
        { id: "t2-e1", exerciseId: "leg-press", exerciseName: "Leg Press", category: "Legs", targetSets: 4, targetReps: "8-12" },
        { id: "t2-e2", exerciseId: "romanian-deadlift", exerciseName: "Romanian Deadlift", category: "Legs", targetSets: 3, targetReps: "8-10" },
        { id: "t2-e3", exerciseId: "squats", exerciseName: "Squats", category: "Legs", targetSets: 3, targetReps: "6-10" },
        { id: "t2-e4", exerciseId: "planks", exerciseName: "Planks", category: "Core", targetSets: 3, targetReps: "45-60 sec" },
      ],
    },
    {
      name: "Calisthenics Base",
      category: "Calisthenics",
      exercises: [
        { id: "t3-e1", exerciseId: "push-ups", exerciseName: "Push-ups", category: "Calisthenics", targetSets: 4, targetReps: "AMRAP" },
        { id: "t3-e2", exerciseId: "pull-up", exerciseName: "Pull-up", category: "Calisthenics", targetSets: 4, targetReps: "Assisted 3-6" },
        { id: "t3-e3", exerciseId: "dips", exerciseName: "Dips", category: "Calisthenics", targetSets: 3, targetReps: "5-10" },
        { id: "t3-e4", exerciseId: "planks", exerciseName: "Planks", category: "Core", targetSets: 3, targetReps: "60 sec" },
      ],
    },
  ];

  templates.forEach((template) => saveTemplate(userId, template));
}
