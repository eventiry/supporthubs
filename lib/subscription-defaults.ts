/**
 * Default free plan and helpers for assigning it to new orgs.
 * Every org should have a subscription at any point in time; default is the free (Starter) plan.
 */

import { db, setPlatformRlsContext } from "@/lib/db";

const DEFAULT_FREE_PLAN_SLUG = "starter";

/** Synthetic Stripe subscription ID for free (non-Stripe) subscriptions. Unique per org. */
export function freeSubscriptionId(organizationId: string): string {
  return `free-${organizationId}`;
}

/**
 * Get the default free plan (Starter by slug, or first active plan with price 0).
 * Returns null if no free plan exists.
 */
export async function getDefaultFreePlan(): Promise<{ id: string } | null> {
  const bySlug = await db.subscriptionPlan.findUnique({
    where: { slug: DEFAULT_FREE_PLAN_SLUG, active: true },
    select: { id: true },
  });
  if (bySlug) return bySlug;

  const plans = await db.subscriptionPlan.findMany({
    where: { active: true },
    select: { id: true, priceMonthly: true, priceYearly: true },
  });
  const free = plans.find(
    (p) =>
      (p.priceMonthly != null && Number(p.priceMonthly) === 0) &&
      (p.priceYearly == null || Number(p.priceYearly) === 0)
  );
  return free ? { id: free.id } : null;
}

const ACTIVE_STATUSES = ["active", "trialing"] as const;

/**
 * Assign the default free plan to an organization and create a Subscription record.
 * Call after creating an org so every org has a subscription (the free plan) by default.
 */
export async function assignDefaultFreePlanToOrganization(organizationId: string): Promise<void> {
  await setPlatformRlsContext();
  const plan = await getDefaultFreePlan();
  if (!plan) return;
  await setOrgToFreePlan(organizationId, plan.id);
}

/**
 * If the organization has no current active plan (no subscriptionPlanId or status not active/trialing),
 * assign the default Starter plan so every org always has an active plan.
 */
export async function ensureOrgHasDefaultPlan(organizationId: string): Promise<void> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { subscriptionPlanId: true, subscriptionStatus: true },
  });
  if (!org) return;
  const hasActivePlan =
    org.subscriptionPlanId != null &&
    ACTIVE_STATUSES.includes(org.subscriptionStatus as (typeof ACTIVE_STATUSES)[number]);
  if (hasActivePlan) return;
  await assignDefaultFreePlanToOrganization(organizationId);
}

/**
 * Set an organization to a free plan and upsert the Subscription table record.
 * Use when subscribing to a free plan (e.g. from billing/subscribe) so Organization and Subscription stay in sync.
 */
export async function setOrgToFreePlan(organizationId: string, planId: string): Promise<void> {
  await setPlatformRlsContext();
  const now = new Date();
  await db.organization.update({
    where: { id: organizationId },
    data: {
      subscriptionPlanId: planId,
      subscriptionStatus: "active",
      subscriptionStartedAt: now,
      subscriptionEndsAt: null,
    },
  });

  const freeId = freeSubscriptionId(organizationId);
  await db.subscription.upsert({
    where: { stripeSubscriptionId: freeId },
    create: {
      organizationId,
      stripeSubscriptionId: freeId,
      subscriptionPlanId: planId,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: null,
    },
    update: {
      subscriptionPlanId: planId,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: null,
    },
  });
}
