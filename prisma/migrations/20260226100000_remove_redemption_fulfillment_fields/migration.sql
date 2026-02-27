-- Remove fulfillment fields from redemptions (weight/people/ages are shown from issue data only)
ALTER TABLE "redemptions" DROP COLUMN IF EXISTS "weightKg";
ALTER TABLE "redemptions" DROP COLUMN IF EXISTS "numberOfPeople";
ALTER TABLE "redemptions" DROP COLUMN IF EXISTS "ages";
