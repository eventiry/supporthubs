import { NextRequest, NextResponse } from "next/server";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { Permission } from "@/lib/rbac/permissions";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { redeemPayloadSchema } from "@/lib/validations";
import { AuditAction } from "@prisma/client";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";

/**
 * POST /api/vouchers/[id]/redeem
 * Body: { centerId: string, failureReason?: string, weightKg?: number }
 * Validates voucher exists, status = issued, not expired.
 * Creates Redemption, sets voucher status to redeemed.
 * Requires VOUCHER_REDEEM.
 */
export async function POST(
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
    include: {
      client: { select: { id: true, firstName: true, surname: true } },
    },
  });

  if (!voucher) {
    return NextResponse.json({ message: "Voucher not found" }, { status: 404 });
  }
  if (voucher.status !== "issued") {
    return NextResponse.json(
      { message: "Voucher is not in issued status" },
      { status: 400 }
    );
  }
  const now = new Date();
  if (voucher.expiryDate < now) {
    return NextResponse.json(
      { message: "Voucher has expired" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const parsed = redeemPayloadSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Validation failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
  const { centerId, failureReason, weightKg } = parsed.data;

  const center = await db.foodBankCenter.findUnique({
    where: { id: centerId, organizationId: tenant.organizationId },
  });
  if (!center) {
    return NextResponse.json(
      { message: "Food bank center not found" },
      { status: 400 }
    );
  }

  const [updatedVoucher, redemption] = await db.$transaction([
    db.voucher.update({
      where: { id: voucherId },
      data: { status: "redeemed" },
      include: {
        client: { select: { id: true, firstName: true, surname: true } },
      },
    }),
    db.redemption.create({
      data: {
        voucherId,
        redeemedById: user.id,
        centerId,
        failureReason,
        weightKg:
          typeof weightKg === "number" && weightKg >= 0 ? weightKg : undefined,
      },
    }),
  ]);

  await createAuditLog(db, {
    userId: user.id,
    organizationId: tenant.organizationId,
    action: AuditAction.REDEEM_VOUCHER,
    entity: "Voucher",
    entityId: voucherId,
    changes: {
      centerId,
      failureReason: failureReason ?? null,
      weightKg: weightKg ?? null,
    },
  });

  const summary = {
    id: updatedVoucher.id,
    code: updatedVoucher.code,
    clientId: updatedVoucher.clientId,
    agencyId: updatedVoucher.agencyId,
    status: updatedVoucher.status,
    issueDate: updatedVoucher.issueDate,
    expiryDate: updatedVoucher.expiryDate,
    createdAt: updatedVoucher.createdAt,
    client: updatedVoucher.client,
  };

  return NextResponse.json({
    voucher: summary,
    redemption: {
      id: redemption.id,
      voucherId: redemption.voucherId,
      redeemedAt: redemption.redeemedAt,
      redeemedById: redemption.redeemedById,
      centerId: redemption.centerId,
      failureReason: redemption.failureReason,
      weightKg: redemption.weightKg ?? undefined,
    },
  });
}
