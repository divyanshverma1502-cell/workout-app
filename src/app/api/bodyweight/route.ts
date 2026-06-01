import { NextRequest, NextResponse } from "next/server";
import { currentUserFromRequest } from "@/lib/auth";
import { jsonError, requireNumber } from "@/lib/api";
import { addBodyweight, listBodyweight } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = currentUserFromRequest(request);
  if (!user) return jsonError("You need to log in first.", 401);
  return NextResponse.json({ bodyweight: listBodyweight(user.id) });
}

export async function POST(request: NextRequest) {
  const user = currentUserFromRequest(request);
  if (!user) return jsonError("You need to log in first.", 401);

  const body = (await request.json()) as Record<string, unknown>;
  const weightKg = requireNumber(body.weightKg);
  if (weightKg <= 0) return jsonError("Bodyweight must be greater than zero.");

  const entry = addBodyweight(
    user.id,
    weightKg,
    typeof body.notes === "string" ? body.notes : null,
    typeof body.loggedAt === "string" ? body.loggedAt : new Date().toISOString(),
  );
  return NextResponse.json({ entry }, { status: 201 });
}
