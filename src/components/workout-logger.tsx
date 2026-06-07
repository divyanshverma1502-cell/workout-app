"use client";

import { CheckCircle2, Copy, Plus, Save, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RestTimer } from "@/components/rest-timer";
import { Field, GhostButton, IconButton, Panel, Pill, PrimaryButton, Select, SectionTitle, TextArea } from "@/components/ui";
import { compareWorkoutToPrevious, lastExercisePerformance } from "@/lib/metrics";
import { useWorkoutStore } from "@/store/workout-store";
import { exerciseCategories, type Exercise, type ExerciseInput, type LoggedExerciseInput, type SetKind, type Workout, type WorkoutInput, type WorkoutTemplate } from "@/types/domain";

function nowIso() {
  return new Date().toISOString();
}

function toInputDate(iso: string) {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function fromInputDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? nowIso() : date.toISOString();
}

function emptyWorkout(bodyweightKg?: number | null): WorkoutInput {
  return {
    name: "Today Workout",
    performedAt: nowIso(),
    bodyweightKg: bodyweightKg || null,
    notes: "",
    exercises: [],
  };
}

function firstSet(setNumber: number, kind: SetKind = "standard") {
  return {
    setNumber,
    reps: kind === "negative" ? 3 : 8,
    weightKg: 0,
    assistanceKg: kind === "assisted" ? 15 : null,
    durationSeconds: null,
    kind,
    completed: true,
  };
}

function suggestedFirstSet(setNumber: number, last: ReturnType<typeof lastExercisePerformance>) {
  if (!last) return firstSet(setNumber);
  return {
    setNumber,
    reps: last.reps,
    weightKg: last.weightKg,
    assistanceKg: last.assistanceKg ?? null,
    durationSeconds: null,
    kind: last.kind,
    completed: true,
  };
}

export function WorkoutLogger({
  exercises,
  workouts,
  templates,
  latestBodyweight,
  onSaved,
  onSaveWorkout,
  onSaveTemplate,
  onCreateExercise,
}: {
  exercises: Exercise[];
  workouts: Workout[];
  templates: WorkoutTemplate[];
  latestBodyweight?: number | null;
  onSaved: (workout: Workout) => void;
  onSaveWorkout: (workout: WorkoutInput) => Promise<Workout>;
  onSaveTemplate: (template: Pick<WorkoutTemplate, "name" | "category" | "exercises">) => Promise<WorkoutTemplate>;
  onCreateExercise: (input: ExerciseInput) => Promise<Exercise>;
}) {
  const { draft, setDraft } = useWorkoutStore();
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickExercise, setQuickExercise] = useState<ExerciseInput>({
    name: "",
    category: "Custom",
    notes: "",
    isBodyweight: false,
  });
  const activeDraft = draft || emptyWorkout(latestBodyweight);

  useEffect(() => {
    if (!draft) setDraft(emptyWorkout(latestBodyweight));
  }, [draft, latestBodyweight, setDraft]);

  const comparison = useMemo(() => compareWorkoutToPrevious(activeDraft, workouts), [activeDraft, workouts]);
  const filteredExercises = exercises
    .filter((exercise) => !exercise.archivedAt)
    .filter((exercise) => `${exercise.name} ${exercise.category} ${exercise.notes || ""}`.toLowerCase().includes(exerciseQuery.toLowerCase()))
    .slice(0, 8);

  function updateDraft(changes: Partial<WorkoutInput>) {
    setDraft({ ...activeDraft, ...changes });
  }

  function addExercise(exercise: Exercise) {
    const existingCount = activeDraft.exercises.length;
    const last = lastExercisePerformance(workouts, exercise.id);
    const loggedExercise: LoggedExerciseInput = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      category: exercise.category,
      notes: "",
      sets: [suggestedFirstSet(1, last)],
    };
    setDraft({
      ...activeDraft,
      name: existingCount === 0 ? `${exercise.category} Session` : activeDraft.name,
      exercises: [...activeDraft.exercises, loggedExercise],
    });
    setExerciseQuery("");
  }

  async function createAndAddExercise() {
    if (!quickExercise.name.trim()) {
      setStatus("Exercise name is required.");
      return;
    }
    const exercise = await onCreateExercise(quickExercise);
    addExercise(exercise);
    setQuickExercise({ name: "", category: "Custom", notes: "", isBodyweight: false });
    setQuickCreateOpen(false);
    setStatus("Exercise created and added.");
  }

  function updateExercise(index: number, changes: Partial<LoggedExerciseInput>) {
    setDraft({
      ...activeDraft,
      exercises: activeDraft.exercises.map((exercise, itemIndex) =>
        itemIndex === index ? { ...exercise, ...changes } : exercise,
      ),
    });
  }

  function updateSet(exerciseIndex: number, setIndex: number, changes: Partial<LoggedExerciseInput["sets"][number]>) {
    const nextExercises = activeDraft.exercises.map((exercise, index) => {
      if (index !== exerciseIndex) return exercise;
      return {
        ...exercise,
        sets: exercise.sets.map((set, itemIndex) => (itemIndex === setIndex ? { ...set, ...changes } : set)),
      };
    });
    setDraft({ ...activeDraft, exercises: nextExercises });
  }

  function addSet(exerciseIndex: number) {
    const exercise = activeDraft.exercises[exerciseIndex];
    const lastSet = exercise.sets.at(-1);
    updateExercise(exerciseIndex, {
      sets: [
        ...exercise.sets,
        {
          ...(lastSet || firstSet(1)),
          setNumber: exercise.sets.length + 1,
        },
      ],
    });
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    const exercise = activeDraft.exercises[exerciseIndex];
    const sets = exercise.sets
      .filter((_, index) => index !== setIndex)
      .map((set, index) => ({ ...set, setNumber: index + 1 }));
    updateExercise(exerciseIndex, { sets });
  }

  function removeExercise(exerciseIndex: number) {
    setDraft({
      ...activeDraft,
      exercises: activeDraft.exercises.filter((_, index) => index !== exerciseIndex),
    });
  }

  function duplicatePreviousWorkout() {
    const previous = workouts[0];
    if (!previous) return;
    setDraft({
      name: `${previous.name} Copy`,
      performedAt: nowIso(),
      bodyweightKg: latestBodyweight || previous.bodyweightKg || null,
      notes: previous.notes || "",
      exercises: previous.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        category: exercise.category,
        notes: exercise.notes || "",
        sets: exercise.sets.map((set, index) => ({
          setNumber: index + 1,
          reps: set.reps,
          weightKg: set.weightKg,
          assistanceKg: set.assistanceKg ?? null,
          durationSeconds: set.durationSeconds ?? null,
          kind: set.kind,
          completed: true,
        })),
      })),
    });
    setStatus("Previous workout duplicated.");
  }

  function applyTemplate(template: WorkoutTemplate) {
    setDraft({
      ...activeDraft,
      name: template.name,
      exercises: template.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        category: exercise.category,
        notes: "",
        sets: Array.from({ length: exercise.targetSets }, (_, index) => firstSet(index + 1)),
      })),
    });
  }

  async function saveTemplateFromDraft() {
    if (activeDraft.exercises.length === 0) {
      setStatus("Add exercises before saving a template.");
      return;
    }

    const template = await onSaveTemplate({
      name: activeDraft.name,
      category: activeDraft.exercises.length === 1 ? activeDraft.exercises[0].category : "Mixed",
      exercises: activeDraft.exercises.map((exercise) => ({
        id: crypto.randomUUID(),
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        category: exercise.category,
        targetSets: exercise.sets.length,
        targetReps: exercise.sets.map((set) => set.reps).join("/") || "8-12",
      })),
    });
    setStatus(`${template.name} saved.`);
  }

  async function saveWorkout() {
    setStatus("");
    if (activeDraft.exercises.length === 0) {
      setStatus("Add at least one exercise.");
      return;
    }

    setSaving(true);
    try {
      const workout = await onSaveWorkout(activeDraft);
      setDraft(emptyWorkout(activeDraft.bodyweightKg || latestBodyweight));
      onSaved(workout);
      setStatus("Workout saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save workout.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Panel>
        <SectionTitle
          eyebrow="Log"
          title="Workout session"
          action={
            <GhostButton className="hidden min-h-10 md:inline-flex" onClick={duplicatePreviousWorkout} disabled={!workouts.length}>
              <Copy size={16} aria-hidden />
              Duplicate
            </GhostButton>
          }
        />
        <div className="grid gap-3 md:grid-cols-[1fr_180px_140px]">
          <label>
            <span className="mb-1 block text-sm text-slate-300">Name</span>
            <Field value={activeDraft.name} onChange={(event) => updateDraft({ name: event.target.value })} />
          </label>
          <label>
            <span className="mb-1 block text-sm text-slate-300">Date</span>
            <Field
              type="datetime-local"
              value={toInputDate(activeDraft.performedAt)}
              onChange={(event) => updateDraft({ performedAt: fromInputDate(event.target.value) })}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm text-slate-300">Bodyweight</span>
            <Field
              type="number"
              min={0}
              value={activeDraft.bodyweightKg || ""}
              onChange={(event) => updateDraft({ bodyweightKg: Number(event.target.value) || null })}
              placeholder="kg"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <GhostButton className="min-h-11 md:hidden" onClick={duplicatePreviousWorkout} disabled={!workouts.length}>
            <Copy size={16} aria-hidden />
            Duplicate previous
          </GhostButton>
          {templates.map((template) => (
            <GhostButton key={template.id} className="min-h-11 px-3" onClick={() => applyTemplate(template)}>
              {template.name}
            </GhostButton>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Panel>
            <SectionTitle
              eyebrow="Add"
              title="Exercises"
              action={
                <GhostButton
                  className="min-h-10 px-3"
                  onClick={() => {
                    setQuickCreateOpen(!quickCreateOpen);
                    setQuickExercise((current) => ({ ...current, name: exerciseQuery }));
                  }}
                >
                  <Plus size={16} aria-hidden />
                  Add Exercise
                </GhostButton>
              }
            />
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-3.5 text-slate-500" size={18} aria-hidden />
              <Field className="pl-10" placeholder="Search bench, pull-up, rows..." value={exerciseQuery} onChange={(event) => setExerciseQuery(event.target.value)} />
            </label>
            {quickCreateOpen ? (
              <div className="mt-3 rounded-lg border border-line bg-coal/70 p-3">
                <div className="grid gap-2 md:grid-cols-[1fr_160px]">
                  <Field
                    aria-label="Custom exercise name"
                    placeholder="Exercise name"
                    value={quickExercise.name}
                    onChange={(event) => setQuickExercise({ ...quickExercise, name: event.target.value })}
                  />
                  <Select
                    aria-label="Custom exercise category"
                    value={quickExercise.category}
                    onChange={(event) => setQuickExercise({ ...quickExercise, category: event.target.value as ExerciseInput["category"] })}
                  >
                    {exerciseCategories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
                  <Field
                    aria-label="Custom exercise notes"
                    placeholder="Optional notes"
                    value={quickExercise.notes || ""}
                    onChange={(event) => setQuickExercise({ ...quickExercise, notes: event.target.value })}
                  />
                  <label className="flex min-h-12 items-center gap-2 rounded-lg border border-line bg-white/[0.04] px-3 text-sm text-slate-300">
                    <input
                      className="h-5 w-5 accent-lift"
                      checked={Boolean(quickExercise.isBodyweight)}
                      onChange={(event) => setQuickExercise({ ...quickExercise, isBodyweight: event.target.checked })}
                      type="checkbox"
                    />
                    Bodyweight
                  </label>
                </div>
                <PrimaryButton className="mt-2 w-full" onClick={createAndAddExercise}>
                  Create and add
                </PrimaryButton>
              </div>
            ) : null}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {filteredExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-line bg-coal/70 px-3 text-left transition hover:border-lift/50 hover:bg-lift/10"
                  onClick={() => addExercise(exercise)}
                  type="button"
                >
                  <span>
                    <span className="block font-medium text-white">{exercise.name}</span>
                    <span className="text-xs text-slate-400">
                      {exercise.category}
                      {lastExercisePerformance(workouts, exercise.id)
                        ? ` - Last ${lastExercisePerformance(workouts, exercise.id)?.weightKg}kg x ${lastExercisePerformance(workouts, exercise.id)?.reps}`
                        : ""}
                    </span>
                  </span>
                  <Plus size={18} className="text-lift" aria-hidden />
                </button>
              ))}
            </div>
          </Panel>

          {activeDraft.exercises.map((exercise, exerciseIndex) => {
            const improvement = comparison.find((item) => item.exerciseId === exercise.exerciseId);
            const last = lastExercisePerformance(workouts, exercise.exerciseId);
            return (
              <Panel key={`${exercise.exerciseId}-${exerciseIndex}`} className="p-3 md:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">{exercise.exerciseName}</h3>
                      <Pill>{exercise.category}</Pill>
                      {improvement && improvement.volumeDelta > 0 ? (
                        <Pill className="border-lift/30 text-lift">+{Math.round(improvement.volumeDelta)} kg volume</Pill>
                      ) : null}
                      {improvement && improvement.bestSetDelta > 0 ? (
                        <Pill className="border-amber/30 text-amber">+{improvement.bestSetDelta} kg e1RM</Pill>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {last ? `Last session: ${last.weightKg}kg x ${last.reps}` : `Previous volume ${Math.round(improvement?.previousVolume || 0).toLocaleString()} kg`}
                    </p>
                  </div>
                  <IconButton aria-label="Remove exercise" onClick={() => removeExercise(exerciseIndex)}>
                    <Trash2 size={18} aria-hidden />
                  </IconButton>
                </div>

                <div className="mt-4 space-y-3">
                  {exercise.sets.map((set, setIndex) => (
                    <div key={setIndex} className="grid gap-2 rounded-lg border border-line bg-coal/60 p-3 sm:grid-cols-[54px_1fr_1fr_1fr_1fr_48px]">
                      <div className="flex h-12 items-center justify-center rounded-lg bg-white/[0.04] text-sm font-semibold text-slate-300">
                        {set.setNumber}
                      </div>
                      <Field
                        aria-label="Reps"
                        type="number"
                        min={0}
                        value={set.reps}
                        onChange={(event) => updateSet(exerciseIndex, setIndex, { reps: Number(event.target.value) })}
                        placeholder="Reps"
                      />
                      <Field
                        aria-label="Weight kilograms"
                        type="number"
                        min={0}
                        value={set.weightKg}
                        onChange={(event) => updateSet(exerciseIndex, setIndex, { weightKg: Number(event.target.value) })}
                        placeholder="kg"
                      />
                      <Field
                        aria-label="Assistance kilograms"
                        type="number"
                        min={0}
                        value={set.assistanceKg ?? ""}
                        onChange={(event) => updateSet(exerciseIndex, setIndex, { assistanceKg: Number(event.target.value) || null })}
                        placeholder="assist"
                      />
                      <Select
                        aria-label="Set type"
                        value={set.kind}
                        onChange={(event) => updateSet(exerciseIndex, setIndex, { kind: event.target.value as SetKind })}
                      >
                        <option value="standard">Standard</option>
                        <option value="assisted">Assisted</option>
                        <option value="negative">Negative</option>
                        <option value="partial">Partial</option>
                      </Select>
                      <IconButton aria-label="Remove set" onClick={() => removeSet(exerciseIndex, setIndex)} disabled={exercise.sets.length === 1}>
                        <Trash2 size={16} aria-hidden />
                      </IconButton>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <GhostButton className="min-h-11" onClick={() => addSet(exerciseIndex)}>
                    <Plus size={16} aria-hidden />
                    Add set
                  </GhostButton>
                  <GhostButton className="min-h-11" onClick={() => addSet(exerciseIndex)}>
                    <Copy size={16} aria-hidden />
                    Duplicate set
                  </GhostButton>
                </div>

                <TextArea
                  className="mt-3"
                  placeholder="Exercise notes"
                  value={exercise.notes || ""}
                  onChange={(event) => updateExercise(exerciseIndex, { notes: event.target.value })}
                />
              </Panel>
            );
          })}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          <RestTimer />
          <Panel>
            <SectionTitle eyebrow="Finish" title="Save session" />
            <TextArea
              placeholder="Workout notes"
              value={activeDraft.notes || ""}
              onChange={(event) => updateDraft({ notes: event.target.value })}
            />
            {status ? (
              <p className="mt-3 rounded-lg border border-line bg-coal/70 px-3 py-2 text-sm text-slate-300">{status}</p>
            ) : null}
            <PrimaryButton className="mt-3 w-full" onClick={saveWorkout} disabled={saving}>
              <Save size={18} aria-hidden />
              {saving ? "Saving..." : "Save workout"}
            </PrimaryButton>
            <GhostButton className="mt-2 w-full" onClick={saveTemplateFromDraft}>
              <CheckCircle2 size={18} aria-hidden />
              Save as template
            </GhostButton>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
