import { NextRequest, NextResponse } from "next/server";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { Permission } from "@/lib/rbac/permissions";
import { db } from "@/lib/db";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";

/**
 * GET /api/agencies/[id] — get one agency (USER_MANAGE).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await getSessionUserAndTenant(request);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  if (!getPermissionsForRole(user.role).includes(Permission.USER_MANAGE)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const agency = await db.agency.findUnique({
    where: { id, organizationId: tenant.organizationId },
  });
  if (!agency) {
    return NextResponse.json({ message: "Agency not found" }, { status: 404 });
  }
  return NextResponse.json(agency);
}

/**
 * PATCH /api/agencies/[id] — update agency (USER_MANAGE).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await getSessionUserAndTenant(request);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  if (!getPermissionsForRole(user.role).includes(Permission.USER_MANAGE)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const agency = await db.agency.findUnique({
    where: { id, organizationId: tenant.organizationId },
  });
  if (!agency) {
    return NextResponse.json({ message: "Agency not found" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      contactPhone?: string | null;
      contactEmail?: string | null;
    };
    const data: { name?: string; contactPhone?: string | null; contactEmail?: string | null } = {};
    if (typeof body?.name === "string") data.name = body.name.trim();
    if (body?.contactPhone !== undefined) data.contactPhone = body.contactPhone ? String(body.contactPhone).trim() || null : null;
    if (body?.contactEmail !== undefined) data.contactEmail = body.contactEmail ? String(body.contactEmail).trim() || null : null;
    if (data.name === "") {
      return NextResponse.json({ message: "Name cannot be empty" }, { status: 400 });
    }

    const updated = await db.agency.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ message: "Failed to update agency" }, { status: 500 });
  }
}

/**
 * DELETE /api/agencies/[id] — delete agency (USER_MANAGE).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await getSessionUserAndTenant(request);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  if (!getPermissionsForRole(user.role).includes(Permission.USER_MANAGE)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const agency = await db.agency.findUnique({ where: { id, organizationId: tenant.organizationId } });
  if (!agency) {
    return NextResponse.json({ message: "Agency not found" }, { status: 404 });
  }

  try {
    await db.agency.delete({ where: { id } });
    return NextResponse.json({ message: "Agency deleted" });
  } catch {
    return NextResponse.json({ message: "Failed to delete agency" }, { status: 500 });
  }
}
