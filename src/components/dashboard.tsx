"use client";

import { Award, CalendarCheck, Flame, Scale, TrendingUp } from "lucide-react";
import { BodyweightChart, FrequencyChart, StrengthTrendChart, VolumeChart } from "@/components/charts";
import { MetricCard, Panel, Pill, SectionTitle } from "@/components/ui";
import { personalRecords, workoutStreak } from "@/lib/metrics";
import type { BodyweightEntry, Workout } from "@/types/domain";

export function Dashboard({
  workouts,
  bodyweight,
  onLogWorkout,
}: {
  workouts: Workout[];
  bodyweight: BodyweightEntry[];
  onLogWorkout: () => void;
}) {
  const records = personalRecords(workouts).slice(0, 5);
  const latestBodyweight = bodyweight.at(-1)?.weightKg || workouts.find((workout) => workout.bodyweightKg)?.bodyweightKg || 0;
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weeklyWorkouts = workouts.filter((workout) => new Date(workout.performedAt) >= weekStart);
  const streak = workoutStreak(workouts);
  const totalVolume = weeklyWorkouts.reduce((sum, workout) => sum + workout.totalVolume, 0);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="This week"
          value={weeklyWorkouts.length}
          detail="workouts completed"
          accent="lift"
        />
        <MetricCard label="Total workouts" value={workouts.length} detail="saved sessions" accent="amber" />
        <MetricCard
          label="Bodyweight"
          value={latestBodyweight ? `${latestBodyweight} kg` : "Set"}
          detail={latestBodyweight ? "latest entry" : "log first weigh-in"}
          accent="sky"
        />
        <MetricCard label="Streak" value={`${streak}d`} detail="consecutive training days" accent="rose" />
      </section>

      <Panel className="overflow-hidden">
        <SectionTitle
          eyebrow="Strength"
          title="Long-term progression"
          action={
            <button
              className="min-h-10 rounded-lg bg-lift px-3 text-sm font-semibold text-coal transition hover:bg-emerald-300"
              onClick={onLogWorkout}
            >
              Log
            </button>
          }
        />
        {workouts.length > 0 ? (
          <StrengthTrendChart workouts={workouts} />
        ) : (
          <EmptyState icon={<TrendingUp aria-hidden />} title="No trend yet" text="Your first saved workout starts the chart." />
        )}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionTitle eyebrow="Volume" title="Weekly load" />
          {workouts.length > 0 ? <VolumeChart workouts={workouts} /> : <EmptyState icon={<Flame aria-hidden />} title="Volume will appear here" text="Sets, reps, and load create weekly volume." />}
        </Panel>

        <Panel>
          <SectionTitle eyebrow="PRs" title="Personal records" />
          {records.length > 0 ? (
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.exerciseId} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-coal/60 p-3">
                  <div>
                    <p className="font-medium text-white">{record.exerciseName}</p>
                    <p className="text-sm text-slate-400">
                      {record.reps} reps at {record.weightKg} kg
                    </p>
                  </div>
                  <Pill className="border-lift/30 text-lift">
                    <Award size={14} aria-hidden />
                    {record.value} kg
                  </Pill>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Award aria-hidden />} title="PRs are waiting" text="Best estimated 1RM records appear after logging." />
          )}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <SectionTitle eyebrow="Consistency" title="Workout frequency" />
          <FrequencyChart workouts={workouts} />
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Scale" title="Bodyweight trend" />
          {bodyweight.length > 1 ? (
            <BodyweightChart entries={bodyweight} />
          ) : (
            <EmptyState icon={<Scale aria-hidden />} title="Add weigh-ins" text="Bodyweight history helps calculate bodyweight exercise load." />
          )}
        </Panel>
      </div>

      <Panel>
        <SectionTitle eyebrow="Recent" title="Workout summary" />
        {workouts.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {workouts.slice(0, 4).map((workout) => (
              <article key={workout.id} className="rounded-lg border border-line bg-coal/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{workout.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{new Date(workout.performedAt).toLocaleDateString()}</p>
                  </div>
                  <Pill>
                    <CalendarCheck size={14} aria-hidden />
                    {workout.exercises.length} moves
                  </Pill>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill>{Math.round(workout.totalVolume).toLocaleString()} kg volume</Pill>
                  {workout.bodyweightKg ? <Pill>{workout.bodyweightKg} kg BW</Pill> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={<CalendarCheck aria-hidden />} title="No workouts saved" text="Start with a template or add exercises manually." />
        )}
      </Panel>

      {totalVolume > 0 ? (
        <p className="text-center text-sm text-slate-400">
          Weekly volume: <span className="font-semibold text-lift">{Math.round(totalVolume).toLocaleString()} kg</span>
        </p>
      ) : null}
    </div>
  );
}

function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="grid min-h-44 place-items-center rounded-lg border border-dashed border-line bg-coal/40 p-6 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-white/[0.04] text-slate-300">{icon}</div>
        <p className="mt-3 font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm text-slate-400">{text}</p>
      </div>
    </div>
  );
}
