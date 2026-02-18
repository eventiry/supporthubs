import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPlatformAdminSession } from "@/lib/api/get-platform-admin-session";
import { assignDefaultFreePlanToOrganization } from "@/lib/subscription-defaults";

/**
 * GET /api/platform/organizations — list all organizations (platform admin only).
 */
export async function GET(_req: NextRequest) {
  const out = await getPlatformAdminSession(_req);
  if (out instanceof NextResponse) return out;

  const orgs = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json(orgs);
}

/**
 * POST /api/platform/organizations — create organization (platform admin only).
 * Body: { name: string, slug: string, status?: OrganizationStatus }
 */
export async function POST(req: NextRequest) {
  const out = await getPlatformAdminSession(req);
  if (out instanceof NextResponse) return out;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const slug = typeof payload.slug === "string" ? payload.slug.trim().toLowerCase() : "";
  const status = payload.status as "PENDING" | "ACTIVE" | "SUSPENDED" | "CANCELLED" | undefined;

  if (!name) {
    return NextResponse.json({ message: "Name is required" }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ message: "Slug is required" }, { status: 400 });
  }
  const validSlug = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug);
  if (!validSlug) {
    return NextResponse.json(
      { message: "Slug must be lowercase letters, numbers, and hyphens only" },
      { status: 400 }
    );
  }
  const validStatuses = ["PENDING", "ACTIVE", "SUSPENDED", "CANCELLED"];
  if (status != null && !validStatuses.includes(status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

  const existing = await db.organization.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { message: "An organization with this slug already exists" },
      { status: 400 }
    );
  }

  const organization = await db.organization.create({
    data: {
      name,
      slug,
      status: status ?? "PENDING",
    },
  });

  await assignDefaultFreePlanToOrganization(organization.id);

  return NextResponse.json(organization, { status: 201 });
}
