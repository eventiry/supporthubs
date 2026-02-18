import { NextRequest, NextResponse } from "next/server";
import { db, setPlatformRlsContext } from "@/lib/db";

/**
 * GET /api/join/validate?token=... — validate invitation token.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) return NextResponse.json({ message: "Token is required" }, { status: 400 });

  await setPlatformRlsContext();
  const invitation = await db.invitation.findUnique({ where: { token } });

  if (!invitation) return NextResponse.json({ message: "Invalid or expired invitation" }, { status: 404 });
  if (invitation.status !== "PENDING") return NextResponse.json({ message: "This invitation has already been used" }, { status: 400 });
  if (invitation.expiresAt < new Date()) {
    await db.invitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ message: "This invitation has expired" }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    email: invitation.email,
    organizationName: invitation.organizationName,
    subdomainSlug: invitation.subdomainSlug,
    expiresAt: invitation.expiresAt.toISOString(),
  });
}
