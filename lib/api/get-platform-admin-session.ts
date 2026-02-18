/**
 * Platform-admin-only API helper.
 * Use for routes that only platform admins (role super_admin, organizationId === null) can access.
 */

import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/types";
import * as store from "@/lib/auth/session-store";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { setPlatformRlsContext } from "@/lib/db";
import { cookies } from "next/headers";

export interface PlatformAdminSession {
  user: SessionUser;
}

export async function getPlatformAdminSession(
  _request: Request
): Promise<PlatformAdminSession | NextResponse> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }
  const user = await store.getSession(sessionToken);
  if (!user) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }
  const isPlatformAdmin = user.role === "super_admin" && user.organizationId == null;
  if (!isPlatformAdmin) {
    return NextResponse.json(
      { message: "Platform admin access only" },
      { status: 403 }
    );
  }
  await setPlatformRlsContext();
  return { user };
}
