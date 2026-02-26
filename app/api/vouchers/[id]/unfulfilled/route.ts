import { NextRequest, NextResponse } from "next/server";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { Permission } from "@/lib/rbac/permissions";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";

/**
 * PATCH /api/vouchers/[id]/unfulfilled
 * Body: { reason?: string }
 * Marks an issued voucher as unfulfilled (e.g. client did not collect). Optional reason.
 * Requires VOUCHER_REDEEM.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  if (!getPermissionsForRole(user.role).includes(Permission.VOUCHER_REDEEM)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id: voucherId } = await params;
  const voucher = await db.voucher.findUnique({
    where: { id: voucherId, organizationId: tenant.organizationId },
  });

  if (!voucher) {
    return NextResponse.json({ message: "Voucher not found" }, { status: 404 });
  }
  if (voucher.status !== "issued") {
    return NextResponse.json(
      { message: "Only issued vouchers can be marked as unfulfilled" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const payload = body as { reason?: string };
  const reason =
    typeof payload.reason === "string" ? payload.reason.trim() || undefined : undefined;

  const updated = await db.voucher.update({
    where: { id: voucherId },
    data: { status: "unfulfilled", unfulfilledReason: reason ?? null },
    include: {
      client: { select: { id: true, firstName: true, surname: true } },
    },
  });

  await createAuditLog(db, {
    userId: user.id,
    organizationId: tenant.organizationId,
    action: AuditAction.REDEEM_VOUCHER,
    entity: "Voucher",
    entityId: voucherId,
    changes: { status: "unfulfilled", unfulfilledReason: reason ?? null },
  });

  return NextResponse.json({
    id: updated.id,
    code: updated.code,
    status: updated.status,
    unfulfilledReason: updated.unfulfilledReason,
    client: updated.client,
  });
}
