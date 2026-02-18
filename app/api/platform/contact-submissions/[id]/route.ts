import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPlatformAdminSession } from "@/lib/api/get-platform-admin-session";

/**
 * GET /api/platform/contact-submissions/[id] — get one contact submission (platform admin only).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await getPlatformAdminSession(_req);
  if (out instanceof NextResponse) return out;

  const { id } = await params;
  const submission = await db.contactSubmission.findUnique({
    where: { id },
  });

  if (!submission) {
    return NextResponse.json({ message: "Contact submission not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: submission.id,
    name: submission.name,
    email: submission.email,
    organizationName: submission.organizationName,
    message: submission.message,
    wantToUse: submission.wantToUse,
    createdAt: submission.createdAt,
  });
}
