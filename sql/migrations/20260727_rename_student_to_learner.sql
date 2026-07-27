-- sql/migrations/20260727_rename_student_to_learner.sql
-- Migration: rename student → learner (roles, tables, columns, policies)
-- IMPORTANT: Review and test locally (supabase start) before applying to production.

BEGIN;

-- 1) Convert role values in data stores
UPDATE public.profiles SET role = 'learner' WHERE role = 'student';
UPDATE public.user_roles SET role = 'learner' WHERE role = 'student';

-- 2) Rename parent_student_links table to parent_learner_links
--    and rename student_id -> learner_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parent_student_links') THEN
    ALTER TABLE public.parent_student_links RENAME TO parent_learner_links;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'parent_learner_links' AND column_name = 'student_id'
  ) THEN
    ALTER TABLE public.parent_learner_links RENAME COLUMN student_id TO learner_id;
  END IF;
END$$;

-- 3) Update triggers that reference student_id or parent_student_links
-- Drop and recreate triggers/functions if necessary (handled below by replacing definitions in sql/01_schema.sql + sql/02_rls_policies.sql files)

-- 4) Update RLS policies: We'll drop old policies that reference parent_student_links and create new ones.
-- Note: Exact policy text will be updated in the SQL files under sql/ (02_rls_policies.sql & schema.sql); this migration is a scaffold to rename objects and data.

-- 5) Compatibility view (optional): create a view with the old name pointing to the new table
-- This preserves queries from older code until all deployments are updated.
CREATE VIEW IF NOT EXISTS public.parent_student_links AS SELECT * FROM public.parent_learner_links;

COMMIT;
