"use client";

import { Archive, Edit3, Heart, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { BodyweightChart, ExerciseHistoryChart } from "@/components/charts";
import { exerciseCategories, type BodyweightEntry, type Exercise, type ExerciseInput, type Workout } from "@/types/domain";
import { exerciseRecords, lastExercisePerformance } from "@/lib/metrics";
import { Field, GhostButton, IconButton, Panel, Pill, PrimaryButton, Select, SectionTitle, TextArea } from "@/components/ui";

const bodyweightNames = ["push-ups", "pull-up", "planks", "dips"];

type FormState = {
  id?: string;
  name: string;
  category: ExerciseInput["category"];
  notes: string;
  isBodyweight: boolean;
};

const emptyForm: FormState = {
  name: "",
  category: "Custom",
  notes: "",
  isBodyweight: false,
};

export function ExerciseLibrary({
  exercises,
  workouts,
  bodyweight,
  onFavorite,
  onCreateExercise,
  onUpdateExercise,
  onArchiveExercise,
  onDeleteExercise,
}: {
  exercises: Exercise[];
  workouts: Workout[];
  bodyweight: BodyweightEntry[];
  onFavorite: (exerciseId: string, favorite: boolean) => void;
  onCreateExercise: (input: ExerciseInput) => Promise<Exercise>;
  onUpdateExercise: (exerciseId: string, input: ExerciseInput) => Promise<void>;
  onArchiveExercise: (exerciseId: string, archive: boolean) => Promise<void>;
  onDeleteExercise: (exerciseId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedExerciseId, setSelectedExerciseId] = useState(exercises[0]?.id || "");
  const [status, setStatus] = useState("");

  const categories = ["All", ...exerciseCategories, "Archived"];
  const visibleExercises = exercises.filter((exercise) => {
    const searchText = `${exercise.name} ${exercise.category} ${exercise.notes || ""}`.toLowerCase();
    const matchesQuery = searchText.includes(query.toLowerCase());
    const matchesCategory =
      category === "All" || exercise.category === category || (category === "Archived" && exercise.archivedAt);
    const archiveState = showArchived || category === "Archived" ? Boolean(exercise.archivedAt) : !exercise.archivedAt;
    return matchesQuery && matchesCategory && archiveState;
  });

  const selectedExercise = exercises.find((exercise) => exercise.id === selectedExerciseId) || visibleExercises[0];
  const records = exerciseRecords(workouts);
  const selectedRecord = records.find((record) => record.exerciseId === selectedExercise?.id);

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

  function openCreateForm(seedName = "") {
    setForm({ ...emptyForm, name: seedName });
    setFormOpen(true);
    setStatus("");
  }

  function openEditForm(exercise: Exercise) {
    setForm({
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      notes: exercise.notes || "",
      isBodyweight: exercise.isBodyweight,
    });
    setFormOpen(true);
    setStatus("");
  }

  async function submitForm() {
    if (!form.name.trim()) {
      setStatus("Exercise name is required.");
      return;
    }

    const input: ExerciseInput = {
      name: form.name,
      category: form.category,
      notes: form.notes,
      isBodyweight: form.isBodyweight,
    };

    if (form.id) {
      await onUpdateExercise(form.id, input);
      setStatus("Exercise updated.");
    } else {
      const created = await onCreateExercise(input);
      setSelectedExerciseId(created.id);
      setStatus("Exercise added.");
    }

    setForm(emptyForm);
    setFormOpen(false);
  }

  return (
    <div className="space-y-5">
      <Panel>
        <SectionTitle
          eyebrow="Search"
          title="Exercise library"
          action={
            <PrimaryButton className="min-h-10 px-3" onClick={() => openCreateForm(query)}>
              <Plus size={16} aria-hidden />
              Add Exercise
            </PrimaryButton>
          }
        />
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
                onClick={() => {
                  setCategory(item);
                  setShowArchived(item === "Archived");
                }}
              >
                {item}
              </GhostButton>
            ))}
          </div>
        </div>

        {formOpen ? (
          <div className="mt-4 rounded-lg border border-line bg-coal/70 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-white">{form.id ? "Edit exercise" : "Create exercise"}</p>
              <IconButton aria-label="Close exercise form" onClick={() => setFormOpen(false)}>
                <X size={16} aria-hidden />
              </IconButton>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_180px_140px]">
              <label>
                <span className="mb-1 block text-sm text-slate-300">Exercise Name</span>
                <Field value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <label>
                <span className="mb-1 block text-sm text-slate-300">Category</span>
                <Select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ExerciseInput["category"] })}>
                  {exerciseCategories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex min-h-12 items-end gap-2 pb-2 text-sm text-slate-300">
                <input
                  className="h-5 w-5 accent-lift"
                  checked={form.isBodyweight}
                  onChange={(event) => setForm({ ...form, isBodyweight: event.target.checked })}
                  type="checkbox"
                />
                Bodyweight
              </label>
            </div>
            <TextArea className="mt-3" placeholder="Optional notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            <PrimaryButton className="mt-3 w-full" onClick={submitForm}>
              {form.id ? "Save changes" : "Add exercise"}
            </PrimaryButton>
          </div>
        ) : null}

        {status ? <p className="mt-3 rounded-lg border border-line bg-coal/70 px-3 py-2 text-sm text-slate-300">{status}</p> : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleExercises.map((exercise) => {
            const last = lastExercisePerformance(workouts, exercise.id);
            return (
              <article
                key={exercise.id}
                className={`rounded-lg border bg-coal/60 p-4 transition ${selectedExercise?.id === exercise.id ? "border-lift/50" : "border-line"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button className="min-w-0 flex-1 text-left" onClick={() => setSelectedExerciseId(exercise.id)}>
                    <p className="font-semibold text-white">{exercise.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Pill>{exercise.category}</Pill>
                      {exercise.source === "custom" ? <Pill className="border-lift/30 text-lift">Custom</Pill> : null}
                      {exercise.archivedAt ? <Pill className="border-amber/30 text-amber">Archived</Pill> : null}
                      {exercise.isBodyweight ? <Pill className="border-sky-300/30 text-sky-300">Bodyweight</Pill> : null}
                    </div>
                  </button>
                  <button
                    aria-label={exercise.isFavorite ? "Remove favorite" : "Add favorite"}
                    className={`grid h-11 w-11 place-items-center rounded-lg border border-line transition ${exercise.isFavorite ? "bg-rose-400/15 text-rose-300" : "bg-white/[0.04] text-slate-400 hover:text-rose-300"}`}
                    onClick={() => onFavorite(exercise.id, !exercise.isFavorite)}
                  >
                    <Heart size={18} fill={exercise.isFavorite ? "currentColor" : "none"} aria-hidden />
                  </button>
                </div>
                <p className="mt-3 text-sm text-slate-400">{exercise.notes || exercise.primaryMuscles.join(" / ")}</p>
                {last ? (
                  <p className="mt-2 text-sm text-lift">
                    Last session: {last.weightKg}kg x {last.reps}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {exercise.source === "custom" ? (
                    <GhostButton className="min-h-10 px-3" onClick={() => openEditForm(exercise)}>
                      <Edit3 size={14} aria-hidden />
                      Edit
                    </GhostButton>
                  ) : null}
                  <GhostButton className="min-h-10 px-3" onClick={() => onArchiveExercise(exercise.id, !exercise.archivedAt)}>
                    {exercise.archivedAt ? <RotateCcw size={14} aria-hidden /> : <Archive size={14} aria-hidden />}
                    {exercise.archivedAt ? "Restore" : "Archive"}
                  </GhostButton>
                  {exercise.source === "custom" ? (
                    <GhostButton className="min-h-10 px-3 text-rose-200" onClick={() => onDeleteExercise(exercise.id)}>
                      <Trash2 size={14} aria-hidden />
                      Delete
                    </GhostButton>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionTitle eyebrow="History" title={selectedExercise ? selectedExercise.name : "Exercise history"} />
          {selectedExercise && workouts.some((workout) => workout.exercises.some((exercise) => exercise.exerciseId === selectedExercise.id)) ? (
            <>
              <ExerciseHistoryChart workouts={workouts} exerciseId={selectedExercise.id} />
              {selectedRecord ? (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm text-slate-400">
                  <Pill className="justify-center">Heavy {selectedRecord.heaviestWeightKg}kg</Pill>
                  <Pill className="justify-center">Reps {selectedRecord.mostReps}</Pill>
                  <Pill className="justify-center">e1RM {selectedRecord.bestEstimatedOneRepMax}kg</Pill>
                </div>
              ) : null}
            </>
          ) : (
            <div className="grid min-h-56 place-items-center rounded-lg border border-dashed border-line bg-coal/40 p-6 text-center text-slate-400">
              Select an exercise with saved sets to view its timeline.
            </div>
          )}
        </Panel>

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
      </div>

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
  );
}
