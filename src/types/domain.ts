export const exerciseCategories = [
  "Push",
  "Pull",
  "Legs",
  "Core",
  "Cardio",
  "Calisthenics",
] as const;

export type ExerciseCategory = (typeof exerciseCategories)[number];

export const setKinds = ["standard", "assisted", "negative", "partial"] as const;

export type SetKind = (typeof setKinds)[number];

export type User = {
  id: string;
  name: string;
  email: string;
};

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  isBodyweight: boolean;
  isFavorite: boolean;
  primaryMuscles: string[];
};

export type WorkoutSetInput = {
  setNumber: number;
  reps: number;
  weightKg: number;
  assistanceKg?: number | null;
  durationSeconds?: number | null;
  kind: SetKind;
  completed: boolean;
};

export type LoggedExerciseInput = {
  exerciseId: string;
  exerciseName: string;
  category: ExerciseCategory;
  notes?: string;
  sets: WorkoutSetInput[];
};

export type WorkoutInput = {
  name: string;
  performedAt: string;
  bodyweightKg?: number | null;
  notes?: string;
  exercises: LoggedExerciseInput[];
};

export type WorkoutSet = WorkoutSetInput & {
  id: string;
};

export type LoggedExercise = Omit<LoggedExerciseInput, "sets"> & {
  id: string;
  sets: WorkoutSet[];
};

export type Workout = Omit<WorkoutInput, "exercises"> & {
  id: string;
  totalVolume: number;
  createdAt: string;
  exercises: LoggedExercise[];
};

export type BodyweightEntry = {
  id: string;
  loggedAt: string;
  weightKg: number;
  notes?: string | null;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  category: ExerciseCategory | "Mixed";
  createdAt: string;
  exercises: Array<{
    id: string;
    exerciseId: string;
    exerciseName: string;
    category: ExerciseCategory;
    targetSets: number;
    targetReps: string;
  }>;
};

export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  value: number;
  reps: number;
  weightKg: number;
  achievedAt: string;
};

export type StrengthPoint = {
  date: string;
  benchPress?: number;
  squatLegPress?: number;
  pullUp?: number;
  overheadPress?: number;
};

export type WorkoutComparison = {
  exerciseId: string;
  exerciseName: string;
  previousVolume: number;
  currentVolume: number;
  volumeDelta: number;
  previousBestSet: number;
  currentBestSet: number;
  bestSetDelta: number;
};
