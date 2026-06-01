import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import {
  createSessionRecord,
  deleteSession,
  findUserByEmail,
  findUserBySessionToken,
  toPublicUser,
} from "@/lib/db";

export const sessionCookieName = "lift_session";

const sessionDays = 30;
const passwordIterations = 310_000;

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString("base64url")) {
  const passwordHash = crypto.pbkdf2Sync(password, salt, passwordIterations, 32, "sha256").toString("base64url");
  return { passwordHash, passwordSalt: salt };
}

export function verifyPassword(password: string, passwordHash: string, passwordSalt: string) {
  const candidate = crypto.pbkdf2Sync(password, passwordSalt, passwordIterations, 32, "sha256");
  const stored = Buffer.from(passwordHash, "base64url");
  return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate);
}

export function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("base64url");
}

export function issueSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
  createSessionRecord(userId, hashSessionToken(token), expiresAt.toISOString());
  return { token, expiresAt };
}

export function attachSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export function currentUserFromRequest(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value;
  if (!token) return null;

  const user = findUserBySessionToken(hashSessionToken(token));
  return user ? toPublicUser(user) : null;
}

export function logoutRequest(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value;
  if (token) deleteSession(hashSessionToken(token));
}

export function authenticateEmailPassword(email: string, password: string) {
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
    return null;
  }
  return user;
}
