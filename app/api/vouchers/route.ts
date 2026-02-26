import { NextRequest, NextResponse } from "next/server";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { Permission } from "@/lib/rbac/permissions";
import { db } from "@/lib/db";
import type { VoucherStatus } from "@/lib/types";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";
import { canCreateVoucher } from "@/lib/subscription";
import { isOrgInSelectedOrgs, SELECTED_ORGS } from "@/lib/config";

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
const NOTES_MAX_LENGTH = 400;
const PARCEL_NOTES_MAX_LENGTH = 400;
const SELECTED_ORGS_EXPIRY_DAYS = 7;

function randomAlphanumeric(length: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i]! % chars.length];
  }
  return result;
}

async function generateUniqueVoucherCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = `E-${randomAlphanumeric(5)}-${randomAlphanumeric(6)}`;
    const existing = await db.voucher.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate unique voucher code");
}

/** For selected-orgs: E-001-0001, E-001-0002, ... (org index 001, 4-digit sequence per org). */
async function generateIncrementalVoucherCode(organizationId: string): Promise<string> {
  const idx = SELECTED_ORGS.indexOf(organizationId);
  const prefix = `E-${String(idx >= 0 ? idx + 1 : 1).padStart(3, "0")}`;
  const count = await db.voucher.count({
    where: {
      organizationId,
      code: { startsWith: prefix + "-" },
    },
  });
  const seq = count + 1;
  const code = `${prefix}-${String(seq).padStart(4, "0")}`;
  const existing = await db.voucher.findUnique({ where: { code } });
  if (existing) throw new Error("Voucher code collision");
  return code;
}

export async function GET(req: NextRequest) {
  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  const permissions = getPermissionsForRole(user.role);
  const viewOwn = permissions.includes(Permission.VOUCHER_VIEW_OWN);
  const viewAll = permissions.includes(Permission.VOUCHER_VIEW_ALL);
  if (!viewOwn && !viewAll) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as VoucherStatus | null;
  const validity = searchParams.get("validity") as "valid" | "expired" | null;
  const clientId = searchParams.get("clientId")?.trim() ?? undefined;
  const code = searchParams.get("code")?.trim() ?? undefined;
  const fromDate = searchParams.get("fromDate")?.trim() ?? undefined;
  const toDate = searchParams.get("toDate")?.trim() ?? undefined;

  const where: {
    organizationId: string;
    agencyId?: string;
    status?: VoucherStatus;
    clientId?: string;
    code?: string;
    issueDate?: { gte?: Date; lte?: Date };
    expiryDate?: { gte?: Date; lt?: Date };
    OR?: Array<{ status: VoucherStatus } | { status: VoucherStatus; expiryDate: { lt: Date } }>;
  } = { organizationId: tenant.organizationId };

  if (user.role === "third_party" && user.agencyId) {
    where.agencyId = user.agencyId;
  }
  if (validity === "valid") {
    where.status = "issued";
    where.expiryDate = { gte: new Date() };
  } else if (validity === "expired") {
    where.OR = [
      { status: "expired" },
      { status: "issued", expiryDate: { lt: new Date() } },
    ];
  } else if (status) {
    where.status = status;
  }
  if (clientId) where.clientId = clientId;
  if (code) where.code = code;
  if (fromDate || toDate) {
    where.issueDate = where.issueDate ?? {};
    if (fromDate) (where.issueDate as { gte?: Date; lte?: Date }).gte = new Date(fromDate);
    if (toDate) (where.issueDate as { gte?: Date; lte?: Date }).lte = new Date(toDate);
  }

  const vouchers = await db.voucher.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, firstName: true, surname: true } },
    },
  });

  const list = vouchers.map((v) => ({
    id: v.id,
    code: v.code,
    clientId: v.clientId,
    agencyId: v.agencyId,
    status: v.status,
    issueDate: v.issueDate,
    expiryDate: v.expiryDate,
    createdAt: v.createdAt,
    client: v.client,
  }));

  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;
  if (!getPermissionsForRole(user.role).includes(Permission.VOUCHER_ISSUE)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const clientId = typeof payload.clientId === "string" ? payload.clientId.trim() : "";
  const agencyId = typeof payload.agencyId === "string" ? payload.agencyId.trim() : "";
  const referralDetails = payload.referralDetails as Record<string, unknown> | undefined;
  const issueDateStr = typeof payload.issueDate === "string" ? payload.issueDate : "";
  const expiryDateStr = typeof payload.expiryDate === "string" ? payload.expiryDate : "";
  const foodBankCenterId =
    typeof payload.foodBankCenterId === "string" ? payload.foodBankCenterId.trim() || undefined : undefined;
  const collectionNotes =
    typeof payload.collectionNotes === "string" ? payload.collectionNotes.trim() || undefined : undefined;

  const selectedOrgsRules = isOrgInSelectedOrgs(tenant.organizationId);
  const requireExpiry = !selectedOrgsRules;
  if (!clientId || !agencyId || !referralDetails || !issueDateStr || (requireExpiry && !expiryDateStr)) {
    return NextResponse.json(
      {
        message: requireExpiry
          ? "Missing required fields: clientId, agencyId, referralDetails, issueDate, expiryDate"
          : "Missing required fields: clientId, agencyId, referralDetails, issueDate",
      },
      { status: 400 }
    );
  }

  const notes = typeof referralDetails.notes === "string" ? referralDetails.notes.trim() : "";
  if (notes.length > NOTES_MAX_LENGTH) {
    return NextResponse.json(
      { message: `Notes must be at most ${NOTES_MAX_LENGTH} characters` },
      { status: 400 }
    );
  }
  const parcelNotes =
    typeof referralDetails.parcelNotes === "string" ? referralDetails.parcelNotes.trim() : "";
  if (parcelNotes.length > PARCEL_NOTES_MAX_LENGTH) {
    return NextResponse.json(
      { message: `Parcel notes must be at most ${PARCEL_NOTES_MAX_LENGTH} characters` },
      { status: 400 }
    );
  }

  const contactConsent = referralDetails.contactConsent === true;
  const dietaryConsent = referralDetails.dietaryConsent === true;
  if (!selectedOrgsRules && (!contactConsent || !dietaryConsent)) {
    return NextResponse.json(
      { message: "Contact consent and dietary consent are required" },
      { status: 400 }
    );
  }

  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return NextResponse.json({ message: "Client not found" }, { status: 400 });
  }

  const sixMonthsAgo = new Date(Date.now() - SIX_MONTHS_MS);
  const countRecent = await db.voucher.count({
    where: {
      clientId,
      issueDate: { gte: sixMonthsAgo },
    },
  });

  const moreThan3Reason =
    typeof referralDetails.moreThan3VouchersReason === "string"
      ? referralDetails.moreThan3VouchersReason.trim()
      : "";
  if (countRecent >= 3 && !moreThan3Reason) {
    return NextResponse.json(
      {
        message:
          "This client has received 3 or more vouchers in the last 6 months. Please provide a reason for issuing another voucher.",
      },
      { status: 400 }
    );
  }

  const agency = await db.agency.findUnique({
    where: { id: agencyId, organizationId: tenant.organizationId },
  });
  if (!agency) {
    return NextResponse.json({ message: "Agency not found" }, { status: 400 });
  }
  if (user.role === "third_party" && user.agencyId !== agencyId) {
    return NextResponse.json({ message: "You can only issue vouchers for your own agency" }, { status: 403 });
  }

  const issueDate = new Date(issueDateStr);
  if (Number.isNaN(issueDate.getTime())) {
    return NextResponse.json({ message: "Invalid issue date" }, { status: 400 });
  }
  let expiryDate: Date;
  if (selectedOrgsRules) {
    expiryDate = new Date(issueDate);
    expiryDate.setDate(expiryDate.getDate() + SELECTED_ORGS_EXPIRY_DAYS);
  } else {
    expiryDate = new Date(expiryDateStr);
    if (Number.isNaN(expiryDate.getTime())) {
      return NextResponse.json({ message: "Invalid expiry date" }, { status: 400 });
    }
  }

  const isPlatformAdmin = user.organizationId === null;
  const subscriptionCheck = await canCreateVoucher(tenant.organizationId, isPlatformAdmin);
  if (!subscriptionCheck.allowed) {
    return NextResponse.json(
      { message: subscriptionCheck.message ?? "Cannot issue voucher: plan limit reached." },
      { status: 402 }
    );
  }

  const referralRecord = await db.referralDetails.create({
    data: {
      organization: { connect: { id: tenant.organizationId } },
      notes: notes.slice(0, NOTES_MAX_LENGTH),
      incomeSource: typeof referralDetails.incomeSource === "string" ? referralDetails.incomeSource : undefined,
      referralReasons:
        referralDetails.referralReasons != null && typeof referralDetails.referralReasons === "object"
          ? referralDetails.referralReasons
          : undefined,
      ethnicGroup: typeof referralDetails.ethnicGroup === "string" ? referralDetails.ethnicGroup : undefined,
      householdByAge:
        referralDetails.householdByAge != null && typeof referralDetails.householdByAge === "object"
          ? referralDetails.householdByAge
          : undefined,
      contactConsent: selectedOrgsRules ? contactConsent : true,
      dietaryConsent: selectedOrgsRules ? dietaryConsent : true,
      dietaryRequirements:
        typeof referralDetails.dietaryRequirements === "string"
          ? referralDetails.dietaryRequirements
          : undefined,
      moreThan3VouchersReason: moreThan3Reason || undefined,
      parcelNotes: parcelNotes.slice(0, PARCEL_NOTES_MAX_LENGTH) || undefined,
    },
  });

  const code = selectedOrgsRules
    ? await generateIncrementalVoucherCode(tenant.organizationId)
    : await generateUniqueVoucherCode();

  const voucher = await db.voucher.create({
    data: {
      code,
      organizationId: tenant.organizationId,
      clientId,
      agencyId,
      referralDetailsId: referralRecord.id,
      foodBankCenterId: foodBankCenterId ?? undefined,
      issueDate,
      expiryDate,
      issuedById: user.id,
      collectionNotes: selectedOrgsRules ? undefined : collectionNotes,
    },
    include: {
      client: { select: { firstName: true, surname: true } },
    },
  });

  await createAuditLog(db, {
    userId: user.id,
    organizationId: tenant.organizationId,
    action: AuditAction.ISSUE_VOUCHER,
    entity: "Voucher",
    entityId: voucher.id,
    changes: { code: voucher.code, clientId, agencyId },
  });

  return NextResponse.json(voucher, { status: 201 });
}
