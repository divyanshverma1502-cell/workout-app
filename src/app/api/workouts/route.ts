import { NextRequest, NextResponse } from "next/server";
import { currentUserFromRequest } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { listWorkouts, saveWorkout } from "@/lib/db";
import type { WorkoutInput } from "@/types/domain";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = currentUserFromRequest(request);
  if (!user) return jsonError("You need to log in first.", 401);

  const limit = Number(request.nextUrl.searchParams.get("limit") || "80");
  return NextResponse.json({ workouts: listWorkouts(user.id, Number.isFinite(limit) ? limit : 80) });
}

export async function POST(request: NextRequest) {
  const user = currentUserFromRequest(request);
  if (!user) return jsonError("You need to log in first.", 401);

  const body = (await request.json()) as WorkoutInput;
  if (!body.name?.trim()) return jsonError("Workout name is required.");
  if (!body.performedAt) return jsonError("Workout date is required.");
  if (!Array.isArray(body.exercises) || body.exercises.length === 0) {
    return jsonError("Add at least one exercise.");
  }
  if (body.exercises.some((exercise) => !exercise.exerciseId || exercise.sets.length === 0)) {
    return jsonError("Every exercise needs at least one set.");
  }

  const workout = saveWorkout(user.id, body);
  return NextResponse.json({ workout }, { status: 201 });
}
