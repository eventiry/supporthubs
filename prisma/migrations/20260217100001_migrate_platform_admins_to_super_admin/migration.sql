-- Migrate existing platform admins (organizationId IS NULL) from admin to super_admin.
-- Runs in a separate migration so the new enum value from the previous migration is committed.
UPDATE "users" SET role = 'super_admin' WHERE "organizationId" IS NULL AND role = 'admin';
