import { NextRequest, NextResponse } from "next/server";
import { currentUserFromRequest } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { listExercises } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = currentUserFromRequest(request);
  if (!user) return jsonError("You need to log in first.", 401);
  return NextResponse.json({ exercises: listExercises(user.id) });
}
