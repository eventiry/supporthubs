/**
 * Server-side auth helpers. Use only in API routes and server components.
 * Session data is stored in the database via session-store (persists across restarts and serverless).
 */

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/lib/types";
import * as store from "./session-store";

export const SESSION_COOKIE_NAME = "mfb_session";

const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
  };
}

/**
 * Do NOT set Domain for localhost or *.localhost — browsers reject cookies with
 * Domain=.localhost. Omitting Domain yields host-only cookies that work on both
 * localhost and tenant subdomains (e.g. walkerdistrict.localhost).
 */
export function getSessionCookieDomain(_hostHeader: string | null): string | undefined {
  return undefined;
}

export { SESSION_MAX_AGE };

/**
 * Get current session from cookie and database. Returns null if not authenticated or expired.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return null;
  const user = await store.getSession(sessionToken);
  return user ?? null;
}

/**
 * Redirect to /login if no session. Preserves current path as callbackUrl so user returns after login.
 */
export async function protectRoute(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? headersList.get("x-url") ?? "";
    const callbackUrl =
      pathname && pathname.startsWith("/") && !pathname.startsWith("//")
        ? pathname
        : "/dashboard";
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return session;
}
