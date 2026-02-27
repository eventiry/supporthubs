-- Remove invitation logoUrl (no longer used; display-only org branding at redeem)
ALTER TABLE "invitations" DROP COLUMN IF EXISTS "logoUrl";
