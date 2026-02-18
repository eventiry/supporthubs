import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserAndTenant } from "@/lib/api/get-session-and-tenant";
import { SUBSCRIPTION_ENABLED } from "@/lib/config";

/**
 * GET /api/billing — current organization's subscription summary (tenant auth required).
 * Used by the dashboard Billing page for tenants to see plan, status, and manage billing.
 */
export async function GET(req: NextRequest) {
  const out = await getSessionUserAndTenant(req);
  if (out instanceof NextResponse) return out;

  const org = await db.organization.findUnique({
    where: { id: out.tenant.organizationId },
    include: { subscriptionPlan: true },
  });
  if (!org) {
    return NextResponse.json({ message: "Organization not found" }, { status: 404 });
  }

  const subscription = await db.subscription.findFirst({
    where: { organizationId: org.id, status: "active" },
    orderBy: { updatedAt: "desc" },
    select: { cancelAtPeriodEnd: true },
  });

  return NextResponse.json({
    subscriptionEnabled: SUBSCRIPTION_ENABLED,
    plan: org.subscriptionPlan
      ? {
          id: org.subscriptionPlan.id,
          name: org.subscriptionPlan.name,
          slug: org.subscriptionPlan.slug,
          tier: org.subscriptionPlan.tier,
          priceMonthly: org.subscriptionPlan.priceMonthly != null ? Number(org.subscriptionPlan.priceMonthly) : null,
          priceYearly: org.subscriptionPlan.priceYearly != null ? Number(org.subscriptionPlan.priceYearly) : null,
        }
      : null,
    status: org.subscriptionStatus,
    billingEmail: org.billingEmail ?? null,
    subscriptionEndsAt: org.subscriptionEndsAt,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    canUsePortal: !!org.stripeCustomerId,
  });
}
