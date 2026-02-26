import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { Permission } from "@/lib/rbac/permissions";
import { db } from "@/lib/db";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";

/**
 * GET /api/centers/[id] — get one centre (USER_MANAGE).
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
  const center = await db.foodBankCenter.findUnique({
    where: { id, organizationId: tenant.organizationId },
  });
  if (!center) {
    return NextResponse.json({ message: "Centre not found" }, { status: 404 });
  }
  return NextResponse.json(center);
}

/**
 * PATCH /api/centers/[id] — update centre (USER_MANAGE).
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
  const center = await db.foodBankCenter.findUnique({
    where: { id, organizationId: tenant.organizationId },
  });
  if (!center) {
    return NextResponse.json({ message: "Centre not found" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      address?: string | null;
      postcode?: string | null;
      phone?: string | null;
      email?: string | null;
      openingHours?: Record<string, string> | null;
      canDeliver?: boolean;
    };
    const data: Prisma.FoodBankCenterUpdateInput = {};
    if (typeof body?.name === "string") data.name = body.name.trim();
    if (body?.address !== undefined) data.address = body.address ? String(body.address).trim() || null : null;
    if (body?.postcode !== undefined) data.postcode = body.postcode ? String(body.postcode).trim() || null : null;
    if (body?.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() || null : null;
    if (body?.email !== undefined) data.email = body.email ? String(body.email).trim() || null : null;
    if (body?.openingHours !== undefined) {
      data.openingHours =
        body.openingHours != null && typeof body.openingHours === "object" && !Array.isArray(body.openingHours)
          ? (body.openingHours as Prisma.InputJsonValue)
          : Prisma.JsonNull;
    }
    if (typeof body?.canDeliver === "boolean") data.canDeliver = body.canDeliver;
    if (data.name === "") {
      return NextResponse.json({ message: "Name cannot be empty" }, { status: 400 });
    }

    const updated = await db.foodBankCenter.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ message: "Failed to update centre" }, { status: 500 });
  }
}

/**
 * DELETE /api/centers/[id] — delete centre (USER_MANAGE).
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
  const center = await db.foodBankCenter.findUnique({ where: { id, organizationId: tenant.organizationId } });
  if (!center) {
    return NextResponse.json({ message: "Centre not found" }, { status: 404 });
  }

  try {
    await db.foodBankCenter.delete({ where: { id } });
    return NextResponse.json({ message: "Centre deleted" });
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2003"
      ? "Cannot delete this centre because it has redemptions linked to it."
      : "Failed to delete centre";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
