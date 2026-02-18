import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTenantBaseUrl } from "@/lib/tenant";
import { db } from "@/lib/db";
import { setRequestRlsContext } from "@/lib/db/rls";

/**
 * GET /api/me/tenant-dashboard-url
 * Returns the tenant subdomain base URL for the current user's organization.
 * Uses transaction so RLS context and org lookup share the same connection.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.organizationId) {
    return NextResponse.json({ message: "No tenant organization" }, { status: 404 });
  }

  const result = await db.$transaction(async (tx) => {
    await setRequestRlsContext(tx as Parameters<typeof setRequestRlsContext>[0], session!.organizationId!, null);
    const org = await tx.organization.findUnique({
      where: { id: session!.organizationId! },
      select: { slug: true },
    });
    return org;
  });

  if (!result) {
    return NextResponse.json({ message: "Organization not found" }, { status: 404 });
  }
  if (result.slug === "default") {
    return NextResponse.json({ message: "No tenant redirect for default org" }, { status: 404 });
  }

  const url = getTenantBaseUrl(result.slug);
  return NextResponse.json({ url });
}
