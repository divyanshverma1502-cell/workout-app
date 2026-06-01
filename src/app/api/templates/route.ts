import { NextRequest, NextResponse } from "next/server";
import { currentUserFromRequest } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { listTemplates, saveTemplate } from "@/lib/db";
import type { WorkoutTemplate } from "@/types/domain";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = currentUserFromRequest(request);
  if (!user) return jsonError("You need to log in first.", 401);
  return NextResponse.json({ templates: listTemplates(user.id) });
}

export async function POST(request: NextRequest) {
  const user = currentUserFromRequest(request);
  if (!user) return jsonError("You need to log in first.", 401);

  const body = (await request.json()) as Pick<WorkoutTemplate, "name" | "category" | "exercises">;
  if (!body.name?.trim()) return jsonError("Template name is required.");
  if (!Array.isArray(body.exercises) || body.exercises.length === 0) {
    return jsonError("Add exercises before saving a template.");
  }

  const template = saveTemplate(user.id, body);
  return NextResponse.json({ template }, { status: 201 });
}
