import { NextRequest, NextResponse } from "next/server";
import { getPlatformAdminSession } from "@/lib/api/get-platform-admin-session";
import { SUBSCRIPTION_ENABLED } from "@/lib/config";

/**
 * GET /api/platform/config — platform admin only. Returns feature flags for dashboard UI.
 */
export async function GET(_req: NextRequest) {
  const out = await getPlatformAdminSession(_req);
  if (out instanceof NextResponse) return out;

  return NextResponse.json({
    subscriptionEnabled: SUBSCRIPTION_ENABLED,
  });
}
