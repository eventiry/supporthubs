import { NextRequest, NextResponse } from "next/server";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { Permission } from "@/lib/rbac/permissions";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";

async function checkVoucherAccess(
  voucherId: string,
  organizationId: string,
  userRole: string,
  userAgencyId: string | null
): Promise<
  | { voucher: { id: string; agencyId: string; status: string; code: string }; error: null }
  | { voucher: null; error: NextResponse }
> {
  const voucher = await db.voucher.findUnique({
    where: { id: voucherId, organizationId },
    select: { id: true, agencyId: true, status: true, code: true },
  });
  if (!voucher) return { voucher: null, error: NextResponse.json({ message: "Voucher not found" }, { status: 404 }) };
  const permissions = getPermissionsForRole(userRole as "admin" | "third_party" | "back_office");
  const viewAll = permissions.includes(Permission.VOUCHER_VIEW_ALL);
  const viewOwn = permissions.includes(Permission.VOUCHER_VIEW_OWN);
  if (!viewAll && !viewOwn) return { voucher: null, error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  if (!viewAll && viewOwn && userAgencyId !== voucher.agencyId) return { voucher: null, error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  return { voucher: { ...voucher, status: voucher.status }, error: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await getSessionUserAndTenant(request);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  const permissions = getPermissionsForRole(user.role);
  const viewAll = permissions.includes(Permission.VOUCHER_VIEW_ALL);
  const viewOwn = permissions.includes(Permission.VOUCHER_VIEW_OWN);
  if (!viewAll && !viewOwn) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const voucher = await db.voucher.findUnique({
    where: { id, organizationId: tenant.organizationId },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          surname: true,
          postcode: true,
          noFixedAddress: true,
          address: true,
        },
      },
      agency: {
        select: {
          id: true,
          name: true,
          contactPhone: true,
          contactEmail: true,
        },
      },
      referralDetails: true,
      foodBankCenter: {
        select: {
          id: true,
          name: true,
          address: true,
          postcode: true,
          phone: true,
          email: true,
          openingHours: true,
          canDeliver: true,
        },
      },
      issuedBy: {
        select: { firstName: true, lastName: true },
      },
      organization: {
        select: { logoUrl: true, name: true },
      },
    },
  });

  if (!voucher) {
    return NextResponse.json({ message: "Voucher not found" }, { status: 404 });
  }

  if (!viewAll && viewOwn && user.agencyId !== voucher.agencyId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: voucher.id,
    code: voucher.code,
    clientId: voucher.clientId,
    agencyId: voucher.agencyId,
    referralDetailsId: voucher.referralDetailsId,
    foodBankCenterId: voucher.foodBankCenterId,
    issueDate: voucher.issueDate,
    expiryDate: voucher.expiryDate,
    status: voucher.status,
    collectionNotes: voucher.collectionNotes,
    client: voucher.client,
    agency: voucher.agency,
    referralDetails: voucher.referralDetails,
    foodBankCenter: voucher.foodBankCenter,
    issuedBy: voucher.issuedBy,
    organization: voucher.organization,
  });
}

/**
 * PATCH /api/vouchers/[id] — invalidate (set status to expired). Only for issued vouchers.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  const { id } = await params;
  const { voucher, error } = await checkVoucherAccess(id, tenant.organizationId, user.role, user.agencyId);
  if (error) return error;
  if (voucher.status !== "issued") {
    return NextResponse.json(
      { message: "Only issued vouchers can be invalidated" },
      { status: 400 }
    );
  }
  await db.voucher.update({
    where: { id },
    data: { status: "expired" },
  });
  await createAuditLog(db, {
    userId: user.id,
    organizationId: tenant.organizationId,
    action: AuditAction.UPDATE,
    entity: "Voucher",
    entityId: id,
    changes: { status: "expired" },
  });
  return NextResponse.json({ message: "Voucher invalidated" });
}

/**
 * DELETE /api/vouchers/[id] — only when voucher has no redemptions.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await getSessionUserAndTenant(request);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  const { id } = await params;
  const { voucher, error } = await checkVoucherAccess(id, tenant.organizationId, user.role, user.agencyId);
  if (error) return error;
  const redemptionCount = await db.redemption.count({ where: { voucherId: id } });
  if (redemptionCount > 0) {
    return NextResponse.json(
      { message: "Cannot delete a voucher that has been redeemed" },
      { status: 400 }
    );
  }
  await db.voucher.delete({ where: { id, organizationId: tenant.organizationId } });
  await createAuditLog(db, {
    userId: user.id,
    organizationId: tenant.organizationId,
    action: AuditAction.DELETE,
    entity: "Voucher",
    entityId: id,
    changes: { code: voucher.code },
  });
  return NextResponse.json({ message: "Voucher deleted" });
}
