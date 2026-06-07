import type { Exercise, WorkoutTemplate } from "@/types/domain";

export const seedExercises: Exercise[] = [
  { id: "bench-press", name: "Bench Press", category: "Push", isBodyweight: false, isFavorite: false, primaryMuscles: ["Chest", "Triceps", "Shoulders"], source: "seed" },
  { id: "incline-press", name: "Incline Press", category: "Push", isBodyweight: false, isFavorite: false, primaryMuscles: ["Upper Chest", "Shoulders"], source: "seed" },
  { id: "lat-pulldown", name: "Lat Pulldown", category: "Pull", isBodyweight: false, isFavorite: false, primaryMuscles: ["Lats", "Biceps"], source: "seed" },
  { id: "pull-up", name: "Pull-up", category: "Calisthenics", isBodyweight: true, isFavorite: false, primaryMuscles: ["Lats", "Biceps", "Core"], source: "seed" },
  { id: "leg-press", name: "Leg Press", category: "Legs", isBodyweight: false, isFavorite: false, primaryMuscles: ["Quads", "Glutes"], source: "seed" },
  { id: "romanian-deadlift", name: "Romanian Deadlift", category: "Legs", isBodyweight: false, isFavorite: false, primaryMuscles: ["Hamstrings", "Glutes"], source: "seed" },
  { id: "overhead-press", name: "Overhead Press", category: "Push", isBodyweight: false, isFavorite: false, primaryMuscles: ["Shoulders", "Triceps"], source: "seed" },
  { id: "rows", name: "Rows", category: "Pull", isBodyweight: false, isFavorite: false, primaryMuscles: ["Back", "Biceps"], source: "seed" },
  { id: "push-ups", name: "Push-ups", category: "Calisthenics", isBodyweight: true, isFavorite: false, primaryMuscles: ["Chest", "Triceps", "Core"], source: "seed" },
  { id: "squats", name: "Squats", category: "Legs", isBodyweight: false, isFavorite: false, primaryMuscles: ["Quads", "Glutes", "Core"], source: "seed" },
  { id: "planks", name: "Planks", category: "Core", isBodyweight: true, isFavorite: false, primaryMuscles: ["Core"], source: "seed" },
  { id: "dips", name: "Dips", category: "Calisthenics", isBodyweight: true, isFavorite: false, primaryMuscles: ["Chest", "Triceps"], source: "seed" },
  { id: "treadmill-run", name: "Treadmill Run", category: "Cardio", isBodyweight: false, isFavorite: false, primaryMuscles: ["Heart", "Legs"], source: "seed" },
];

export const seedTemplates: WorkoutTemplate[] = [
  {
    id: "template-upper-strength",
    name: "Upper Strength",
    category: "Mixed",
    createdAt: "2026-01-01T00:00:00.000Z",
    exercises: [
      { id: "t1-e1", exerciseId: "bench-press", exerciseName: "Bench Press", category: "Push", targetSets: 3, targetReps: "5-8" },
      { id: "t1-e2", exerciseId: "rows", exerciseName: "Rows", category: "Pull", targetSets: 3, targetReps: "8-10" },
      { id: "t1-e3", exerciseId: "overhead-press", exerciseName: "Overhead Press", category: "Push", targetSets: 3, targetReps: "6-8" },
      { id: "t1-e4", exerciseId: "lat-pulldown", exerciseName: "Lat Pulldown", category: "Pull", targetSets: 3, targetReps: "10-12" },
    ],
  },
  {
    id: "template-legs-core",
    name: "Legs + Core",
    category: "Legs",
    createdAt: "2026-01-01T00:00:01.000Z",
    exercises: [
      { id: "t2-e1", exerciseId: "leg-press", exerciseName: "Leg Press", category: "Legs", targetSets: 4, targetReps: "8-12" },
      { id: "t2-e2", exerciseId: "romanian-deadlift", exerciseName: "Romanian Deadlift", category: "Legs", targetSets: 3, targetReps: "8-10" },
      { id: "t2-e3", exerciseId: "squats", exerciseName: "Squats", category: "Legs", targetSets: 3, targetReps: "6-10" },
      { id: "t2-e4", exerciseId: "planks", exerciseName: "Planks", category: "Core", targetSets: 3, targetReps: "45-60 sec" },
    ],
  },
  {
    id: "template-calisthenics-base",
    name: "Calisthenics Base",
    category: "Calisthenics",
    createdAt: "2026-01-01T00:00:02.000Z",
    exercises: [
      { id: "t3-e1", exerciseId: "push-ups", exerciseName: "Push-ups", category: "Calisthenics", targetSets: 4, targetReps: "AMRAP" },
      { id: "t3-e2", exerciseId: "pull-up", exerciseName: "Pull-up", category: "Calisthenics", targetSets: 4, targetReps: "Assisted 3-6" },
      { id: "t3-e3", exerciseId: "dips", exerciseName: "Dips", category: "Calisthenics", targetSets: 3, targetReps: "5-10" },
      { id: "t3-e4", exerciseId: "planks", exerciseName: "Planks", category: "Core", targetSets: 3, targetReps: "60 sec" },
    ],
  },
];
