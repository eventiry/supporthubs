-- Persist ethnicity and household size on client records for reuse when issuing vouchers.
ALTER TABLE "clients" ADD COLUMN "ethnicGroup" TEXT;
ALTER TABLE "clients" ADD COLUMN "householdByAge" JSONB;
