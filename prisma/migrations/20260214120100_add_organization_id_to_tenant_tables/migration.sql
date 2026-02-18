-- Step 1: Add organizationId columns as nullable first
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "food_bank_centers" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "referral_details" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- Step 2: Create default organization (idempotent)
INSERT INTO "organizations" ("id", "slug", "name", "status", "createdAt", "updatedAt")
VALUES ('default_org_000000000000001', 'default', 'Default Organization', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;

-- Step 3: Backfill: set organizationId to default org (use slug to find id in case it was created with different id)
UPDATE "users" SET "organizationId" = (SELECT "id" FROM "organizations" WHERE "slug" = 'default' LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "agencies" SET "organizationId" = (SELECT "id" FROM "organizations" WHERE "slug" = 'default' LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "food_bank_centers" SET "organizationId" = (SELECT "id" FROM "organizations" WHERE "slug" = 'default' LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "clients" SET "organizationId" = (SELECT "id" FROM "organizations" WHERE "slug" = 'default' LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "referral_details" SET "organizationId" = (SELECT "id" FROM "organizations" WHERE "slug" = 'default' LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "vouchers" SET "organizationId" = (SELECT "id" FROM "organizations" WHERE "slug" = 'default' LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "audit_logs" SET "organizationId" = (SELECT "id" FROM "organizations" WHERE "slug" = 'default' LIMIT 1) WHERE "organizationId" IS NULL;

-- Step 4: Make organizationId NOT NULL (except users and audit_logs which allow null for platform)
ALTER TABLE "agencies" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "food_bank_centers" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "referral_details" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "vouchers" ALTER COLUMN "organizationId" SET NOT NULL;

-- Step 5: Add foreign keys
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "food_bank_centers" ADD CONSTRAINT "food_bank_centers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clients" ADD CONSTRAINT "clients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_details" ADD CONSTRAINT "referral_details_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS "users_organizationId_idx" ON "users"("organizationId");
CREATE INDEX IF NOT EXISTS "agencies_organizationId_idx" ON "agencies"("organizationId");
CREATE INDEX IF NOT EXISTS "food_bank_centers_organizationId_idx" ON "food_bank_centers"("organizationId");
CREATE INDEX IF NOT EXISTS "clients_organizationId_idx" ON "clients"("organizationId");
CREATE INDEX IF NOT EXISTS "referral_details_organizationId_idx" ON "referral_details"("organizationId");
CREATE INDEX IF NOT EXISTS "vouchers_organizationId_idx" ON "vouchers"("organizationId");
CREATE INDEX IF NOT EXISTS "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");
