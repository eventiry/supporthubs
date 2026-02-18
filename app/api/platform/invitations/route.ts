import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getPlatformAdminSession } from "@/lib/api/get-platform-admin-session";
import {
  sendInvitationEmail,
  INVITATION_EXPIRY_DAYS,
} from "@/lib/email/send-invitation";

/**
 * GET /api/platform/invitations — list all invitations (platform admin only).
 */
export async function GET(_req: NextRequest) {
  const out = await getPlatformAdminSession(_req);
  if (out instanceof NextResponse) return out;

  const invitations = await db.invitation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });
  return NextResponse.json(invitations);
}

/**
 * POST /api/platform/invitations — create invitation and send email (platform admin only).
 * Body: { email: string, organizationName: string, subdomainSlug: string, customMessage?: string }
 */
export async function POST(req: NextRequest) {
  const out = await getPlatformAdminSession(req);
  if (out instanceof NextResponse) return out;
  const { user } = out;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const organizationName = typeof payload.organizationName === "string" ? payload.organizationName.trim() : "";
  const subdomainSlug = typeof payload.subdomainSlug === "string" ? payload.subdomainSlug.trim().toLowerCase() : "";

  if (!email) {
    return NextResponse.json({ message: "Email is required" }, { status: 400 });
  }
  if (!organizationName) {
    return NextResponse.json({ message: "Organization name is required" }, { status: 400 });
  }
  if (!subdomainSlug) {
    return NextResponse.json({ message: "Subdomain slug is required" }, { status: 400 });
  }
  const validSlug = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(subdomainSlug);
  if (!validSlug) {
    return NextResponse.json(
      { message: "Subdomain slug must be lowercase letters, numbers, and hyphens only" },
      { status: 400 }
    );
  }

  const existingOrg = await db.organization.findUnique({ where: { slug: subdomainSlug } });
  if (existingOrg) {
    return NextResponse.json(
      { message: "An organization with this subdomain already exists" },
      { status: 400 }
    );
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await db.invitation.create({
    data: {
      email,
      organizationName,
      subdomainSlug,
      token,
      expiresAt,
      status: "PENDING",
      createdById: user.id,
    },
  });

  try {
    await sendInvitationEmail(email, organizationName, subdomainSlug, token, INVITATION_EXPIRY_DAYS);
  } catch (err) {
    console.error("[Invitation] Failed to send email:", err);
    return NextResponse.json(
      { message: "Invitation created but failed to send email. You can resend later." },
      { status: 500 }
    );
  }

  return NextResponse.json(invitation, { status: 201 });
}
