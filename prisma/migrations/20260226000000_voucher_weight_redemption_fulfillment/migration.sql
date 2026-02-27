-- AlterTable: Voucher weight at issue (kg)
ALTER TABLE "vouchers" ADD COLUMN "weightKg" DOUBLE PRECISION;

-- AlterTable: Redemption fulfillment fields (weight, number of people, ages)
ALTER TABLE "redemptions" ADD COLUMN "weightKg" DOUBLE PRECISION;
ALTER TABLE "redemptions" ADD COLUMN "numberOfPeople" INTEGER;
ALTER TABLE "redemptions" ADD COLUMN "ages" JSONB;
