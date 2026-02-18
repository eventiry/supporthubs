/**
 * Shared helper for tenant-scoped API routes.
 * Returns session user and tenant context, or an error response.
 */

import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/types";
import type { TenantContext } from "@/lib/tenant";
import * as store from "@/lib/auth/session-store";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";
import { setTenantRlsContext } from "@/lib/db";
import { cookies } from "next/headers";

export interface SessionAndTenant {
  user: SessionUser;
  tenant: TenantContext;
}

export async function getSessionUserAndTenant(
  request: Request
): Promise<SessionAndTenant | NextResponse> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }
  const user = await store.getSession(sessionToken);
  if (!user) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const tenant = await getTenantFromRequest(request);
  if (!tenant) {
    return NextResponse.json(
      { message: "Organization not available" },
      { status: 503 }
    );
  }

  if (user.organizationId != null && user.organizationId !== tenant.organizationId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await setTenantRlsContext(tenant.organizationId);
  return { user, tenant };
}
