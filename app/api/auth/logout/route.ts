import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as store from "@/lib/auth/session-store";
import { SESSION_COOKIE_NAME, getSessionCookieDomain } from "@/lib/auth";

function buildClearCookieHeader(hostHeader: string | null): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  const domain = getSessionCookieDomain(hostHeader);
  if (domain) parts.push(`Domain=${domain}`);
  return parts.join("; ");
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    await store.deleteSession(sessionToken);
  }
  const hostHeader = request.headers.get("host");
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildClearCookieHeader(hostHeader));
  return response;
}
