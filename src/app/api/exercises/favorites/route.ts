import { NextRequest, NextResponse } from "next/server";
import { currentUserFromRequest } from "@/lib/auth";
import { jsonError, requireString } from "@/lib/api";
import { setExerciseFavorite } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  const user = currentUserFromRequest(request);
  if (!user) return jsonError("You need to log in first.", 401);

  const body = (await request.json()) as Record<string, unknown>;
  const exerciseId = requireString(body.exerciseId);
  if (!exerciseId) return jsonError("Exercise is required.");

  setExerciseFavorite(user.id, exerciseId, Boolean(body.favorite));
  return NextResponse.json({ ok: true });
}
