import { NextRequest, NextResponse } from "next/server";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { Permission } from "@/lib/rbac/permissions";
import { db } from "@/lib/db";
import * as bcrypt from "bcryptjs";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";
import { canCreateUser } from "@/lib/subscription";

/**
 * GET /api/users — list users (admin only). Optional filter by role, agencyId. Scoped to current tenant org.
 */
export async function GET(req: NextRequest) {
  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  if (!getPermissionsForRole(user.role).includes(Permission.USER_MANAGE)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") as "admin" | "third_party" | "back_office" | null;
  const agencyId = searchParams.get("agencyId")?.trim() ?? undefined;

  const where: { organizationId: string; role?: "admin" | "third_party" | "back_office"; agencyId?: string } = {
    organizationId: tenant.organizationId,
  };
  if (role) where.role = role;
  if (agencyId) where.agencyId = agencyId;

  const users = await db.user.findMany({
    where,
    orderBy: { email: "asc" },
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

  return NextResponse.json(users);
}

/**
 * POST /api/users — create user (admin only). Body: email, password, role, agencyId?, firstName, lastName. User is created in current tenant org.
 */
export async function POST(req: NextRequest) {
  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  if (!getPermissionsForRole(user.role).includes(Permission.USER_MANAGE)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const role = payload.role as "admin" | "third_party" | "back_office" | undefined;
  const agencyId =
    typeof payload.agencyId === "string" ? payload.agencyId.trim() || null : null;
  const firstName = typeof payload.firstName === "string" ? payload.firstName.trim() : "";
  const lastName = typeof payload.lastName === "string" ? payload.lastName.trim() : "";

  if (!email) {
    return NextResponse.json({ message: "Email is required" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json(
      { message: "Password is required and must be at least 6 characters" },
      { status: 400 }
    );
  }
  if (!role || !["admin", "third_party", "back_office"].includes(role)) {
    return NextResponse.json(
      { message: "Valid role is required (admin, third_party, back_office)" },
      { status: 400 }
    );
  }
  if (!firstName || !lastName) {
    return NextResponse.json(
      { message: "First name and last name are required" },
      { status: 400 }
    );
  }
  if (role === "third_party" && !agencyId) {
    return NextResponse.json(
      { message: "Agency is required for third_party users" },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({
    where: { email },
  });
  if (existing) {
    return NextResponse.json(
      { message: "A user with this email already exists" },
      { status: 400 }
    );
  }

  if (agencyId) {
    const agency = await db.agency.findUnique({
      where: { id: agencyId, organizationId: tenant.organizationId },
    });
    if (!agency) {
      return NextResponse.json({ message: "Agency not found" }, { status: 400 });
    }
  }

  const isPlatformAdmin = user.organizationId === null;
  const subscriptionCheck = await canCreateUser(tenant.organizationId, isPlatformAdmin);
  if (!subscriptionCheck.allowed) {
    return NextResponse.json(
      { message: subscriptionCheck.message ?? "Cannot create user: plan limit reached." },
      { status: 402 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await db.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      agencyId,
      organizationId: tenant.organizationId,
    },
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
    action: AuditAction.CREATE,
    entity: "User",
    entityId: created.id,
    changes: { email: created.email, role: created.role, agencyId: created.agencyId },
  });

  return NextResponse.json(created, { status: 201 });
}
