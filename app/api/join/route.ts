import { NextRequest, NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { db, setPlatformRlsContext } from "@/lib/db";
import { getTenantLoginUrl } from "@/lib/tenant";
import { assignDefaultFreePlanToOrganization } from "@/lib/subscription-defaults";

/**
 * POST /api/join — complete onboarding (public).
 * Body: { token, organizationName, subdomainSlug, adminEmail, password, firstName, lastName, logoUrl?, primaryColor?, secondaryColor?, createAsActive? }
 * Creates Organization, first User (admin), marks invitation USED. Returns { redirectUrl }.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  const organizationName = typeof payload.organizationName === "string" ? payload.organizationName.trim() : "";
  const subdomainSlug = typeof payload.subdomainSlug === "string" ? payload.subdomainSlug.trim().toLowerCase() : "";
  const adminEmail = typeof payload.adminEmail === "string" ? payload.adminEmail.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const firstName = typeof payload.firstName === "string" ? payload.firstName.trim() : "";
  const lastName = typeof payload.lastName === "string" ? payload.lastName.trim() : "";
  const logoUrl = typeof payload.logoUrl === "string" ? payload.logoUrl.trim() || null : null;
  const primaryColor = typeof payload.primaryColor === "string" ? payload.primaryColor.trim() || null : null;
  const secondaryColor = typeof payload.secondaryColor === "string" ? payload.secondaryColor.trim() || null : null;
  const createAsActive = payload.createAsActive === true;

  await setPlatformRlsContext();

  if (!token) return NextResponse.json({ message: "Token is required" }, { status: 400 });
  if (!organizationName) return NextResponse.json({ message: "Organization name is required" }, { status: 400 });
  if (!subdomainSlug) return NextResponse.json({ message: "Subdomain slug is required" }, { status: 400 });
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(subdomainSlug)) {
    return NextResponse.json(
      { message: "Subdomain slug must be lowercase letters, numbers, and hyphens only" },
      { status: 400 }
    );
  }
  if (!adminEmail) return NextResponse.json({ message: "Admin email is required" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    return NextResponse.json({ message: "Invalid admin email" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
  }
  if (!firstName) return NextResponse.json({ message: "First name is required" }, { status: 400 });
  if (!lastName) return NextResponse.json({ message: "Last name is required" }, { status: 400 });

  const invitation = await db.invitation.findUnique({ where: { token } });
  if (!invitation) {
    return NextResponse.json({ message: "Invalid or expired invitation" }, { status: 404 });
  }
  if (invitation.status !== "PENDING") {
    return NextResponse.json({ message: "This invitation has already been used" }, { status: 400 });
  }
  if (invitation.expiresAt < new Date()) {
    await db.invitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ message: "This invitation has expired" }, { status: 400 });
  }
  if (adminEmail !== invitation.email.toLowerCase()) {
    return NextResponse.json({ message: "Admin email must match the invitation" }, { status: 400 });
  }

  const existingOrg = await db.organization.findUnique({ where: { slug: subdomainSlug } });
  if (existingOrg) {
    return NextResponse.json(
      { message: "An organization with this subdomain already exists" },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const organization = await db.organization.create({
    data: {
      name: organizationName,
      slug: subdomainSlug,
      status: createAsActive ? "ACTIVE" : "PENDING",
      logoUrl,
      primaryColor,
      secondaryColor,
    },
  });

  await db.user.create({
    data: {
      email: adminEmail,
      passwordHash: hashedPassword,
      firstName,
      lastName,
      role: "admin",
      organizationId: organization.id,
      status: "ACTIVE",
    },
  });

  await db.invitation.update({
    where: { id: invitation.id },
    data: { status: "USED" },
  });

  await assignDefaultFreePlanToOrganization(organization.id);

  const redirectUrl = getTenantLoginUrl(organization.slug);
  return NextResponse.json({ redirectUrl }, { status: 201 });
}
