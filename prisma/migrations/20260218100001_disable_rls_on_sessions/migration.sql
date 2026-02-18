-- Disable RLS on sessions table so session lookups work without tenant context.
-- Session auth relies on secret token; tenant isolation is enforced at the app layer.
-- Run only if RLS is enabled (no-op otherwise).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'sessions' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;
