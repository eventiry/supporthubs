import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPlatformAdminSession } from "@/lib/api/get-platform-admin-session";

/**
 * GET /api/platform/contact-submissions — list all contact form submissions (platform admin only).
 */
export async function GET(_req: NextRequest) {
  const out = await getPlatformAdminSession(_req);
  if (out instanceof NextResponse) return out;

  const submissions = await db.contactSubmission.findMany({
    orderBy: { createdAt: "desc" },
  });

  const list = submissions.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    organizationName: s.organizationName,
    message: s.message,
    wantToUse: s.wantToUse,
    createdAt: s.createdAt,
  }));

  return NextResponse.json(list);
}
