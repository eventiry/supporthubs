import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPlatformAdminSession } from "@/lib/api/get-platform-admin-session";

/**
 * GET /api/platform/organizations/[id] — get one organization (platform admin only).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await getPlatformAdminSession(_req);
  if (out instanceof NextResponse) return out;

  const { id } = await params;
  const org = await db.organization.findUnique({
    where: { id },
    include: { subscriptionPlan: true },
  });
  if (!org) {
    return NextResponse.json({ message: "Organization not found" }, { status: 404 });
  }
  return NextResponse.json(org);
}

/**
 * PATCH /api/platform/organizations/[id] — update organization (platform admin only).
 * Body: { name?, slug?, status?, logoUrl?, primaryColor?, secondaryColor? }
 * Use status: "ACTIVE" | "SUSPENDED" to activate or suspend.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await getPlatformAdminSession(req);
  if (out instanceof NextResponse) return out;

  const { id } = await params;
  const existing = await db.organization.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "Organization not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const data: {
    name?: string;
    slug?: string;
    status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    subscriptionPlanId?: string | null;
    subscriptionStatus?: "none" | "trialing" | "active" | "past_due" | "cancelled";
    billingEmail?: string | null;
    subscriptionStartedAt?: Date | null;
    subscriptionEndsAt?: Date | null;
  } = {};

  if (typeof payload.name === "string") data.name = payload.name.trim();
  if (typeof payload.slug === "string") {
    const slug = payload.slug.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug)) {
      return NextResponse.json(
        { message: "Slug must be lowercase letters, numbers, and hyphens only" },
        { status: 400 }
      );
    }
    data.slug = slug;
  }
  if (payload.status !== undefined) {
    const valid = ["PENDING", "ACTIVE", "SUSPENDED", "CANCELLED"];
    if (!valid.includes(payload.status as string)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }
    data.status = payload.status as "PENDING" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
  }
  if (payload.logoUrl !== undefined) {
    data.logoUrl = typeof payload.logoUrl === "string" ? payload.logoUrl.trim() || null : null;
  }
  if (payload.primaryColor !== undefined) {
    data.primaryColor =
      typeof payload.primaryColor === "string" ? payload.primaryColor.trim() || null : null;
  }
  if (payload.secondaryColor !== undefined) {
    data.secondaryColor =
      typeof payload.secondaryColor === "string" ? payload.secondaryColor.trim() || null : null;
  }

  if (data.slug != null && data.slug !== existing.slug) {
    const conflict = await db.organization.findUnique({ where: { slug: data.slug } });
    if (conflict) {
      return NextResponse.json(
        { message: "An organization with this slug already exists" },
        { status: 400 }
      );
    }
  }

  const updated = await db.organization.update({
    where: { id },
    data,
  });
  return NextResponse.json(updated);
}
