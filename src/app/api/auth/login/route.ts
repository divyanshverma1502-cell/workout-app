import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, authenticateEmailPassword, issueSession } from "@/lib/auth";
import { jsonError, requireString } from "@/lib/api";
import { toPublicUser } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const email = requireString(body.email);
  const password = requireString(body.password);
  const user = authenticateEmailPassword(email, password);

  if (!user) return jsonError("Email or password is incorrect.", 401);

  const session = issueSession(user.id);
  const response = NextResponse.json({ user: toPublicUser(user) });
  attachSessionCookie(response, session.token, session.expiresAt);
  return response;
}
