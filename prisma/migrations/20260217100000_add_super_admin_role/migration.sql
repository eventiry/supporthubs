-- Add super_admin to UserRole enum (platform admin role).
-- Must be alone: PostgreSQL does not allow using a new enum value in the same transaction.
ALTER TYPE "UserRole" ADD VALUE 'super_admin';
