/**
 * Platform feature flags and config.
 * Use env vars so deployment can enable/disable without code change.
 */

/** When true, plan limits are enforced and public pricing/plans and webhooks are active. */
export const SUBSCRIPTION_ENABLED =
  process.env.SUBSCRIPTION_ENABLED === "true" || process.env.SUBSCRIPTION_ENABLED === "1";

/** Webhook signing secret (e.g. Stripe: whsec_...). Required to verify subscription webhooks. */
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? undefined;

/** Stripe secret key (sk_...). When set, plans with prices get Stripe Product and Price(s) created/updated automatically. */
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? undefined;

/**
 * Organization IDs that get special voucher rules (7-day expiry, no expiry on form, no collection notes,
 * E-001-1234 code format, N/A defaults for optional referral fields, consent not required).
 * Comma-separated in env, e.g. SELECTED_ORGS=orgId1,orgId2
 */
function parseSelectedOrgs(envValue: string | undefined): string[] {
  if (!envValue?.trim()) return [];
  return envValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Server-side: org IDs with special rules (from SELECTED_ORGS). */
export const SELECTED_ORGS = parseSelectedOrgs(process.env.NEXT_PUBLIC_SELECTED_ORGS || process.env.SELECTED_ORGS);

/** Client-side: org IDs with special rules (from NEXT_PUBLIC_SELECTED_ORGS). Use in issue voucher UI. */
export const NEXT_PUBLIC_SELECTED_ORGS = parseSelectedOrgs(
  process.env.NEXT_PUBLIC_SELECTED_ORGS || process.env.SELECTED_ORGS
);

export function isOrgInSelectedOrgs(orgId: string | null | undefined): boolean {
  if (!orgId) return false;
  return SELECTED_ORGS.includes(orgId);
}

/** Client-side helper: pass orgId from session; uses NEXT_PUBLIC_SELECTED_ORGS. */
export function isOrgInSelectedOrgsClient(orgId: string | null | undefined): boolean {
  if (!orgId) return false;
  return NEXT_PUBLIC_SELECTED_ORGS.includes(orgId);
}
