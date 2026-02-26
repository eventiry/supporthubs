-- AlterEnum
ALTER TYPE "VoucherStatus" ADD VALUE 'unfulfilled';

-- AlterTable
ALTER TABLE "food_bank_centers" ADD COLUMN     "openingHours" JSONB;

-- AlterTable
ALTER TABLE "vouchers" ADD COLUMN     "unfulfilledReason" TEXT;
