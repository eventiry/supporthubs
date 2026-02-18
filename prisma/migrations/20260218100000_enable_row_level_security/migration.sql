-- Enable Row-Level Security (RLS) on tenant-scoped tables.
-- App sets app.current_organization and app.current_role via set_config before queries.
-- - super_admin: full access (platform admin)
-- - tenant_resolver: SELECT organizations (for subdomain -> tenant resolution)
-- - tenant (org set): access only where organizationId matches
--
-- sessions table: RLS is NOT enabled (see next migration) so session lookup works without context.
--
-- Idempotent: safe to retry after partial failure (drops policies first, enables RLS only if needed).

-- Organizations
DO $$ BEGIN
  IF NOT COALESCE((SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'organizations' AND n.nspname = 'public'), false) THEN
    ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
  END IF; END $$;
DROP POLICY IF EXISTS "org_super_admin" ON "organizations";
DROP POLICY IF EXISTS "org_tenant_resolver" ON "organizations";
DROP POLICY IF EXISTS "org_tenant" ON "organizations";
CREATE POLICY "org_super_admin" ON "organizations"
  FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');
CREATE POLICY "org_tenant_resolver" ON "organizations"
  FOR SELECT USING (current_setting('app.current_role', true) = 'tenant_resolver');
CREATE POLICY "org_tenant" ON "organizations"
  FOR ALL USING (current_setting('app.current_organization', true) = id::text);

-- Users
DO $$ BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'users' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
  END IF; END $$;
DROP POLICY IF EXISTS "users_super_admin" ON "users";
DROP POLICY IF EXISTS "users_tenant" ON "users";
CREATE POLICY "users_super_admin" ON "users"
  FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');
CREATE POLICY "users_tenant" ON "users"
  FOR ALL USING (
    "organizationId" IS NOT NULL
    AND "organizationId" = current_setting('app.current_organization', true)
  );

-- Agencies
DO $$ BEGIN
  IF NOT COALESCE((SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'agencies' AND n.nspname = 'public'), false) THEN
    ALTER TABLE "agencies" ENABLE ROW LEVEL SECURITY;
  END IF; END $$;
DROP POLICY IF EXISTS "agencies_super_admin" ON "agencies";
DROP POLICY IF EXISTS "agencies_tenant" ON "agencies";
CREATE POLICY "agencies_super_admin" ON "agencies"
  FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');
CREATE POLICY "agencies_tenant" ON "agencies"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization', true));

-- Clients
DO $$ BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'clients' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
  END IF; END $$;
DROP POLICY IF EXISTS "clients_super_admin" ON "clients";
DROP POLICY IF EXISTS "clients_tenant" ON "clients";
CREATE POLICY "clients_super_admin" ON "clients"
  FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');
CREATE POLICY "clients_tenant" ON "clients"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization', true));

-- Referral details
DO $$ BEGIN
  IF NOT COALESCE((SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'referral_details' AND n.nspname = 'public'), false) THEN
    ALTER TABLE "referral_details" ENABLE ROW LEVEL SECURITY;
  END IF; END $$;
DROP POLICY IF EXISTS "referral_details_super_admin" ON "referral_details";
DROP POLICY IF EXISTS "referral_details_tenant" ON "referral_details";
CREATE POLICY "referral_details_super_admin" ON "referral_details"
  FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');
CREATE POLICY "referral_details_tenant" ON "referral_details"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization', true));

-- Food bank centers
DO $$ BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'food_bank_centers' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE "food_bank_centers" ENABLE ROW LEVEL SECURITY;
  END IF; END $$;
DROP POLICY IF EXISTS "food_bank_centers_super_admin" ON "food_bank_centers";
DROP POLICY IF EXISTS "food_bank_centers_tenant" ON "food_bank_centers";
CREATE POLICY "food_bank_centers_super_admin" ON "food_bank_centers"
  FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');
CREATE POLICY "food_bank_centers_tenant" ON "food_bank_centers"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization', true));

-- Vouchers
DO $$ BEGIN
  IF NOT COALESCE((SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'vouchers' AND n.nspname = 'public'), false) THEN
    ALTER TABLE "vouchers" ENABLE ROW LEVEL SECURITY;
  END IF; END $$;
DROP POLICY IF EXISTS "vouchers_super_admin" ON "vouchers";
DROP POLICY IF EXISTS "vouchers_tenant" ON "vouchers";
CREATE POLICY "vouchers_super_admin" ON "vouchers"
  FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');
CREATE POLICY "vouchers_tenant" ON "vouchers"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization', true));

-- Subscriptions
DO $$ BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'subscriptions' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
  END IF; END $$;
DROP POLICY IF EXISTS "subscriptions_super_admin" ON "subscriptions";
DROP POLICY IF EXISTS "subscriptions_tenant" ON "subscriptions";
CREATE POLICY "subscriptions_super_admin" ON "subscriptions"
  FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');
CREATE POLICY "subscriptions_tenant" ON "subscriptions"
  FOR ALL USING ("organizationId" = current_setting('app.current_organization', true));

-- Audit logs
DO $$ BEGIN
  IF NOT COALESCE((SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'audit_logs' AND n.nspname = 'public'), false) THEN
    ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
  END IF; END $$;
DROP POLICY IF EXISTS "audit_logs_super_admin" ON "audit_logs";
DROP POLICY IF EXISTS "audit_logs_tenant" ON "audit_logs";
CREATE POLICY "audit_logs_super_admin" ON "audit_logs"
  FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');
CREATE POLICY "audit_logs_tenant" ON "audit_logs"
  FOR ALL USING (
    "organizationId" = current_setting('app.current_organization', true)
    OR "organizationId" IS NULL
  );
