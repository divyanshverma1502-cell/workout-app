"use client";

import { Heart, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { BodyweightChart } from "@/components/charts";
import { Field, GhostButton, Panel, Pill, SectionTitle } from "@/components/ui";
import type { BodyweightEntry, Exercise, Workout } from "@/types/domain";

const bodyweightNames = ["push-ups", "pull-up", "planks", "dips"];

export function ExerciseLibrary({
  exercises,
  workouts,
  bodyweight,
  onFavorite,
}: {
  exercises: Exercise[];
  workouts: Workout[];
  bodyweight: BodyweightEntry[];
  onFavorite: (exerciseId: string, favorite: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const categories = ["All", ...Array.from(new Set(exercises.map((exercise) => exercise.category)))];
  const filtered = exercises.filter((exercise) => {
    const matchesQuery = exercise.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "All" || exercise.category === category;
    return matchesQuery && matchesCategory;
  });

  const bodyweightProgress = useMemo(() => {
    return bodyweightNames.map((name) => {
      const entries = workouts
        .flatMap((workout) =>
          workout.exercises
            .filter((exercise) => exercise.exerciseName.toLowerCase() === name)
            .map((exercise) => {
              const reps = exercise.sets.reduce((sum, set) => sum + set.reps, 0);
              const assisted = exercise.sets.filter((set) => set.kind === "assisted").length;
              const negatives = exercise.sets.filter((set) => set.kind === "negative").length;
              const partials = exercise.sets.filter((set) => set.kind === "partial").length;
              return { date: workout.performedAt, reps, assisted, negatives, partials };
            }),
        )
        .slice(0, 6);
      return { name, entries };
    });
  }, [workouts]);

  return (
    <div className="space-y-5">
      <Panel>
        <SectionTitle eyebrow="Search" title="Exercise library" />
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-3.5 text-slate-500" size={18} aria-hidden />
            <Field className="pl-10" placeholder="Search exercises" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((item) => (
              <GhostButton
                key={item}
                className={`min-h-12 whitespace-nowrap px-3 ${category === item ? "border-lift/50 text-lift" : ""}`}
                onClick={() => setCategory(item)}
              >
                {item}
              </GhostButton>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((exercise) => (
            <article key={exercise.id} className="rounded-lg border border-line bg-coal/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{exercise.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Pill>{exercise.category}</Pill>
                    {exercise.isBodyweight ? <Pill className="border-sky-300/30 text-sky-300">Bodyweight</Pill> : null}
                  </div>
                </div>
                <button
                  aria-label={exercise.isFavorite ? "Remove favorite" : "Add favorite"}
                  className={`grid h-11 w-11 place-items-center rounded-lg border border-line transition ${exercise.isFavorite ? "bg-rose-400/15 text-rose-300" : "bg-white/[0.04] text-slate-400 hover:text-rose-300"}`}
                  onClick={() => onFavorite(exercise.id, !exercise.isFavorite)}
                >
                  <Heart size={18} fill={exercise.isFavorite ? "currentColor" : "none"} aria-hidden />
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-400">{exercise.primaryMuscles.join(" / ")}</p>
            </article>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <SectionTitle eyebrow="Bodyweight" title="Progressions" />
          <div className="space-y-3">
            {bodyweightProgress.map((item) => {
              const last = item.entries[0];
              return (
                <div key={item.name} className="rounded-lg border border-line bg-coal/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium capitalize text-white">{item.name}</p>
                    <Pill>{last ? `${last.reps} reps` : "No logs"}</Pill>
                  </div>
                  {last ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span>Assisted {last.assisted}</span>
                      <span>Negatives {last.negatives}</span>
                      <span>Partials {last.partials}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Weight" title="Bodyweight entries" />
          {bodyweight.length > 1 ? (
            <BodyweightChart entries={bodyweight} />
          ) : (
            <div className="grid min-h-56 place-items-center rounded-lg border border-dashed border-line bg-coal/40 p-6 text-center text-slate-400">
              Bodyweight trend appears after two entries.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
