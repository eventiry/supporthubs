/**
 * Audit logging helper. Call from API routes on create/update/delete.
 * Do not put sensitive data (e.g. password) in changes.
 */

import type { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { AuditAction } from "@prisma/client";

export interface CreateAuditLogParams {
  userId?: string | null;
  organizationId?: string | null;
  action: AuditAction;
  entity: string;
  entityId: string;
  changes?: Record<string, unknown> | null;
}

/**
 * Create an audit log entry. Fire-and-forget; errors are logged but do not fail the request.
 */
export async function createAuditLog(
  db: PrismaClient,
  params: CreateAuditLogParams
): Promise<void> {
  const { userId, organizationId, action, entity, entityId, changes } = params;
  try {
    await db.auditLog.create({
      data: {
        userId: userId ?? null,
        organizationId: organizationId ?? null,
        action,
        entity,
        entityId,
        changes: (changes ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to create audit log:", err);
  }
}
