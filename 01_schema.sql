-- ============================================================
-- EduSpark Auth System — Complete Schema & RLS Migration
-- Run this in your Supabase SQL Editor (Project > SQL Editor)
-- ============================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'student'
                CHECK (role IN ('student', 'parent', 'tutor', 'admin')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. USER ROLES TABLE (audit-safe role store)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('student', 'parent', 'tutor', 'admin')),
  granted_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- ============================================================
-- 3. TUTOR APPLICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tutor_applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected')),
  full_name         TEXT NOT NULL,
  email             TEXT NOT NULL,
  phone             TEXT,
  national_id       TEXT,
  qualifications    TEXT NOT NULL,
  subjects          TEXT[] NOT NULL DEFAULT '{}',
  years_experience  INTEGER NOT NULL DEFAULT 0,
  certifications    TEXT,
  cv_url            TEXT,
  certificates_url  TEXT,
  references        TEXT,
  motivation        TEXT NOT NULL,
  admin_notes       TEXT,
  reviewed_by       UUID REFERENCES auth.users(id),
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. PARENT-STUDENT LINKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  relationship TEXT NOT NULL DEFAULT 'parent',
  approved_by  UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parent_id, student_id)
);

-- ============================================================
-- 5. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   UUID,
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_tutor_applications_updated_at
  BEFORE UPDATE ON public.tutor_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_parent_student_links_updated_at
  BEFORE UPDATE ON public.parent_student_links
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 8. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role TEXT;
BEGIN
  -- Use metadata to set role (only 'student' or 'parent' allowed at signup)
  _role := COALESCE(
    CASE
      WHEN NEW.raw_user_meta_data->>'role' = 'parent' THEN 'parent'
      ELSE 'student'
    END,
    'student'
  );

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    _role
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Audit log
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
  VALUES (NEW.id, 'user.signup', 'profile', NEW.id, jsonb_build_object('role', _role, 'email', NEW.email));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 9. APPROVE TUTOR FUNCTION (admin-only, server-side)
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_tutor_application(
  application_id UUID,
  admin_id       UUID,
  notes          TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id UUID;
  _admin_role TEXT;
BEGIN
  -- Verify caller is admin
  SELECT role INTO _admin_role FROM public.profiles WHERE id = admin_id;
  IF _admin_role <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  -- Get applicant
  SELECT user_id INTO _user_id FROM public.tutor_applications WHERE id = application_id;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Update application
  UPDATE public.tutor_applications
  SET status = 'approved', admin_notes = notes, reviewed_by = admin_id, reviewed_at = NOW()
  WHERE id = application_id;

  -- Upgrade role
  UPDATE public.profiles SET role = 'tutor' WHERE id = _user_id;

  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (_user_id, 'tutor', admin_id)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Notify applicant
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (_user_id, 'tutor_application_approved',
    'Application Approved',
    'Congratulations! Your tutor application has been approved. You now have access to the Tutor Dashboard.');

  -- Audit
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
  VALUES (admin_id, 'tutor.approve', 'tutor_application', application_id,
    jsonb_build_object('applicant_id', _user_id, 'notes', notes));
END;
$$;

-- ============================================================
-- 10. REJECT TUTOR FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_tutor_application(
  application_id UUID,
  admin_id       UUID,
  notes          TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id UUID;
  _admin_role TEXT;
BEGIN
  SELECT role INTO _admin_role FROM public.profiles WHERE id = admin_id;
  IF _admin_role <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  SELECT user_id INTO _user_id FROM public.tutor_applications WHERE id = application_id;

  UPDATE public.tutor_applications
  SET status = 'rejected', admin_notes = notes, reviewed_by = admin_id, reviewed_at = NOW()
  WHERE id = application_id;

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (_user_id, 'tutor_application_rejected',
    'Application Update',
    COALESCE('Your tutor application was not approved this time. Admin notes: ' || notes,
             'Your tutor application was not approved at this time.'));

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
  VALUES (admin_id, 'tutor.reject', 'tutor_application', application_id,
    jsonb_build_object('applicant_id', _user_id, 'notes', notes));
END;
$$;

-- ============================================================
-- 11. APPROVE PARENT-STUDENT LINK FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_parent_link(
  link_id    UUID,
  approver_id UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _link RECORD;
  _approver_role TEXT;
BEGIN
  SELECT role INTO _approver_role FROM public.profiles WHERE id = approver_id;

  SELECT * INTO _link FROM public.parent_student_links WHERE id = link_id;
  IF _link IS NULL THEN RAISE EXCEPTION 'Link not found'; END IF;

  -- Student approves their own link OR admin approves
  IF _approver_role <> 'admin' AND _link.student_id <> approver_id THEN
    RAISE EXCEPTION 'Unauthorized: must be the student or an admin';
  END IF;

  UPDATE public.parent_student_links
  SET status = 'approved', approved_by = approver_id
  WHERE id = link_id;

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (_link.parent_id, 'parent_link_approved',
    'Link Approved', 'Your request to monitor a student has been approved.');

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
  VALUES (approver_id, 'parent_link.approve', 'parent_student_link', link_id,
    jsonb_build_object('parent_id', _link.parent_id, 'student_id', _link.student_id));
END;
$$;
