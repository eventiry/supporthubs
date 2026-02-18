import { NextResponse } from "next/server";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { Permission } from "@/lib/rbac/permissions";
import { db } from "@/lib/db";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";
import { canCreateAgency } from "@/lib/subscription";

/**
 * GET /api/agencies
 * - third_party: returns current user's agency only (single object in array)
 * - admin: returns all agencies in current tenant
 */
export async function GET(request: Request) {
  const out = await getSessionUserAndTenant(request);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;

  const permissions = getPermissionsForRole(user.role);
  if (!permissions.includes(Permission.VOUCHER_ISSUE) && !permissions.includes(Permission.USER_MANAGE)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (user.role === "admin") {
    const agencies = await db.agency.findMany({
      where: { organizationId: tenant.organizationId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(agencies);
  }

  if (user.agencyId) {
    const agency = await db.agency.findUnique({
      where: { id: user.agencyId, organizationId: tenant.organizationId },
    });
    return NextResponse.json(agency ? [agency] : []);
  }

  return NextResponse.json([]);
}

/**
 * POST /api/agencies — create agency (admin only).
 */
export async function POST(request: Request) {
  const out = await getSessionUserAndTenant(request);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;

  if (!getPermissionsForRole(user.role).includes(Permission.USER_MANAGE)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { name?: string; contactPhone?: string; contactEmail?: string };
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 });
    }

    const isPlatformAdmin = user.organizationId === null;
    const subscriptionCheck = await canCreateAgency(tenant.organizationId, isPlatformAdmin);
    if (!subscriptionCheck.allowed) {
      return NextResponse.json(
        { message: subscriptionCheck.message ?? "Cannot create agency: plan limit reached." },
        { status: 402 }
      );
    }

    const agency = await db.agency.create({
      data: {
        name,
        organizationId: tenant.organizationId,
        contactPhone: typeof body?.contactPhone === "string" ? body.contactPhone.trim() || null : null,
        contactEmail: typeof body?.contactEmail === "string" ? body.contactEmail.trim() || null : null,
      },
    });
    return NextResponse.json(agency);
  } catch {
    return NextResponse.json(
      { message: "Failed to create agency" },
      { status: 500 }
    );
  }
}
