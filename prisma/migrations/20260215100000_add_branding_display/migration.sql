-- AlterTable
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "brandingDisplay" TEXT DEFAULT 'both';
