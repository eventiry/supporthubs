-- Add fulfillment weight (kg) to redemptions; can override voucher weight at redeem
ALTER TABLE "redemptions" ADD COLUMN "weightKg" DOUBLE PRECISION;
