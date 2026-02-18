import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPlatformAdminSession } from "@/lib/api/get-platform-admin-session";

/**
 * GET /api/platform/subscriptions — list all subscriptions (platform admin only).
 * Returns subscription records with organization and plan names for admin management.
 */
export async function GET(_req: NextRequest) {
  const out = await getPlatformAdminSession(_req);
  if (out instanceof NextResponse) return out;

  const subscriptions = await db.subscription.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      subscriptionPlan: { select: { id: true, name: true } },
    },
  });

  const list = subscriptions.map((s) => ({
    id: s.id,
    organizationId: s.organizationId,
    organizationName: s.organization.name,
    organizationSlug: s.organization.slug,
    stripeSubscriptionId: s.stripeSubscriptionId,
    stripeCustomerId: s.stripeCustomerId,
    subscriptionPlanId: s.subscriptionPlanId,
    subscriptionPlanName: s.subscriptionPlan?.name ?? null,
    status: s.status,
    currentPeriodStart: s.currentPeriodStart,
    currentPeriodEnd: s.currentPeriodEnd,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    cancelledAt: s.cancelledAt,
    createdAt: s.createdAt,
  }));

  return NextResponse.json(list);
}
