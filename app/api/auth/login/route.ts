import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { db, setPlatformRlsContext } from "@/lib/db";
import type { LoginRequest, SessionUser } from "@/lib/types";
import * as store from "@/lib/auth/session-store";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  getSessionCookieOptions,
  getSessionCookieDomain,
} from "@/lib/auth";

function toSessionUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "super_admin" | "admin" | "third_party" | "back_office";
  agencyId: string | null;
  organizationId: string | null;
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    agencyId: user.agencyId,
    organizationId: user.organizationId ?? null,
  };
}

function buildSetCookieHeader(sessionId: string, hostHeader: string | null): string {
  const opts = getSessionCookieOptions();
  const parts = [
    `${SESSION_COOKIE_NAME}=${sessionId}`,
    `Path=${opts.path}`,
    `HttpOnly`,
    `SameSite=${opts.sameSite}`,
    `Max-Age=${opts.maxAge}`,
  ];
  const domain = getSessionCookieDomain(hostHeader);
  if (domain) parts.push(`Domain=${domain}`);
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginRequest;
    const { email, password } = body;
    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    await setPlatformRlsContext();
    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    const sessionUser = toSessionUser(user);
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
    await store.setSession(sessionToken, sessionUser, expiresAt);

    const hostHeader = request.headers.get("host") ?? request.headers.get("x-forwarded-host");
    const response = NextResponse.json({ user: sessionUser });
    response.headers.set("Set-Cookie", buildSetCookieHeader(sessionToken, hostHeader));
    return response;
  } catch (err) {
    console.error("[login] error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "An error occurred" },
      { status: 500 }
    );
  }
}
