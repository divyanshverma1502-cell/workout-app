import type {
  ExerciseHistoryPoint,
  ExerciseRecord,
  LastExercisePerformance,
  LoggedExerciseInput,
  PersonalRecord,
  StrengthPoint,
  Workout,
  WorkoutComparison,
  WorkoutInput,
  WorkoutSetInput,
} from "@/types/domain";

const trackedStrengthNames = {
  benchPress: ["bench press"],
  squatLegPress: ["squat", "leg press"],
  pullUp: ["pull-up", "pull up"],
  overheadPress: ["overhead press"],
};

export function estimateOneRepMax(weightKg: number, reps: number) {
  if (!weightKg || !reps) return 0;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export function effectiveLoadKg(set: WorkoutSetInput, bodyweightKg?: number | null, isBodyweight = false) {
  const addedWeight = Number(set.weightKg || 0);
  const assistance = Number(set.assistanceKg || 0);

  if (isBodyweight) {
    const baseWeight = Number(bodyweightKg || 0);
    return Math.max(0, baseWeight + addedWeight - assistance);
  }

  return Math.max(0, addedWeight - assistance);
}

export function setVolume(set: WorkoutSetInput, bodyweightKg?: number | null, isBodyweight = false) {
  if (!set.completed) return 0;
  const kindMultiplier = set.kind === "negative" ? 0.6 : set.kind === "partial" ? 0.7 : 1;
  const reps = Math.max(0, Number(set.reps || 0));
  return Math.round(effectiveLoadKg(set, bodyweightKg, isBodyweight) * reps * kindMultiplier);
}

export function exerciseVolume(exercise: LoggedExerciseInput, bodyweightKg?: number | null) {
  const isBodyweight = ["push-up", "pull-up", "dips", "planks", "plank"].includes(
    exercise.exerciseName.toLowerCase(),
  );

  return exercise.sets.reduce((total, set) => total + setVolume(set, bodyweightKg, isBodyweight), 0);
}

export function workoutVolume(workout: Pick<WorkoutInput, "bodyweightKg" | "exercises">) {
  return workout.exercises.reduce(
    (total, exercise) => total + exerciseVolume(exercise, workout.bodyweightKg),
    0,
  );
}

export function bestSetEstimate(exercise: LoggedExerciseInput, bodyweightKg?: number | null) {
  const isBodyweight = ["push-up", "pull-up", "dips", "planks", "plank"].includes(
    exercise.exerciseName.toLowerCase(),
  );

  return exercise.sets.reduce((best, set) => {
    const load = effectiveLoadKg(set, bodyweightKg, isBodyweight);
    const estimate = estimateOneRepMax(load, set.reps);
    return Math.max(best, estimate);
  }, 0);
}

export function compareWorkoutToPrevious(current: WorkoutInput, previousWorkouts: Workout[]): WorkoutComparison[] {
  return current.exercises.map((exercise) => {
    const previous = previousWorkouts
      .flatMap((workout) =>
        workout.exercises
          .filter((candidate) => candidate.exerciseId === exercise.exerciseId)
          .map((candidate) => ({ workout, candidate })),
      )
      .at(0);

    const previousVolume = previous
      ? exerciseVolume(previous.candidate, previous.workout.bodyweightKg)
      : 0;
    const currentVolume = exerciseVolume(exercise, current.bodyweightKg);
    const previousBestSet = previous
      ? bestSetEstimate(previous.candidate, previous.workout.bodyweightKg)
      : 0;
    const currentBestSet = bestSetEstimate(exercise, current.bodyweightKg);

    return {
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      previousVolume,
      currentVolume,
      volumeDelta: currentVolume - previousVolume,
      previousBestSet,
      currentBestSet,
      bestSetDelta: Math.round((currentBestSet - previousBestSet) * 10) / 10,
    };
  });
}

export function personalRecords(workouts: Workout[]) {
  const records = new Map<string, PersonalRecord>();

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        const isBodyweight = ["push-up", "pull-up", "dips", "planks", "plank"].includes(
          exercise.exerciseName.toLowerCase(),
        );
        const estimated = estimateOneRepMax(
          effectiveLoadKg(set, workout.bodyweightKg, isBodyweight),
          set.reps,
        );
        const existing = records.get(exercise.exerciseId);
        if (!existing || estimated > existing.value) {
          records.set(exercise.exerciseId, {
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName,
            value: estimated,
            reps: set.reps,
            weightKg: set.weightKg,
            achievedAt: workout.performedAt,
          });
        }
      }
    }
  }

  return Array.from(records.values()).sort((a, b) => b.value - a.value);
}

export function exerciseRecords(workouts: Workout[]) {
  const records = new Map<string, ExerciseRecord>();

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const current = records.get(exercise.exerciseId) || {
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        heaviestWeightKg: 0,
        mostReps: 0,
        bestEstimatedOneRepMax: 0,
      };

      for (const set of exercise.sets) {
        const estimated = estimateOneRepMax(set.weightKg, set.reps);
        if (set.weightKg > current.heaviestWeightKg) {
          current.heaviestWeightKg = set.weightKg;
          current.heaviestWeightAt = workout.performedAt;
        }
        if (set.reps > current.mostReps) {
          current.mostReps = set.reps;
          current.mostRepsAt = workout.performedAt;
        }
        if (estimated > current.bestEstimatedOneRepMax) {
          current.bestEstimatedOneRepMax = estimated;
          current.bestEstimatedOneRepMaxAt = workout.performedAt;
        }
      }

      records.set(exercise.exerciseId, current);
    }
  }

  return Array.from(records.values()).sort((a, b) => b.bestEstimatedOneRepMax - a.bestEstimatedOneRepMax);
}

export function strengthTrend(workouts: Workout[]): StrengthPoint[] {
  return [...workouts]
    .sort((a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime())
    .map((workout) => {
      const point: StrengthPoint = { date: workout.performedAt.slice(0, 10) };
      for (const exercise of workout.exercises) {
        const name = exercise.exerciseName.toLowerCase();
        const best = bestSetEstimate(exercise, workout.bodyweightKg);
        if (trackedStrengthNames.benchPress.some((candidate) => name.includes(candidate))) {
          point.benchPress = Math.max(point.benchPress || 0, best);
        }
        if (trackedStrengthNames.squatLegPress.some((candidate) => name.includes(candidate))) {
          point.squatLegPress = Math.max(point.squatLegPress || 0, best);
        }
        if (trackedStrengthNames.pullUp.some((candidate) => name.includes(candidate))) {
          point.pullUp = Math.max(point.pullUp || 0, best);
        }
        if (trackedStrengthNames.overheadPress.some((candidate) => name.includes(candidate))) {
          point.overheadPress = Math.max(point.overheadPress || 0, best);
        }
      }
      return point;
    });
}

export function customStrengthTrend(workouts: Workout[], exerciseId: string): StrengthPoint[] {
  return exerciseHistory(workouts, exerciseId).map((point) => ({
    date: point.date,
    custom: point.estimatedOneRepMax,
  }));
}

export function exerciseHistory(workouts: Workout[], exerciseId: string): ExerciseHistoryPoint[] {
  return [...workouts]
    .sort((a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime())
    .flatMap((workout) =>
      workout.exercises
        .filter((exercise) => exercise.exerciseId === exerciseId)
        .map((exercise) => {
          const bestSet = [...exercise.sets].sort(
            (a, b) => estimateOneRepMax(b.weightKg, b.reps) - estimateOneRepMax(a.weightKg, a.reps),
          )[0];

          return {
            date: workout.performedAt.slice(0, 10),
            weightKg: bestSet?.weightKg || 0,
            reps: bestSet?.reps || 0,
            volume: exerciseVolume(exercise, workout.bodyweightKg),
            estimatedOneRepMax: bestSet ? estimateOneRepMax(bestSet.weightKg, bestSet.reps) : 0,
          };
        }),
    );
}

export function lastExercisePerformance(workouts: Workout[], exerciseId: string): LastExercisePerformance | null {
  for (const workout of [...workouts].sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())) {
    const exercise = workout.exercises.find((candidate) => candidate.exerciseId === exerciseId);
    const lastSet = exercise?.sets.at(-1);
    if (exercise && lastSet) {
      return {
        workoutName: workout.name,
        performedAt: workout.performedAt,
        reps: lastSet.reps,
        weightKg: lastSet.weightKg,
        assistanceKg: lastSet.assistanceKg,
        kind: lastSet.kind,
      };
    }
  }
  return null;
}

export function weeklyWorkoutCounts(workouts: Workout[]) {
  const now = new Date();
  return Array.from({ length: 8 }, (_, index) => {
    const start = new Date(now);
    start.setDate(now.getDate() - (7 - index) * 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const count = workouts.filter((workout) => {
      const date = new Date(workout.performedAt);
      return date >= start && date < end;
    }).length;
    return { week: `W-${7 - index}`, workouts: count };
  });
}

export function volumeByWeek(workouts: Workout[]) {
  const weeks = weeklyWorkoutCounts(workouts).map((item) => ({ ...item, volume: 0 }));
  const now = new Date();
  for (const workout of workouts) {
    const date = new Date(workout.performedAt);
    const weeksAgo = Math.floor((now.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const index = weeks.length - 1 - weeksAgo;
    if (weeks[index]) {
      weeks[index].volume += workout.totalVolume;
    }
  }
  return weeks;
}

export function volumeByDay(workouts: Workout[], days = 14) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, index) => {
    const start = new Date(today);
    start.setDate(today.getDate() - (days - 1 - index));
    const key = localDateKey(start);
    const volume = workouts
      .filter((workout) => localDateKey(new Date(workout.performedAt)) === key)
      .reduce((sum, workout) => sum + workout.totalVolume, 0);
    return { period: key.slice(5), volume };
  });
}

export function volumeByMonth(workouts: Workout[], months = 6) {
  const now = new Date();
  return Array.from({ length: months }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    const volume = workouts
      .filter((workout) => {
        const date = new Date(workout.performedAt);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` === key;
      })
      .reduce((sum, workout) => sum + workout.totalVolume, 0);
    return { period: key, volume };
  });
}

export function muscleFrequency(workouts: Workout[]) {
  const counts = new Map<string, number>();
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      counts.set(exercise.category, (counts.get(exercise.category) || 0) + 1);
    }
  }
  return Array.from(counts.entries()).map(([category, count]) => ({ category, count }));
}

export function workoutStreak(workouts: Workout[]) {
  const days = new Set(workouts.map((workout) => localDateKey(new Date(workout.performedAt))));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (days.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
