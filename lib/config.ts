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
