import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest, isPlatformDomain } from "@/lib/tenant";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";
import { db } from "@/lib/db";

export type TenantBrandingDisplay = "logo" | "name" | "both";

export interface TenantBrandingResponse {
  name: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  description: string | null;
  brandingDisplay: TenantBrandingDisplay;
}

/**
 * GET /api/tenant/branding — return current tenant branding from request host.
 * On platform domain (no subdomain or reserved), returns nulls so UI uses default Ordafy branding.
 */
export async function GET(req: NextRequest) {
  if (isPlatformDomain(req)) {
    return NextResponse.json<TenantBrandingResponse>({
      name: null,
      logoUrl: null,
      primaryColor: null,
      secondaryColor: null,
      description: null,
      brandingDisplay: "both",
    });
  }
  const tenant = await getTenantFromRequest(req);
  if (!tenant) {
    return NextResponse.json<TenantBrandingResponse>({
      name: null,
      logoUrl: null,
      primaryColor: null,
      secondaryColor: null,
      description: null,
      brandingDisplay: "both",
    });
  }
  return NextResponse.json<TenantBrandingResponse>({
    name: tenant.name,
    logoUrl: tenant.logoUrl,
    primaryColor: tenant.primaryColor,
    secondaryColor: tenant.secondaryColor,
    description: tenant.description ?? null,
    brandingDisplay: tenant.brandingDisplay ?? "both",
  });
}

/** Body for PATCH: optional name, logoUrl, primaryColor, secondaryColor, description, brandingDisplay (tenant admin only). */
export interface TenantBrandingUpdatePayload {
  name?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  description?: string | null;
  brandingDisplay?: TenantBrandingDisplay | null;
}

/**
 * PATCH /api/tenant/branding — update current organization branding (tenant admin only).
 * Scoped to the current tenant. Requires role admin.
 */
export async function PATCH(req: NextRequest) {
  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;
  const { user, tenant } = out;

  if (user.role !== "admin") {
    return NextResponse.json({ message: "Only tenant admins can update organization branding." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name.trim() : undefined;
  const logoUrl = payload.logoUrl === null || payload.logoUrl === "" ? null : typeof payload.logoUrl === "string" ? payload.logoUrl.trim() || null : undefined;
  const primaryColor = payload.primaryColor === null || payload.primaryColor === "" ? null : typeof payload.primaryColor === "string" ? payload.primaryColor.trim() || null : undefined;
  const secondaryColor = payload.secondaryColor === null || payload.secondaryColor === "" ? null : typeof payload.secondaryColor === "string" ? payload.secondaryColor.trim() || null : undefined;
  const description = payload.description === null || payload.description === "" ? null : typeof payload.description === "string" ? payload.description.trim() || null : undefined;
  const brandingDisplayRaw = payload.brandingDisplay;
  const brandingDisplay: TenantBrandingDisplay | undefined =
    brandingDisplayRaw === "logo" || brandingDisplayRaw === "name" || brandingDisplayRaw === "both" ? brandingDisplayRaw : undefined;

  const data: {
    name?: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    description?: string | null;
    brandingDisplay?: TenantBrandingDisplay;
  } = {};
  if (name !== undefined) data.name = name;
  if (logoUrl !== undefined) data.logoUrl = logoUrl;
  if (primaryColor !== undefined) data.primaryColor = primaryColor;
  if (secondaryColor !== undefined) data.secondaryColor = secondaryColor;
  if (description !== undefined) data.description = description;
  if (brandingDisplay !== undefined) data.brandingDisplay = brandingDisplay;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ message: "No fields to update" }, { status: 400 });
  }

  if (name !== undefined && !name) {
    return NextResponse.json({ message: "Organization name cannot be empty" }, { status: 400 });
  }

  const org = await db.organization.update({
    where: { id: tenant.organizationId },
    data,
    select: { name: true, logoUrl: true, primaryColor: true, secondaryColor: true, description: true, brandingDisplay: true },
  });

  const display = org.brandingDisplay === "logo" || org.brandingDisplay === "name" || org.brandingDisplay === "both" ? org.brandingDisplay : "both";

  return NextResponse.json<TenantBrandingResponse>({
    name: org.name,
    logoUrl: org.logoUrl ?? null,
    primaryColor: org.primaryColor ?? null,
    secondaryColor: org.secondaryColor ?? null,
    description: org.description ?? null,
    brandingDisplay: display,
  });
}
