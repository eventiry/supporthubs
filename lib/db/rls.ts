/**
 * Row-Level Security (RLS) request context.
 * Set app.current_organization and app.current_role so Postgres RLS policies can enforce tenant isolation.
 */

import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

const ALLOWED_ROLES = new Set(["super_admin", "tenant_resolver", ""]);

export async function setRequestRlsContext(
  prisma: PrismaClient,
  organizationId: string | null,
  role: "super_admin" | "tenant_resolver" | null
): Promise<void> {
  const orgValue = organizationId ?? "";
  const roleValue = role ?? "";
  if (role !== null && roleValue !== "" && !ALLOWED_ROLES.has(roleValue)) {
    throw new Error(`setRequestRlsContext: invalid role`);
  }
  await prisma.$executeRaw(
    Prisma.sql`SELECT set_config('app.current_organization', ${orgValue}, true)`
  );
  await prisma.$executeRaw(
    Prisma.sql`SELECT set_config('app.current_role', ${roleValue}, true)`
  );
}

export async function setPlatformRlsContext(prisma: PrismaClient): Promise<void> {
  await setRequestRlsContext(prisma, null, "super_admin");
}

export async function setTenantRlsContext(prisma: PrismaClient, organizationId: string): Promise<void> {
  await setRequestRlsContext(prisma, organizationId, null);
}
