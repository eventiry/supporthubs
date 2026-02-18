import { NextRequest, NextResponse } from "next/server";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { Permission } from "@/lib/rbac/permissions";
import { db } from "@/lib/db";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";

/**
 * GET /api/redemptions — list redemptions for reporting (admin/back_office). Scoped to current tenant (via voucher.organizationId).
 * Query: fromDate?, toDate? (filter by redeemedAt).
 */
export async function GET(req: NextRequest) {
  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  const permissions = getPermissionsForRole(user.role);
  const canRedeem = permissions.includes(Permission.VOUCHER_REDEEM);
  const canViewAll = permissions.includes(Permission.VOUCHER_VIEW_ALL);
  if (!canRedeem && !canViewAll) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const fromDate = searchParams.get("fromDate")?.trim() ?? undefined;
  const toDate = searchParams.get("toDate")?.trim() ?? undefined;

  const where: {
    voucher: { is: { organizationId: string } };
    redeemedAt?: { gte?: Date; lte?: Date };
  } = { voucher: { is: { organizationId: tenant.organizationId } } };
  if (fromDate || toDate) {
    where.redeemedAt = {};
    if (fromDate) where.redeemedAt.gte = new Date(fromDate);
    if (toDate) where.redeemedAt.lte = new Date(toDate);
  }

  const redemptions = await db.redemption.findMany({
    where,
    orderBy: { redeemedAt: "desc" },
    include: {
      voucher: {
        select: {
          id: true,
          code: true,
          clientId: true,
          status: true,
          client: { select: { firstName: true, surname: true } },
        },
      },
      center: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(redemptions);
}
