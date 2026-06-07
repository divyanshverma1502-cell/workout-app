"use client";

import { Calculator, Download, FileJson, TrendingUp, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { MusclePieChart, VolumePeriodChart } from "@/components/charts";
import { Field, GhostButton, MetricCard, Panel, SectionTitle } from "@/components/ui";
import { estimateOneRepMax, exerciseRecords, personalRecords, workoutStreak } from "@/lib/metrics";
import type { Workout } from "@/types/domain";

export function Analytics({
  workouts,
  onExportCsv,
  onExportJson,
  onImportJson,
}: {
  workouts: Workout[];
  onExportCsv: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
}) {
  const [weight, setWeight] = useState(60);
  const [reps, setReps] = useState(8);
  const [volumePeriod, setVolumePeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const records = personalRecords(workouts);
  const fullRecords = exerciseRecords(workouts);
  const topRecord = records[0];
  const monthStart = useMemo(() => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const monthWorkouts = workouts.filter((workout) => new Date(workout.performedAt) >= monthStart);
  const monthVolume = monthWorkouts.reduce((sum, workout) => sum + workout.totalVolume, 0);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Month workouts" value={monthWorkouts.length} detail="sessions this month" />
        <MetricCard label="Month volume" value={`${Math.round(monthVolume / 100) / 10}t`} detail="tracked training load" accent="amber" />
        <MetricCard label="Current streak" value={`${workoutStreak(workouts)}d`} detail="daily training streak" accent="rose" />
        <MetricCard label="Top estimated 1RM" value={topRecord ? `${topRecord.value} kg` : "0 kg"} detail={topRecord?.exerciseName || "log a set"} accent="sky" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionTitle
            eyebrow="Load"
            title="Volume trends"
            action={
              <div className="flex gap-1 rounded-lg border border-line bg-coal p-1">
                {(["daily", "weekly", "monthly"] as const).map((period) => (
                  <button
                    key={period}
                    className={`min-h-9 rounded-md px-3 text-xs font-semibold capitalize transition ${volumePeriod === period ? "bg-lift text-coal" : "text-slate-400"}`}
                    onClick={() => setVolumePeriod(period)}
                  >
                    {period}
                  </button>
                ))}
              </div>
            }
          />
          <VolumePeriodChart workouts={workouts} period={volumePeriod} />
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Frequency" title="Muscle group split" />
          <MusclePieChart workouts={workouts} />
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-300">
            {Array.from(new Set(workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.category)))).map((category) => (
              <div key={category} className="rounded-lg border border-line bg-coal/60 px-3 py-2">
                {category}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <SectionTitle eyebrow="Calculator" title="Estimated 1RM" />
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1 block text-sm text-slate-300">Weight kg</span>
              <Field type="number" min={0} value={weight} onChange={(event) => setWeight(Number(event.target.value))} />
            </label>
            <label>
              <span className="mb-1 block text-sm text-slate-300">Reps</span>
              <Field type="number" min={1} value={reps} onChange={(event) => setReps(Number(event.target.value))} />
            </label>
          </div>
          <div className="mt-4 rounded-lg border border-lift/30 bg-lift/10 p-4">
            <div className="flex items-center gap-2 text-lift">
              <Calculator size={18} aria-hidden />
              <span className="text-sm font-semibold uppercase tracking-[0.14em]">Estimate</span>
            </div>
            <p className="mt-2 text-4xl font-semibold text-white">{estimateOneRepMax(weight, reps)} kg</p>
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            eyebrow="Backup"
            title="Data safety"
            action={
              <button className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-lift px-3 text-sm font-semibold text-coal transition hover:bg-emerald-300" onClick={onExportCsv}>
                <Download size={16} aria-hidden />
                CSV
              </button>
            }
          />
          {records.length > 0 ? (
            <div className="space-y-3">
              {records.slice(0, 6).map((record) => (
                <div key={record.exerciseId} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-coal/60 p-3">
                  <div>
                    <p className="font-medium text-white">{record.exerciseName}</p>
                    <p className="text-sm text-slate-400">{new Date(record.achievedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lift">{record.value} kg</p>
                    <p className="text-xs text-slate-400">{record.reps} reps</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-line bg-coal/40 p-6 text-center text-slate-400">
              <div>
                <TrendingUp className="mx-auto mb-3" aria-hidden />
                Records appear after your first saved workout.
              </div>
            </div>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <GhostButton onClick={onExportCsv}>
              <Download size={16} aria-hidden />
              CSV
            </GhostButton>
            <GhostButton onClick={onExportJson}>
              <FileJson size={16} aria-hidden />
              JSON
            </GhostButton>
            <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]">
              <Upload size={16} aria-hidden />
              Restore
              <input
                className="sr-only"
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onImportJson(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionTitle eyebrow="Records" title="Heaviest, reps, and e1RM" />
        {fullRecords.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {fullRecords.slice(0, 9).map((record) => (
              <article key={record.exerciseId} className="rounded-lg border border-line bg-coal/60 p-3">
                <p className="font-semibold text-white">{record.exerciseName}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
                  <div className="rounded-lg bg-white/[0.04] p-2">
                    <span className="block text-base font-semibold text-lift">{record.heaviestWeightKg}</span>
                    kg
                  </div>
                  <div className="rounded-lg bg-white/[0.04] p-2">
                    <span className="block text-base font-semibold text-amber">{record.mostReps}</span>
                    reps
                  </div>
                  <div className="rounded-lg bg-white/[0.04] p-2">
                    <span className="block text-base font-semibold text-sky-300">{record.bestEstimatedOneRepMax}</span>
                    e1RM
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line bg-coal/40 p-6 text-center text-slate-400">
            Records will build automatically from saved sets.
          </div>
        )}
      </Panel>
    </div>
  );
}
