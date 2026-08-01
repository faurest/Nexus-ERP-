-- =============================================================================
-- CLEANUP: Drop ALL existing broken policies and triggers
-- Run this FIRST, then run 20260723_phase3_full_migration.sql
-- =============================================================================

-- Drop ALL policies on ALL tables (safe, idempotent)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    RAISE NOTICE 'Dropped policy % on %', r.policyname, r.tablename;
  END LOOP;
END;
$$;

-- Disable RLS on all tables (clean slate)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', r.tablename);
    RAISE NOTICE 'Disabled RLS on %', r.tablename;
  END LOOP;
END;
$$;

-- Drop ALL triggers named set_updated_at (clean slate)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT trigger_name, event_object_table
    FROM information_schema.triggers
    WHERE trigger_name LIKE 'set_updated_at%'
      AND trigger_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', r.trigger_name, r.event_object_table);
    RAISE NOTICE 'Dropped trigger % on %', r.trigger_name, r.event_object_table;
  END LOOP;
END;
$$;

-- Drop the function too (will be recreated)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

SELECT 'Cleanup complete. Now run 20260723_phase3_full_migration.sql' AS status;
