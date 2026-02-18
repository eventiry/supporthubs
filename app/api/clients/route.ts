import { NextRequest, NextResponse } from "next/server";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { Permission } from "@/lib/rbac/permissions";
import { db } from "@/lib/db";
import type { ClientSearchResult } from "@/lib/types";
import { validatePostcode, missingRequiredFields } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  const permissions = getPermissionsForRole(user.role);
  const canRead = permissions.includes(Permission.CLIENT_READ);
  const canCreate = permissions.includes(Permission.CLIENT_CREATE);
  if (!canRead && !canCreate) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const firstName = searchParams.get("firstName")?.trim() ?? undefined;
  const surname = searchParams.get("surname")?.trim() ?? undefined;
  const postcode = searchParams.get("postcode")?.trim() ?? undefined;
  const noFixedAddressParam = searchParams.get("noFixedAddress");
  const noFixedAddress =
    noFixedAddressParam === "true"
      ? true
      : noFixedAddressParam === "false"
        ? false
        : undefined;

  if (!surname) {
    return NextResponse.json(
      { message: "Surname is required for search" },
      { status: 400 }
    );
  }
  if (noFixedAddress !== true && !postcode) {
    return NextResponse.json(
      { message: "Either postcode or no fixed address is required" },
      { status: 400 }
    );
  }

  const clients = await db.client.findMany({
    where: {
      organizationId: tenant.organizationId,
      surname: { contains: surname, mode: "insensitive" },
      ...(firstName && {
        firstName: { contains: firstName, mode: "insensitive" },
      }),
      ...(noFixedAddress === true
        ? { noFixedAddress: true }
        : postcode
          ? { postcode: { contains: postcode, mode: "insensitive" } }
          : {}),
    },
    orderBy: [{ surname: "asc" }, { firstName: "asc" }],
  });

  if (clients.length === 0) {
    return NextResponse.json([]);
  }

  const clientIds = clients.map((c) => c.id);
  const sixMonthsAgo = new Date(Date.now() - SIX_MONTHS_MS);

  const vouchers = await db.voucher.findMany({
    where: {
      clientId: { in: clientIds },
      issueDate: { gte: sixMonthsAgo },
    },
    include: {
      redemptions: { orderBy: { redeemedAt: "desc" }, take: 1 },
    },
  });

  const allVouchersByClient = await db.voucher.findMany({
    where: { organizationId: tenant.organizationId, clientId: { in: clientIds } },
    select: {
      id: true,
      clientId: true,
      issueDate: true,
      status: true,
      redemptions: { select: { redeemedAt: true }, orderBy: { redeemedAt: "desc" }, take: 1 },
    },
  });

  const lastIssuedByClient = new Map<string, Date>();
  const lastFulfilledByClient = new Map<string, Date>();
  const count6MonthsByClient = new Map<string, number>();
  for (const id of clientIds) {
    count6MonthsByClient.set(id, 0);
  }

  for (const v of allVouchersByClient) {
    if (!lastIssuedByClient.has(v.clientId) || (lastIssuedByClient.get(v.clientId)! < v.issueDate)) {
      lastIssuedByClient.set(v.clientId, v.issueDate);
    }
    const redeemedAt = v.redemptions[0]?.redeemedAt;
    if (redeemedAt) {
      const current = lastFulfilledByClient.get(v.clientId);
      if (!current || current < redeemedAt) lastFulfilledByClient.set(v.clientId, redeemedAt);
    }
  }

  for (const v of vouchers) {
    count6MonthsByClient.set(v.clientId, (count6MonthsByClient.get(v.clientId) ?? 0) + 1);
  }

  const results: ClientSearchResult[] = clients.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    surname: c.surname,
    postcode: c.postcode,
    noFixedAddress: c.noFixedAddress,
    address: c.address,
    yearOfBirth: c.yearOfBirth,
    lastVoucherIssued: lastIssuedByClient.get(c.id) ?? null,
    lastVoucherFulfilled: lastFulfilledByClient.get(c.id) ?? null,
    vouchersInLast6Months: count6MonthsByClient.get(c.id) ?? 0,
  }));

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  if (!getPermissionsForRole(user.role).includes(Permission.CLIENT_CREATE)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const missing = missingRequiredFields(payload, ["firstName", "surname"]);
  if (missing) {
    return NextResponse.json(
      { message: `Missing required field: ${missing}` },
      { status: 400 }
    );
  }

  const noFixedAddress = payload.noFixedAddress === true;
  const postcode =
    typeof payload.postcode === "string" ? payload.postcode.trim() : undefined;

  if (!noFixedAddress) {
    if (!postcode) {
      return NextResponse.json(
        { message: "Postcode is required when no fixed address is not selected" },
        { status: 400 }
      );
    }
    if (!validatePostcode(postcode)) {
      return NextResponse.json(
        { message: "Invalid postcode format" },
        { status: 400 }
      );
    }
  }

  const firstName = String(payload.firstName).trim();
  const surname = String(payload.surname).trim();
  const address =
    typeof payload.address === "string" ? payload.address.trim() || null : null;
  const yearOfBirth =
    typeof payload.yearOfBirth === "number"
      ? payload.yearOfBirth
      : typeof payload.yearOfBirth === "string"
        ? parseInt(payload.yearOfBirth, 10)
        : null;
  const householdAdults =
    payload.householdAdults != null && typeof payload.householdAdults === "object"
      ? (payload.householdAdults as Record<string, number>)
      : null;
  const householdChild =
    payload.householdChild != null && typeof payload.householdChild === "object"
      ? (payload.householdChild as Record<string, number>)
      : null;

  const client = await db.client.create({
    data: {
      firstName,
      surname,
      organizationId: tenant.organizationId,
      postcode: noFixedAddress ? null : (postcode ?? null),
      noFixedAddress,
      address,
      yearOfBirth: yearOfBirth != null && !Number.isNaN(yearOfBirth) ? yearOfBirth : null,
      householdAdults: householdAdults ?? undefined,
      householdChild: householdChild ?? undefined,
    },
  });

  await createAuditLog(db, {
    userId: user.id,
    organizationId: tenant.organizationId,
    action: AuditAction.CREATE,
    entity: "Client",
    entityId: client.id,
    changes: { firstName, surname, postcode: noFixedAddress ? null : postcode ?? null },
  });

  return NextResponse.json(client, { status: 201 });
}
