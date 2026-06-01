import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, logoutRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  logoutRequest(request);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
