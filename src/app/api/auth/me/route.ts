import { NextRequest, NextResponse } from "next/server";
import { currentUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return NextResponse.json({ user: currentUserFromRequest(request) });
}
