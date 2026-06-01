import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, hashPassword, issueSession } from "@/lib/auth";
import { isValidEmail, jsonError, requireString } from "@/lib/api";
import { createUserRecord, findUserByEmail, toPublicUser } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const name = requireString(body.name);
  const email = requireString(body.email).toLowerCase();
  const password = requireString(body.password);

  if (name.length < 2) return jsonError("Enter your name.");
  if (!isValidEmail(email)) return jsonError("Enter a valid email address.");
  if (password.length < 8) return jsonError("Use at least 8 characters for your password.");
  if (findUserByEmail(email)) return jsonError("An account already exists for this email.", 409);

  const { passwordHash, passwordSalt } = hashPassword(password);
  const user = createUserRecord({ name, email, passwordHash, passwordSalt });
  if (!user) return jsonError("Could not create your account.", 500);

  const session = issueSession(user.id);
  const response = NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
  attachSessionCookie(response, session.token, session.expiresAt);
  return response;
}
