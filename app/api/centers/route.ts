import { NextResponse } from "next/server";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { Permission } from "@/lib/rbac/permissions";
import { db } from "@/lib/db";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";

/**
 * GET /api/centers — list food bank centers for current tenant.
 */
export async function GET(request: Request) {
  const out = await getSessionUserAndTenant(request);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  const permissions = getPermissionsForRole(user.role);
  const canIssue = permissions.includes(Permission.VOUCHER_ISSUE);
  const canRedeem = permissions.includes(Permission.VOUCHER_REDEEM);
  const canView = permissions.includes(Permission.VOUCHER_VIEW_OWN) || permissions.includes(Permission.VOUCHER_VIEW_ALL);
  const canManage = permissions.includes(Permission.USER_MANAGE);
  if (!canIssue && !canRedeem && !canView && !canManage) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const centers = await db.foodBankCenter.findMany({
    where: { organizationId: tenant.organizationId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(centers);
}

/**
 * POST /api/centers — create food bank center (USER_MANAGE).
 */
export async function POST(request: Request) {
  const out = await getSessionUserAndTenant(request);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  if (!getPermissionsForRole(user.role).includes(Permission.USER_MANAGE)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      address?: string;
      postcode?: string;
      phone?: string;
      email?: string;
      openingHours?: Record<string, string> | null;
      canDeliver?: boolean;
    };
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 });
    }
    const openingHours =
      body?.openingHours != null && typeof body.openingHours === "object" && !Array.isArray(body.openingHours)
        ? body.openingHours
        : undefined;

    const center = await db.foodBankCenter.create({
      data: {
        name,
        organizationId: tenant.organizationId,
        address: typeof body?.address === "string" ? body.address.trim() || null : null,
        postcode: typeof body?.postcode === "string" ? body.postcode.trim() || null : null,
        phone: typeof body?.phone === "string" ? body.phone.trim() || null : null,
        email: typeof body?.email === "string" ? body.email.trim() || null : null,
        openingHours: openingHours ?? undefined,
        canDeliver: typeof body?.canDeliver === "boolean" ? body.canDeliver : false,
      },
    });
    return NextResponse.json(center);
  } catch {
    return NextResponse.json(
      { message: "Failed to create center" },
      { status: 500 }
    );
  }
}
