-- Add description and features to subscription_plans (industry standard for pricing pages)
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "features" JSONB;
