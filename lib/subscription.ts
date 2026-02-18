/**
 * Subscription plan limits and enforcement.
 * When SUBSCRIPTION_ENABLED is false, all operations are allowed (no limit check).
 * Platform admin (isPlatformAdmin) can override limits when viewing/managing tenants.
 */

import { db } from "@/lib/db";
import { SUBSCRIPTION_ENABLED } from "@/lib/config";
import { ensureOrgHasDefaultPlan } from "@/lib/subscription-defaults";

export interface PlanLimits {
  maxUsers: number | null;
  maxAgencies: number | null;
  maxVouchersPerMonth: number | null;
}

const DEFAULT_LIMITS: PlanLimits = {
  maxUsers: null,
  maxAgencies: null,
  maxVouchersPerMonth: null,
};

function parseLimits(limits: unknown): PlanLimits {
  if (limits == null || typeof limits !== "object") return DEFAULT_LIMITS;
  const o = limits as Record<string, unknown>;
  return {
    maxUsers: typeof o.maxUsers === "number" ? o.maxUsers : null,
    maxAgencies: typeof o.maxAgencies === "number" ? o.maxAgencies : null,
    maxVouchersPerMonth: typeof o.maxVouchersPerMonth === "number" ? o.maxVouchersPerMonth : null,
  };
}

/** Statuses that allow usage (within limits). */
const ACTIVE_SUBSCRIPTION_STATUSES = ["trialing", "active"] as const;

/**
 * Get effective limits for an organization (from its plan, or unlimited if no plan).
 * Returns null limits when subscription feature is off or org has no plan / inactive status.
 */
export async function getPlanLimitsForOrganization(organizationId: string): Promise<{
  limits: PlanLimits;
  subscriptionStatus: string;
  canUse: boolean;
}> {
  if (SUBSCRIPTION_ENABLED) {
    await ensureOrgHasDefaultPlan(organizationId);
  }
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      subscriptionStatus: true,
      subscriptionPlanId: true,
      subscriptionPlan: { select: { limits: true } },
    },
  });
  if (!org) {
    return { limits: DEFAULT_LIMITS, subscriptionStatus: "none", canUse: true };
  }
  const canUse =
    !SUBSCRIPTION_ENABLED ||
    ACTIVE_SUBSCRIPTION_STATUSES.includes(org.subscriptionStatus as (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number]);
  const limits =
    org.subscriptionPlan?.limits != null
      ? parseLimits(org.subscriptionPlan.limits)
      : DEFAULT_LIMITS;
  return {
    limits,
    subscriptionStatus: org.subscriptionStatus,
    canUse,
  };
}

/**
 * Check if the organization can create one more user.
 * When isPlatformAdmin is true, always allow (platform override).
 */
export async function canCreateUser(
  organizationId: string,
  isPlatformAdmin: boolean
): Promise<{ allowed: boolean; message?: string }> {
  if (isPlatformAdmin) return { allowed: true };
  if (!SUBSCRIPTION_ENABLED) return { allowed: true };

  const { limits, canUse } = await getPlanLimitsForOrganization(organizationId);
  if (!canUse) {
    return { allowed: false, message: "Subscription is not active. Please contact the platform to activate your plan." };
  }
  if (limits.maxUsers == null) return { allowed: true };

  const count = await db.user.count({ where: { organizationId } });
  if (count >= limits.maxUsers) {
    return { allowed: false, message: `User limit reached (${limits.maxUsers}). Upgrade your plan or contact the platform.` };
  }
  return { allowed: true };
}

/**
 * Check if the organization can create one more agency.
 */
export async function canCreateAgency(
  organizationId: string,
  isPlatformAdmin: boolean
): Promise<{ allowed: boolean; message?: string }> {
  if (isPlatformAdmin) return { allowed: true };
  if (!SUBSCRIPTION_ENABLED) return { allowed: true };

  const { limits, canUse } = await getPlanLimitsForOrganization(organizationId);
  if (!canUse) {
    return { allowed: false, message: "Subscription is not active. Please contact the platform to activate your plan." };
  }
  if (limits.maxAgencies == null) return { allowed: true };

  const count = await db.agency.count({ where: { organizationId } });
  if (count >= limits.maxAgencies) {
    return { allowed: false, message: `Agency limit reached (${limits.maxAgencies}). Upgrade your plan or contact the platform.` };
  }
  return { allowed: true };
}

/**
 * Check if the organization can create vouchers this month (vouchers per month limit).
 */
export async function canCreateVoucher(
  organizationId: string,
  isPlatformAdmin: boolean
): Promise<{ allowed: boolean; message?: string }> {
  if (isPlatformAdmin) return { allowed: true };
  if (!SUBSCRIPTION_ENABLED) return { allowed: true };

  const { limits, canUse } = await getPlanLimitsForOrganization(organizationId);
  if (!canUse) {
    return { allowed: false, message: "Subscription is not active. Please contact the platform to activate your plan." };
  }
  if (limits.maxVouchersPerMonth == null) return { allowed: true };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const count = await db.voucher.count({
    where: {
      organizationId,
      createdAt: { gte: startOfMonth },
    },
  });
  if (count >= limits.maxVouchersPerMonth) {
    return {
      allowed: false,
      message: `Monthly voucher limit reached (${limits.maxVouchersPerMonth}). Upgrade your plan or contact the platform.`,
    };
  }
  return { allowed: true };
}
