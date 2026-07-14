-- =============================================================================
-- Create schema: pos_demo
-- Purpose:   Full structural + data replica of public (for demo / staging data)
-- Run in:    Supabase Dashboard → SQL Editor
-- Requires:  public schema already exists with your POS tables, views, functions
--
-- What this script does:
--   1. Drops and recreates pos_demo (comment out DROP for non-destructive runs)
--   2. Clones tables, sequences, indexes, constraints, views, functions, triggers
--   3. Copies all row data from public → pos_demo
--   4. Clones RLS policies and applies Supabase API grants
--
-- After running, expose the schema to PostgREST (Supabase API):
--   Dashboard → Project Settings → API → "Exposed schemas" → add pos_demo
--   Or run the GRANT / NOTIFY block at the bottom of this file.
--
-- App note: set VITE_SUPABASE_SCHEMA=pos_demo in .env.local (see .env.example).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Reset target schema (remove CASCADE line if you only want a first-time create)
-- -----------------------------------------------------------------------------
DROP SCHEMA IF EXISTS pos_demo CASCADE;
CREATE SCHEMA pos_demo;

-- -----------------------------------------------------------------------------
-- 1. Clone table shells (columns, defaults, identity, storage, comments)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  tbl record;
BEGIN
  FOR tbl IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relispartition = false
    ORDER BY c.relname
  LOOP
    EXECUTE format(
      'CREATE TABLE pos_demo.%I (LIKE public.%I INCLUDING DEFAULTS INCLUDING IDENTITY INCLUDING GENERATED INCLUDING STORAGE INCLUDING COMMENTS)',
      tbl.tablename,
      tbl.tablename
    );
  END LOOP;
END $$;

-- Rewrite column defaults that still point at public sequences
DO $$
DECLARE
  col record;
  new_default text;
BEGIN
  FOR col IN
    SELECT
      c.relname AS tablename,
      a.attname AS column_name,
      pg_get_expr(d.adbin, d.adrelid) AS default_expr
    FROM pg_attrdef d
    JOIN pg_class c ON c.oid = d.adrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.adnum AND a.attnum > 0
    WHERE n.nspname = 'pos_demo'
      AND NOT a.attisdropped
  LOOP
    IF col.default_expr LIKE '%public.%' THEN
      new_default := replace(col.default_expr, 'public.', 'pos_demo.');
      EXECUTE format(
        'ALTER TABLE pos_demo.%I ALTER COLUMN %I SET DEFAULT %s',
        col.tablename,
        col.column_name,
        new_default
      );
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Copy data public → pos_demo
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  tbl record;
BEGIN
  FOR tbl IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relispartition = false
    ORDER BY c.relname
  LOOP
    EXECUTE format(
      'INSERT INTO pos_demo.%I SELECT * FROM public.%I',
      tbl.tablename,
      tbl.tablename
    );
  END LOOP;
END $$;

-- Sync serial/identity sequences in pos_demo after data copy
DO $$
DECLARE
  seq record;
BEGIN
  FOR seq IN
    SELECT
      ns_dst.nspname AS dst_schema,
      c.relname AS table_name,
      a.attname AS column_name,
      pg_get_serial_sequence(format('%I.%I', ns_dst.nspname, c.relname), a.attname) AS seq_name
    FROM pg_class c
    JOIN pg_namespace ns_dst ON ns_dst.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE ns_dst.nspname = 'pos_demo'
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND pg_get_serial_sequence(format('%I.%I', ns_dst.nspname, c.relname), a.attname) IS NOT NULL
  LOOP
    EXECUTE format(
      'SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I.%I), 1), MAX(%I) IS NOT NULL)',
      seq.seq_name,
      seq.column_name,
      seq.dst_schema,
      seq.table_name,
      seq.column_name
    );
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Clone constraints (PK, UNIQUE, CHECK, FK)
--     FK targets in public are rewritten to pos_demo; auth/storage refs stay as-is.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  con record;
  src_schema text := 'public';
  dst_schema text := 'pos_demo';
BEGIN
  FOR con IN
    SELECT
      c.conname,
      c.contype,
      cl.relname AS tablename,
      pg_get_constraintdef(c.oid, true) AS condef
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname = src_schema
      AND c.contype IN ('p', 'u', 'f', 'c')
    ORDER BY
      CASE c.contype
        WHEN 'p' THEN 1
        WHEN 'u' THEN 2
        WHEN 'c' THEN 3
        WHEN 'f' THEN 4
      END,
      cl.relname,
      c.conname
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
        dst_schema,
        con.tablename,
        con.conname,
        regexp_replace(
          con.condef,
          '(?<!auth\.)(?<!storage\.)' || src_schema || '\.',
          dst_schema || '.',
          'g'
        )
      );
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint % already exists on %.% — skipped', con.conname, dst_schema, con.tablename;
    END;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Clone non-constraint indexes
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  idx record;
  idx_def text;
BEGIN
  FOR idx IN
    SELECT
      i.relname AS indexname,
      t.relname AS tablename,
      pg_get_indexdef(i.oid) AS indexdef
    FROM pg_index x
    JOIN pg_class i ON i.oid = x.indexrelid
    JOIN pg_class t ON t.oid = x.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND NOT x.indisprimary
      AND NOT x.indisunique
  LOOP
    idx_def := replace(idx.indexdef, 'public.', 'pos_demo.');
    BEGIN
      EXECUTE idx_def;
    EXCEPTION
      WHEN duplicate_table THEN
        RAISE NOTICE 'Index % already exists — skipped', idx.indexname;
    END;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 5. Clone views (e.g. products_with_categories)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  vw record;
  view_sql text;
BEGIN
  FOR vw IN
    SELECT c.relname AS viewname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
    ORDER BY c.relname
  LOOP
    SELECT pg_get_viewdef(format('public.%I', vw.viewname)::regclass, true) INTO view_sql;

    -- Rewrite public references to pos_demo, but keep auth.* / storage.* untouched
    view_sql := regexp_replace(view_sql, '(?<!auth\.)(?<!storage\.)public\.', 'pos_demo.', 'g');

    EXECUTE format('CREATE OR REPLACE VIEW pos_demo.%I AS %s', vw.viewname, view_sql);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 6. Clone functions / procedures (e.g. decrement_stock)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  fn record;
  fn_def text;
BEGIN
  FOR fn IN
    SELECT
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
    ORDER BY p.proname
  LOOP
    fn_def := pg_get_functiondef(fn.oid);
    fn_def := replace(fn_def, 'CREATE OR REPLACE FUNCTION public.', 'CREATE OR REPLACE FUNCTION pos_demo.');
    fn_def := replace(fn_def, 'CREATE FUNCTION public.', 'CREATE FUNCTION pos_demo.');
    fn_def := regexp_replace(fn_def, ' SET search_path = public', ' SET search_path = pos_demo', 'g');
    fn_def := regexp_replace(fn_def, '(?<!auth\.)(?<!storage\.)public\.', 'pos_demo.', 'g');

    BEGIN
      EXECUTE fn_def;
    EXCEPTION
      WHEN duplicate_function THEN
        RAISE NOTICE 'Function %(% ) already exists — skipped', fn.proname, fn.args;
    END;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 7. Clone triggers
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  trg record;
  trg_def text;
BEGIN
  FOR trg IN
    SELECT
      t.tgname,
      c.relname AS tablename,
      pg_get_triggerdef(t.oid, true) AS triggerdef
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal
    ORDER BY c.relname, t.tgname
  LOOP
    trg_def := trg.triggerdef;
    trg_def := replace(trg_def, ' ON public.', ' ON pos_demo.');
    trg_def := regexp_replace(trg_def, 'EXECUTE (FUNCTION|PROCEDURE) public\.', 'EXECUTE \1 pos_demo.', 'g');

    BEGIN
      EXECUTE trg_def;
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'Trigger % on % already exists — skipped', trg.tgname, trg.tablename;
    END;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 8. Enable RLS and clone policies
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  pol record;
  tbl record;
BEGIN
  FOR tbl IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = tbl.tablename
        AND c.relrowsecurity
    ) THEN
      EXECUTE format('ALTER TABLE pos_demo.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    END IF;
  END LOOP;

  FOR pol IN
    SELECT
      p.polname,
      c.relname AS tablename,
      p.polcmd,
      p.polpermissive,
      p.polroles::regrole[] AS roles,
      pg_get_expr(p.polqual, p.polrelid) AS using_expr,
      pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON pos_demo.%I AS %s FOR %s TO %s %s %s',
      pol.polname,
      pol.tablename,
      CASE WHEN pol.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
      END,
      COALESCE(
        (
          SELECT string_agg(quote_ident(rolname), ', ')
          FROM pg_roles
          WHERE oid = ANY (pol.roles)
        ),
        'public'
      ),
      CASE
        WHEN pol.using_expr IS NOT NULL THEN
          'USING (' || regexp_replace(pol.using_expr, '(?<!auth\.)(?<!storage\.)public\.', 'pos_demo.', 'g') || ')'
        ELSE ''
      END,
      CASE
        WHEN pol.check_expr IS NOT NULL THEN
          'WITH CHECK (' || regexp_replace(pol.check_expr, '(?<!auth\.)(?<!storage\.)public\.', 'pos_demo.', 'g') || ')'
        ELSE ''
      END
    );
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 9. Supabase API grants (match typical public-schema access)
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA pos_demo TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA pos_demo TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA pos_demo TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA pos_demo TO anon;

GRANT ALL ON ALL SEQUENCES IN SCHEMA pos_demo TO postgres, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA pos_demo TO authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pos_demo TO postgres, service_role, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA pos_demo
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA pos_demo
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA pos_demo
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA pos_demo
  GRANT EXECUTE ON FUNCTIONS TO authenticated;

COMMIT;

-- -----------------------------------------------------------------------------
-- 10. Optional: expose pos_demo to PostgREST (Supabase REST API)
--     Uncomment if your project uses the legacy authenticator role setting.
-- -----------------------------------------------------------------------------
-- ALTER ROLE authenticator SET pgrst.db_schemas = 'public, pos_demo';
-- NOTIFY pgrst, 'reload schema';

-- -----------------------------------------------------------------------------
-- Verification queries (run separately after the script succeeds)
-- -----------------------------------------------------------------------------
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'pos_demo' ORDER BY 1;
--
-- SELECT count(*) AS categories FROM pos_demo.categories;
-- SELECT count(*) AS products FROM pos_demo.products;
-- SELECT count(*) AS profiles FROM pos_demo.profiles;
--
-- Compare row counts with public:
-- SELECT 'public' AS schema, count(*) FROM public.products
-- UNION ALL
-- SELECT 'pos_demo', count(*) FROM pos_demo.products;
