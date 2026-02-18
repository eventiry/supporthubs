-- Add Stripe Product ID and yearly Price ID for auto-created/updated Stripe prices
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "stripeProductId" TEXT;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "stripePriceIdYearly" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_stripeProductId_key" ON "subscription_plans"("stripeProductId");
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_stripePriceIdYearly_key" ON "subscription_plans"("stripePriceIdYearly");
