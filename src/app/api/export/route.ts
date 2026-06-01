import { NextRequest, NextResponse } from "next/server";
import { currentUserFromRequest } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { listWorkouts } from "@/lib/db";

export const runtime = "nodejs";

function escapeCsv(value: string | number | null | undefined) {
  const stringValue = String(value ?? "");
  if (!/[",\n]/.test(stringValue)) return stringValue;
  return `"${stringValue.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const user = currentUserFromRequest(request);
  if (!user) return jsonError("You need to log in first.", 401);

  const rows = [
    [
      "Workout Date",
      "Workout",
      "Exercise",
      "Category",
      "Set",
      "Kind",
      "Reps",
      "Weight Kg",
      "Assistance Kg",
      "Duration Seconds",
      "Exercise Notes",
      "Workout Notes",
    ],
  ];

  for (const workout of listWorkouts(user.id, 1000)) {
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

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="workout-history.csv"`,
    },
  });
}
