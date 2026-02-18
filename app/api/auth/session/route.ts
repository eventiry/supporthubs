import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as store from "@/lib/auth/session-store";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

/**
 * GET /api/auth/session — return current session user or null.
 * Returns 200 with null when not authenticated.
 */
export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return NextResponse.json(null);
  const user = await store.getSession(sessionToken);
  return NextResponse.json(user ?? null);
}
