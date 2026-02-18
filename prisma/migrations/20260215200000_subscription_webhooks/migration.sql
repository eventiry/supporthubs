-- AlterTable: Organization - Stripe IDs for webhooks
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;

-- AlterTable: SubscriptionPlan - optional Stripe Price ID for webhook mapping
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;

-- CreateIndex (unique for lookup)
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_stripeCustomerId_key" ON "organizations"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_stripeSubscriptionId_key" ON "organizations"("stripeSubscriptionId");
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_stripePriceId_key" ON "subscription_plans"("stripePriceId");
