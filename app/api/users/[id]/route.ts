import { NextRequest, NextResponse } from "next/server";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { Permission } from "@/lib/rbac/permissions";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";

/**
 * GET /api/users/[id] — get user (admin only). Scoped to current tenant org.
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
  const found = await db.user.findFirst({
    where: { id, organizationId: tenant.organizationId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      agencyId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!found) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json(found);
}

/**
 * PATCH /api/users/[id] — update user (admin only). Body: role?, status?, agencyId?, firstName?, lastName?.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  if (!getPermissionsForRole(user.role).includes(Permission.USER_MANAGE)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await db.user.findFirst({
    where: { id, organizationId: tenant.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const data: {
    role?: "admin" | "third_party" | "back_office";
    status?: "ACTIVE" | "SUSPENDED";
    agencyId?: string | null;
    firstName?: string;
    lastName?: string;
  } = {};

  if (payload.role !== undefined) {
    if (!["admin", "third_party", "back_office"].includes(payload.role as string)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }
    data.role = payload.role as "admin" | "third_party" | "back_office";
  }
  if (payload.status !== undefined) {
    if (!["ACTIVE", "SUSPENDED"].includes(payload.status as string)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }
    data.status = payload.status as "ACTIVE" | "SUSPENDED";
  }
  if (payload.agencyId !== undefined) {
    data.agencyId = payload.agencyId === null || payload.agencyId === "" ? null : (payload.agencyId as string);
  }
  if (payload.firstName !== undefined) {
    data.firstName = String(payload.firstName).trim();
  }
  if (payload.lastName !== undefined) {
    data.lastName = String(payload.lastName).trim();
  }

  if (data.role === "third_party" && (data.agencyId === undefined ? existing.agencyId : data.agencyId) === null) {
    return NextResponse.json(
      { message: "Agency is required for third_party users" },
      { status: 400 }
    );
  }

  const updated = await db.user.update({
    where: { id, organizationId: tenant.organizationId },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      agencyId: true,
      status: true,
      createdAt: true,
    },
  });

  await createAuditLog(db, {
    userId: user.id,
    organizationId: tenant.organizationId,
    action: AuditAction.UPDATE,
    entity: "User",
    entityId: id,
    changes: data as Record<string, unknown>,
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/users/[id] — disable user (set status to SUSPENDED). Admin only. Scoped to current tenant org.
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
  if (id === user.id) {
    return NextResponse.json(
      { message: "You cannot disable your own account" },
      { status: 400 }
    );
  }

  const existing = await db.user.findFirst({
    where: { id, organizationId: tenant.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  await db.user.delete({
    where: { id, organizationId: tenant.organizationId }
  });

  await createAuditLog(db, {
    userId: user.id,
    organizationId: tenant.organizationId,
    action: AuditAction.DELETE,
    entity: "User",
    entityId: id,
    changes: { status: "DELETED", email: existing.email, firstName: existing.firstName, lastName: existing.lastName, role: existing.role, agencyId: existing.agencyId ?? null },
  });

  return new NextResponse(null, { status: 204 });
}
