import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "mfb_session";

/** Path prefixes that require auth. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/clients",
  "/vouchers",
  "/redeem",
  "/reports",
  "/users",
  "/settings",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

/**
 * Redirect unauthenticated users from protected routes to /login?callbackUrl=...
 * Do NOT rewrite /dashboard to / — dashboard routes live at /dashboard and /dashboard/*.
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (isProtectedPath(pathname) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/clients",
    "/clients/:path*",
    "/vouchers",
    "/vouchers/:path*",
    "/redeem",
    "/reports",
    "/users",
    "/users/:path*",
    "/settings",
  ],
};
