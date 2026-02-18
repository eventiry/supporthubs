import { NextRequest, NextResponse } from "next/server";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { Permission } from "@/lib/rbac/permissions";
import { Prisma, AuditAction } from "@prisma/client";
import { db } from "@/lib/db";
import type { VoucherSummary } from "@/lib/types";
import { validatePostcode } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await getSessionUserAndTenant(request);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  if (!getPermissionsForRole(user.role).includes(Permission.CLIENT_READ)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const client = await db.client.findUnique({
    where: { id, organizationId: tenant.organizationId },
    include: {
      vouchers: {
        orderBy: { issueDate: "desc" },
        take: 20,
        include: {
          redemptions: { orderBy: { redeemedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ message: "Client not found" }, { status: 404 });
  }

  const vouchers: VoucherSummary[] = client.vouchers.map((v) => ({
    id: v.id,
    code: v.code,
    clientId: v.clientId,
    agencyId: v.agencyId,
    status: v.status,
    issueDate: v.issueDate,
    expiryDate: v.expiryDate,
    createdAt: v.createdAt,
    client: { firstName: client.firstName, surname: client.surname },
  }));

  return NextResponse.json({
    ...client,
    vouchers,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  if (!getPermissionsForRole(user.role).includes(Permission.CLIENT_UPDATE)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await db.client.findUnique({
    where: { id, organizationId: tenant.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ message: "Client not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const noFixedAddress = payload.noFixedAddress === true;
  const postcode =
    typeof payload.postcode === "string" ? payload.postcode.trim() : undefined;

  if (payload.postcode !== undefined && !noFixedAddress && postcode !== undefined) {
    if (!validatePostcode(postcode)) {
      return NextResponse.json(
        { message: "Invalid postcode format" },
        { status: 400 }
      );
    }
  }

  const data: Parameters<typeof db.client.update>[0]["data"] = {};

  if (payload.firstName !== undefined) data.firstName = String(payload.firstName).trim();
  if (payload.surname !== undefined) data.surname = String(payload.surname).trim();
  if (payload.noFixedAddress === true) {
    data.noFixedAddress = true;
    data.postcode = null;
  } else if (payload.postcode !== undefined) {
    data.noFixedAddress = false;
    data.postcode = postcode ?? null;
  }
  if (payload.address !== undefined) {
    data.address =
      typeof payload.address === "string" ? payload.address.trim() || null : null;
  }
  if (payload.yearOfBirth !== undefined) {
    const y =
      typeof payload.yearOfBirth === "number"
        ? payload.yearOfBirth
        : typeof payload.yearOfBirth === "string"
          ? parseInt(payload.yearOfBirth, 10)
          : null;
    data.yearOfBirth = y != null && !Number.isNaN(y) ? y : null;
  }
  if (payload.householdAdults !== undefined) {
    data.householdAdults =
      payload.householdAdults != null && typeof payload.householdAdults === "object"
        ? (payload.householdAdults as object)
        : Prisma.JsonNull;
  }
  if (payload.householdChild !== undefined) {
    data.householdChild =
      payload.householdChild != null && typeof payload.householdChild === "object"
        ? (payload.householdChild as object)
        : Prisma.JsonNull;
  }

  const client = await db.client.update({
    where: { id },
    data,
  });

  await createAuditLog(db, {
    userId: user.id,
    organizationId: tenant.organizationId,
    action: AuditAction.UPDATE,
    entity: "Client",
    entityId: id,
    changes: data as Record<string, unknown>,
  });

  return NextResponse.json(client);
}
