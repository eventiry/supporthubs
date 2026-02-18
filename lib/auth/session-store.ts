/**
 * Session store backed by the database (Prisma).
 * Persists across server restarts and serverless invocations.
 *
 * Session lookup uses raw SQL for the sessions table (no RLS) to avoid Neon/pooler
 * issues with set_config not persisting across queries. User is fetched separately
 * with super_admin context.
 */

import type { SessionUser } from "@/lib/types";
import { db } from "@/lib/db";
import { setRequestRlsContext } from "@/lib/db/rls";
import { Prisma } from "@prisma/client";

export async function setSession(
  sessionToken: string,
  user: SessionUser,
  expiresAt: Date
): Promise<void> {
  await db.$transaction(async (tx) => {
    await setRequestRlsContext(tx as Parameters<typeof setRequestRlsContext>[0], null, "super_admin");
    await tx.session.upsert({
      where: { sessionToken },
      update: { userId: user.id, expiresAt },
      create: {
        sessionToken,
        userId: user.id,
        expiresAt,
      },
    });
  });
}

export async function getSession(sessionToken: string): Promise<SessionUser | undefined> {
  // 1. Raw query sessions only (no RLS on sessions) — avoids pooler/set_config issues
  const rows = await db.$queryRaw<
    Array<{ id: string; userId: string; expiresAt: Date }>
  >(Prisma.sql`SELECT id, "userId", "expiresAt" FROM sessions WHERE "sessionToken" = ${sessionToken} LIMIT 1`);

  const row = rows[0];
  if (!row) return undefined;
  if (row.expiresAt < new Date()) {
    await db.session.delete({ where: { sessionToken } }).catch(() => {});
    return undefined;
  }

  // 2. Fetch user with super_admin (users table has RLS) — must run in same connection as set_config
  const user = await db.$transaction(async (tx) => {
    await setRequestRlsContext(tx as Parameters<typeof setRequestRlsContext>[0], null, "super_admin");
    return tx.user.findUnique({
      where: { id: row.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        agencyId: true,
        organizationId: true,
        status: true,
      },
    });
  });
  if (!user || user.status !== "ACTIVE") return undefined;

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

export async function deleteSession(sessionToken: string): Promise<void> {
  await db.$transaction(async (tx) => {
    await setRequestRlsContext(tx as Parameters<typeof setRequestRlsContext>[0], null, "super_admin");
    await tx.session.deleteMany({ where: { sessionToken } });
  });
}
