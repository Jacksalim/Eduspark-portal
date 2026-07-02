-- ============================================================
-- EduSpark — Existing-User Profile Migration
-- Run this AFTER schema.sql on a database that already has
-- authenticated users in auth.users.
--
-- Safe to run multiple times (idempotent updates).
-- Does NOT delete any auth.users rows.
-- ============================================================

-- ============================================================
-- STEP 1: Add missing columns to profiles (safe ALTER TABLEs)
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone                TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_id             UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_academic_year TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- last_promotion_id FK is added by schema.sql after promotions table is created,
-- but guard here in case this script runs standalone:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_promotion_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_promotion_id UUID;
  END IF;
END $$;

-- ============================================================
-- STEP 2: Ensure every auth.users row has a profiles row
--         (backfills anyone who slipped through before the trigger existed)
-- ============================================================

INSERT INTO public.profiles (id, full_name, email, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name',
           u.raw_user_meta_data->>'full_name', '') AS full_name,
  COALESCE(u.email, '')                            AS email,
  CASE
    WHEN u.raw_user_meta_data->>'role' = 'parent' THEN 'parent'
    WHEN u.raw_user_meta_data->>'role' = 'admin'  THEN 'admin'
    WHEN u.raw_user_meta_data->>'role' = 'tutor'  THEN 'tutor'
    ELSE 'student'
  END                                              AS role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 3: Fill empty full_name from auth metadata
-- ============================================================

UPDATE public.profiles p
SET full_name = COALESCE(
  NULLIF(u.raw_user_meta_data->>'full_name', ''),
  NULLIF(u.raw_user_meta_data->>'name', ''),
  SPLIT_PART(COALESCE(u.email, ''), '@', 1),
  'User'
)
FROM auth.users u
WHERE p.id = u.id
  AND (p.full_name IS NULL OR p.full_name = '');

-- ============================================================
-- STEP 4: Fill empty email from auth.users
-- ============================================================

UPDATE public.profiles p
SET email = COALESCE(u.email, '')
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');

-- ============================================================
-- STEP 5: Normalize legacy role values
--
--   'learner' → 'student'  (old schemas used 'learner')
--
-- If you want to keep 'learner' as a valid role, skip this step.
-- The CHECK constraint in schema.sql allows BOTH 'learner' and 'student'
-- so existing rows with role='learner' will NOT cause constraint failures.
-- Uncomment the block below only if you want a full rename:
-- ============================================================

-- UPDATE public.profiles SET role = 'student' WHERE role = 'learner';
-- UPDATE public.user_roles SET role = 'student' WHERE role = 'learner';

-- ============================================================
-- STEP 6: Backfill user_roles from profiles
--         (ensures the audit table reflects actual roles)
-- ============================================================

INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================
-- STEP 7: Audit log — record the migration event
-- ============================================================

INSERT INTO public.audit_logs (actor_id, action, target_type, details)
VALUES (
  NULL,
  'schema.migration',
  'database',
  jsonb_build_object(
    'migration', 'migrate_existing_users.sql',
    'run_at', NOW(),
    'profiles_count', (SELECT COUNT(*) FROM public.profiles)
  )
);

-- ============================================================
-- STEP 8: Verification queries (review output before committing)
-- ============================================================

-- Users without profiles (should be 0 after step 2):
SELECT 'auth users without profile' AS check_name, COUNT(*) AS count
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- Profiles missing full_name (should be 0 after step 3):
SELECT 'profiles missing full_name' AS check_name, COUNT(*) AS count
FROM public.profiles
WHERE full_name IS NULL OR full_name = '';

-- Profiles missing email (should be 0 after step 4):
SELECT 'profiles missing email' AS check_name, COUNT(*) AS count
FROM public.profiles
WHERE email IS NULL OR email = '';

-- Role distribution:
SELECT 'role distribution' AS check_name, role, COUNT(*) AS count
FROM public.profiles
GROUP BY role
ORDER BY count DESC;

-- Records with legacy role='learner' (if > 0, consider running step 5):
SELECT 'legacy learner role count' AS check_name, COUNT(*) AS count
FROM public.profiles
WHERE role = 'learner';

