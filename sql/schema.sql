-- ============================================================
-- EduSpark — Consolidated Production Schema
-- Generated: 2026-07-02
-- Replace all previous sql/*.sql files with this single file.
--
-- Safe to run on a fresh Supabase project.
-- For existing databases, run migrate_existing_users.sql AFTER this.
--
-- Execution order:
--   1. Extensions
--   2. Core tables
--   3. Feature tables
--   4. Advanced feature tables
--   5. Functions & triggers
--   6. RLS enable + policies
--   7. Indexes
--   8. Grants
-- ============================================================

-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. CORE TABLES
-- ============================================================

-- 1a. PROFILES (extends auth.users — one row per authenticated user)
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT        NOT NULL DEFAULT '',
  email               TEXT        NOT NULL DEFAULT '',
  phone               TEXT,
  role                TEXT        NOT NULL DEFAULT 'student'
                                  CHECK (role IN ('student', 'learner', 'parent', 'tutor', 'admin')),
  grade               TEXT,
  avatar_url          TEXT,
  -- parent_id: direct parent link (legacy; prefer parent_student_links for new code)
  parent_id           UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Promotion tracking
  current_academic_year TEXT,
  last_promotion_id   UUID,       -- FK added after promotions table is created (see below)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1b. USER ROLES (audit-safe secondary role store)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('student', 'learner', 'parent', 'tutor', 'admin')),
  granted_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- ============================================================
-- 2. ROLE-WORKFLOW TABLES
-- ============================================================

-- 2a. TUTOR APPLICATIONS
CREATE TABLE IF NOT EXISTS public.tutor_applications (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'approved', 'rejected')),
  full_name        TEXT        NOT NULL,
  email            TEXT        NOT NULL,
  phone            TEXT,
  national_id      TEXT,
  qualifications   TEXT        NOT NULL,
  subjects         TEXT[]      NOT NULL DEFAULT '{}',
  years_experience INTEGER     NOT NULL DEFAULT 0,
  certifications   TEXT,
  cv_url           TEXT,
  certificates_url TEXT,
  referees         TEXT,
  motivation       TEXT        NOT NULL,
  admin_notes      TEXT,
  reviewed_by      UUID        REFERENCES auth.users(id),
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2b. PARENT-STUDENT LINKS
CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'rejected')),
  relationship TEXT        NOT NULL DEFAULT 'parent',
  approved_by  UUID        REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parent_id, student_id)
);

-- 2c. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2d. AUDIT LOGS (immutable event trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID        REFERENCES auth.users(id),
  action      TEXT        NOT NULL,
  target_type TEXT,
  target_id   UUID,
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. CONTENT TABLES
-- ============================================================

-- 3a. VIDEOS
CREATE TABLE IF NOT EXISTS public.videos (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  subject          TEXT        NOT NULL,
  grade            TEXT        NOT NULL,
  topic            TEXT,
  url              TEXT        NOT NULL,
  description      TEXT,
  thumbnail_url    TEXT,
  duration_seconds INTEGER,
  is_published     BOOLEAN     NOT NULL DEFAULT TRUE,
  uploaded_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3b. VIDEO WATCHES (unique per user+video)
CREATE TABLE IF NOT EXISTS public.video_watches (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id   UUID        NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (video_id, user_id)
);

-- 3c. QUIZ RESULTS
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject    TEXT        NOT NULL,
  grade      TEXT        NOT NULL,
  score      INTEGER     NOT NULL,
  total      INTEGER     NOT NULL,
  percent    INTEGER     NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3d. PROGRESS (rolling per-subject average per user)
CREATE TABLE IF NOT EXISTS public.progress (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject    TEXT        NOT NULL,
  percent    INTEGER     NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, subject)
);

-- 3e. VISITS (site analytics)
CREATE TABLE IF NOT EXISTS public.visits (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  page       TEXT,
  user_id    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_agent TEXT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3f. STUDY MATERIALS (notes, past papers, revision guides)
CREATE TABLE IF NOT EXISTS public.study_materials (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT        NOT NULL CHECK (type IN ('note', 'past_paper', 'revision_guide')),
  subject    TEXT        NOT NULL,
  grade      TEXT        NOT NULL,
  topic      TEXT,
  title      TEXT        NOT NULL,
  year       TEXT,
  content    TEXT        NOT NULL,
  created_by UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. ADVANCED FEATURE TABLES
-- ============================================================

-- 4a. TOPIC PROGRESS (per-topic quiz competency tracking)
CREATE TABLE IF NOT EXISTS public.topic_progress (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject         TEXT        NOT NULL,
  grade           TEXT        NOT NULL,
  topic           TEXT        NOT NULL,
  attempts        INTEGER     NOT NULL DEFAULT 0,
  best_percent    INTEGER     NOT NULL DEFAULT 0,
  covered         BOOLEAN     NOT NULL DEFAULT FALSE,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, subject, grade, topic)
);

-- 4b. PROMOTIONS (end-of-year grade promotion decisions)
CREATE TABLE IF NOT EXISTS public.promotions (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID           NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_grade            TEXT           NOT NULL,
  to_grade              TEXT           NOT NULL,
  academic_year         TEXT           NOT NULL,
  quiz_average          NUMERIC(5,1),
  topics_covered_percent NUMERIC(5,1),
  decision              TEXT           NOT NULL CHECK (decision IN ('promoted', 'repeated')),
  decided_by            UUID           REFERENCES public.profiles(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Back-fill the FK on profiles now that promotions exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL;

-- ============================================================
-- 5. FUNCTIONS & TRIGGERS
-- ============================================================

-- 5a. Generic updated_at stamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at              ON public.profiles;
DROP TRIGGER IF EXISTS set_tutor_applications_updated_at   ON public.tutor_applications;
DROP TRIGGER IF EXISTS set_parent_student_links_updated_at ON public.parent_student_links;
DROP TRIGGER IF EXISTS set_study_materials_updated_at      ON public.study_materials;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_tutor_applications_updated_at
  BEFORE UPDATE ON public.tutor_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_parent_student_links_updated_at
  BEFORE UPDATE ON public.parent_student_links
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_study_materials_updated_at
  BEFORE UPDATE ON public.study_materials
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5b. Role helper (reads from DB, not JWT — prevents role spoofing)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 5c. Auto-create profile on Supabase Auth sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role TEXT;
BEGIN
  _role := CASE
    WHEN NEW.raw_user_meta_data->>'role' = 'parent' THEN 'parent'
    ELSE 'student'
  END;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    _role
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
  VALUES (NEW.id, 'user.signup', 'profile', NEW.id,
    jsonb_build_object('role', _role, 'email', COALESCE(NEW.email, '')));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5d. Approve tutor application (admin-only SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.approve_tutor_application(
  application_id UUID,
  admin_id       UUID,
  notes          TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id    UUID;
  _admin_role TEXT;
BEGIN
  SELECT role INTO _admin_role FROM public.profiles WHERE id = admin_id;
  IF _admin_role <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  SELECT user_id INTO _user_id FROM public.tutor_applications WHERE id = application_id;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  UPDATE public.tutor_applications
  SET status = 'approved', admin_notes = notes, reviewed_by = admin_id, reviewed_at = NOW()
  WHERE id = application_id;

  UPDATE public.profiles SET role = 'tutor' WHERE id = _user_id;

  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (_user_id, 'tutor', admin_id)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (_user_id, 'tutor_application_approved',
    'Application Approved',
    'Congratulations! Your tutor application has been approved. You now have access to the Tutor Dashboard.');

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
  VALUES (admin_id, 'tutor.approve', 'tutor_application', application_id,
    jsonb_build_object('applicant_id', _user_id, 'notes', notes));
END;
$$;

-- 5e. Reject tutor application (admin-only SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.reject_tutor_application(
  application_id UUID,
  admin_id       UUID,
  notes          TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id    UUID;
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
    COALESCE('Your tutor application was not approved. Admin notes: ' || notes,
             'Your tutor application was not approved at this time.'));

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
  VALUES (admin_id, 'tutor.reject', 'tutor_application', application_id,
    jsonb_build_object('applicant_id', _user_id, 'notes', notes));
END;
$$;

-- 5f. Approve parent-student link (student or admin SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.approve_parent_link(
  link_id     UUID,
  approver_id UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _link          RECORD;
  _approver_role TEXT;
BEGIN
  SELECT role INTO _approver_role FROM public.profiles WHERE id = approver_id;
  SELECT * INTO _link FROM public.parent_student_links WHERE id = link_id;

  IF _link IS NULL THEN RAISE EXCEPTION 'Link not found'; END IF;

  IF _approver_role <> 'admin' AND _link.student_id <> approver_id THEN
    RAISE EXCEPTION 'Unauthorized: must be the linked student or an admin';
  END IF;

  UPDATE public.parent_student_links
  SET status = 'approved', approved_by = approver_id
  WHERE id = link_id;

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (_link.parent_id, 'parent_link_approved',
    'Link Approved',
    'Your request to monitor a student has been approved.');

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
  VALUES (approver_id, 'parent_link.approve', 'parent_student_link', link_id,
    jsonb_build_object('parent_id', _link.parent_id, 'student_id', _link.student_id));
END;
$$;

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_watches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions          ENABLE ROW LEVEL SECURITY;

-- ── profiles ──────────────────────────────────────────────
DO $$ BEGIN
  -- Drop old policies that may conflict before recreating
  DROP POLICY IF EXISTS "profiles: own read"                ON public.profiles;
  DROP POLICY IF EXISTS "profiles: own update"              ON public.profiles;
  DROP POLICY IF EXISTS "profiles: admin update"            ON public.profiles;
  DROP POLICY IF EXISTS "profiles: no direct insert"        ON public.profiles;
  DROP POLICY IF EXISTS "profiles: tutor read students"     ON public.profiles;
  DROP POLICY IF EXISTS "Users can view own profile"        ON public.profiles;
  DROP POLICY IF EXISTS "Admins can view all profiles"      ON public.profiles;
  DROP POLICY IF EXISTS "Authenticated users can view learner profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile"      ON public.profiles;
  DROP POLICY IF EXISTS "Parents can link themselves to a learner" ON public.profiles;
  DROP POLICY IF EXISTS "Insert on signup"                  ON public.profiles;
  DROP POLICY IF EXISTS "Parents can view their children"   ON public.profiles;
END $$;

-- Users read their own profile; admins read all; tutors & parents see relevant students
CREATE POLICY "profiles: select"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR get_my_role() = 'admin'
    OR get_my_role() = 'tutor'
    OR (
      get_my_role() = 'parent'
      AND (
        parent_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.parent_student_links
          WHERE parent_id = auth.uid() AND student_id = profiles.id AND status = 'approved'
        )
      )
    )
  );

-- Users update own profile but cannot self-promote role
CREATE POLICY "profiles: own update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Admins can update any profile (role changes, promotions, etc.)
CREATE POLICY "profiles: admin update"
  ON public.profiles FOR UPDATE
  USING (get_my_role() = 'admin');

-- No direct insert — handle_new_user trigger manages this
CREATE POLICY "profiles: no direct insert"
  ON public.profiles FOR INSERT
  WITH CHECK (FALSE);

-- ── user_roles ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "user_roles: own read"          ON public.user_roles;
  DROP POLICY IF EXISTS "user_roles: admin only write"  ON public.user_roles;
END $$;

CREATE POLICY "user_roles: select"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR get_my_role() = 'admin');

CREATE POLICY "user_roles: admin write"
  ON public.user_roles FOR ALL
  USING (get_my_role() = 'admin');

-- ── tutor_applications ─────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "tutor_applications: own read"    ON public.tutor_applications;
  DROP POLICY IF EXISTS "tutor_applications: own insert"  ON public.tutor_applications;
  DROP POLICY IF EXISTS "tutor_applications: admin update" ON public.tutor_applications;
  DROP POLICY IF EXISTS "tutor_applications: no delete"   ON public.tutor_applications;
  DROP POLICY IF EXISTS "Users can view own applications" ON public.tutor_applications;
  DROP POLICY IF EXISTS "Users can submit own applications" ON public.tutor_applications;
  DROP POLICY IF EXISTS "Admins can view all applications" ON public.tutor_applications;
  DROP POLICY IF EXISTS "Admins can update applications"  ON public.tutor_applications;
END $$;

CREATE POLICY "tutor_applications: select"
  ON public.tutor_applications FOR SELECT
  USING (auth.uid() = user_id OR get_my_role() = 'admin');

CREATE POLICY "tutor_applications: insert"
  ON public.tutor_applications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.tutor_applications
      WHERE user_id = auth.uid() AND status = 'pending'
    )
  );

CREATE POLICY "tutor_applications: admin update"
  ON public.tutor_applications FOR UPDATE
  USING (get_my_role() = 'admin');

-- Immutable audit record — no deletes allowed
CREATE POLICY "tutor_applications: no delete"
  ON public.tutor_applications FOR DELETE
  USING (FALSE);

-- ── parent_student_links ───────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "parent_student_links: read"         ON public.parent_student_links;
  DROP POLICY IF EXISTS "parent_student_links: parent insert" ON public.parent_student_links;
  DROP POLICY IF EXISTS "parent_student_links: update"       ON public.parent_student_links;
  DROP POLICY IF EXISTS "parent_student_links: admin delete" ON public.parent_student_links;
END $$;

CREATE POLICY "parent_student_links: select"
  ON public.parent_student_links FOR SELECT
  USING (
    auth.uid() = parent_id
    OR auth.uid() = student_id
    OR get_my_role() = 'admin'
  );

CREATE POLICY "parent_student_links: parent insert"
  ON public.parent_student_links FOR INSERT
  WITH CHECK (auth.uid() = parent_id AND get_my_role() = 'parent');

CREATE POLICY "parent_student_links: update"
  ON public.parent_student_links FOR UPDATE
  USING (get_my_role() = 'admin' OR auth.uid() = student_id);

CREATE POLICY "parent_student_links: admin delete"
  ON public.parent_student_links FOR DELETE
  USING (get_my_role() = 'admin');

-- ── notifications ──────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "notifications: own read"        ON public.notifications;
  DROP POLICY IF EXISTS "notifications: own update"      ON public.notifications;
  DROP POLICY IF EXISTS "notifications: no direct insert" ON public.notifications;
  DROP POLICY IF EXISTS "notifications: own delete"      ON public.notifications;
END $$;

CREATE POLICY "notifications: select"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Allow authenticated users to insert notifications for others
-- (used by ParentDashboard when sending link request notification to student)
CREATE POLICY "notifications: authenticated insert"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "notifications: own update"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications: own delete"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ── audit_logs ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "audit_logs: admin read"      ON public.audit_logs;
  DROP POLICY IF EXISTS "audit_logs: no direct write" ON public.audit_logs;
  DROP POLICY IF EXISTS "audit_logs: no delete"       ON public.audit_logs;
END $$;

CREATE POLICY "audit_logs: admin read"
  ON public.audit_logs FOR SELECT
  USING (get_my_role() = 'admin');

CREATE POLICY "audit_logs: no direct write"
  ON public.audit_logs FOR INSERT
  WITH CHECK (FALSE);

CREATE POLICY "audit_logs: no delete"
  ON public.audit_logs FOR DELETE
  USING (FALSE);

-- ── videos ─────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view videos"             ON public.videos;
  DROP POLICY IF EXISTS "Tutors and admins can insert videos" ON public.videos;
  DROP POLICY IF EXISTS "Uploader or admin can delete videos" ON public.videos;
  DROP POLICY IF EXISTS "Anyone can view published videos"   ON public.videos;
  DROP POLICY IF EXISTS "Admins can manage all videos"       ON public.videos;
  DROP POLICY IF EXISTS "Admins can insert videos"           ON public.videos;
  DROP POLICY IF EXISTS "Admins can delete videos"           ON public.videos;
END $$;

CREATE POLICY "videos: select"
  ON public.videos FOR SELECT
  USING (is_published = TRUE OR get_my_role() IN ('tutor', 'admin'));

CREATE POLICY "videos: insert"
  ON public.videos FOR INSERT
  WITH CHECK (get_my_role() IN ('tutor', 'admin'));

CREATE POLICY "videos: update"
  ON public.videos FOR UPDATE
  USING (uploaded_by = auth.uid() OR get_my_role() = 'admin');

CREATE POLICY "videos: delete"
  ON public.videos FOR DELETE
  USING (uploaded_by = auth.uid() OR get_my_role() = 'admin');

-- ── video_watches ──────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users manage own watch history"    ON public.video_watches;
  DROP POLICY IF EXISTS "Learners manage own watches"       ON public.video_watches;
  DROP POLICY IF EXISTS "Learners can manage own watches"   ON public.video_watches;
  DROP POLICY IF EXISTS "Admins can view all watches"       ON public.video_watches;
END $$;

CREATE POLICY "video_watches: own"
  ON public.video_watches FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "video_watches: admin select"
  ON public.video_watches FOR SELECT
  USING (get_my_role() = 'admin');

-- ── quiz_results ───────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users view own quiz results"       ON public.quiz_results;
  DROP POLICY IF EXISTS "Users insert own quiz results"     ON public.quiz_results;
  DROP POLICY IF EXISTS "Admins see all quiz results"       ON public.quiz_results;
  DROP POLICY IF EXISTS "Authenticated users see quiz results for leaderboard" ON public.quiz_results;
  DROP POLICY IF EXISTS "Users see own quiz results"        ON public.quiz_results;
  DROP POLICY IF EXISTS "Learners can manage own results"   ON public.quiz_results;
  DROP POLICY IF EXISTS "Parents can view children results" ON public.quiz_results;
  DROP POLICY IF EXISTS "Admins can view all results"       ON public.quiz_results;
END $$;

-- Leaderboard requires authenticated users to see all quiz_results
CREATE POLICY "quiz_results: select"
  ON public.quiz_results FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "quiz_results: own insert"
  ON public.quiz_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── progress ───────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users see own progress"       ON public.progress;
  DROP POLICY IF EXISTS "Users upsert own progress"    ON public.progress;
  DROP POLICY IF EXISTS "Parents see children progress" ON public.progress;
  DROP POLICY IF EXISTS "Admins see all progress"      ON public.progress;
  DROP POLICY IF EXISTS "Learners can manage own progress" ON public.progress;
  DROP POLICY IF EXISTS "Parents can view children progress" ON public.progress;
  DROP POLICY IF EXISTS "Admins can view all progress" ON public.progress;
END $$;

CREATE POLICY "progress: own"
  ON public.progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "progress: parent select"
  ON public.progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE parent_id = auth.uid() AND student_id = progress.user_id AND status = 'approved'
    )
  );

CREATE POLICY "progress: admin select"
  ON public.progress FOR SELECT
  USING (get_my_role() = 'admin');

-- ── visits ─────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can insert visit"  ON public.visits;
  DROP POLICY IF EXISTS "Admins see all visits"    ON public.visits;
  DROP POLICY IF EXISTS "Admins can view all visits" ON public.visits;
  DROP POLICY IF EXISTS "Anyone can insert visits" ON public.visits;
END $$;

CREATE POLICY "visits: insert"
  ON public.visits FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "visits: admin select"
  ON public.visits FOR SELECT
  USING (get_my_role() = 'admin');

-- ── study_materials ────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view study materials"  ON public.study_materials;
  DROP POLICY IF EXISTS "Admins manage study materials"    ON public.study_materials;
  DROP POLICY IF EXISTS "Admins update study materials"    ON public.study_materials;
  DROP POLICY IF EXISTS "Admins delete study materials"    ON public.study_materials;
END $$;

CREATE POLICY "study_materials: select"
  ON public.study_materials FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "study_materials: admin insert"
  ON public.study_materials FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "study_materials: admin update"
  ON public.study_materials FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "study_materials: admin delete"
  ON public.study_materials FOR DELETE
  USING (get_my_role() = 'admin');

-- ── topic_progress ─────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Learners manage own topic progress"  ON public.topic_progress;
  DROP POLICY IF EXISTS "Parents view children topic progress" ON public.topic_progress;
  DROP POLICY IF EXISTS "Admins view all topic progress"      ON public.topic_progress;
END $$;

CREATE POLICY "topic_progress: own"
  ON public.topic_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "topic_progress: parent select"
  ON public.topic_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE parent_id = auth.uid() AND student_id = topic_progress.user_id AND status = 'approved'
    )
  );

CREATE POLICY "topic_progress: admin select"
  ON public.topic_progress FOR SELECT
  USING (get_my_role() = 'admin');

-- ── promotions ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Learners view own promotions"        ON public.promotions;
  DROP POLICY IF EXISTS "Learners record own promotion decision" ON public.promotions;
  DROP POLICY IF EXISTS "Parents view children promotions"    ON public.promotions;
  DROP POLICY IF EXISTS "Admins manage promotions"            ON public.promotions;
END $$;

CREATE POLICY "promotions: select"
  ON public.promotions FOR SELECT
  USING (
    auth.uid() = user_id
    OR get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE parent_id = auth.uid() AND student_id = promotions.user_id AND status = 'approved'
    )
  );

CREATE POLICY "promotions: admin write"
  ON public.promotions FOR ALL
  USING (get_my_role() = 'admin');

-- ============================================================
-- 7. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role                  ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_email                 ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_parent_id             ON public.profiles (parent_id);
CREATE INDEX IF NOT EXISTS idx_tutor_apps_user_id             ON public.tutor_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_apps_status              ON public.tutor_applications (status);
CREATE INDEX IF NOT EXISTS idx_psl_parent_id                  ON public.parent_student_links (parent_id);
CREATE INDEX IF NOT EXISTS idx_psl_student_id                 ON public.parent_student_links (student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id          ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor               ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_subject_grade           ON public.videos (subject, grade);
CREATE INDEX IF NOT EXISTS idx_video_watches_user_id          ON public.video_watches (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id           ON public.quiz_results (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_subject_grade     ON public.quiz_results (subject, grade);
CREATE INDEX IF NOT EXISTS idx_progress_user_id               ON public.progress (user_id);
CREATE INDEX IF NOT EXISTS idx_visits_visited_at              ON public.visits (visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_materials_lookup         ON public.study_materials (subject, grade, type);
CREATE INDEX IF NOT EXISTS idx_topic_progress_user_grade      ON public.topic_progress (user_id, grade);
CREATE INDEX IF NOT EXISTS idx_promotions_user_id             ON public.promotions (user_id);

-- ============================================================
-- 8. GRANTS
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL   ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL   ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL   ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.profiles, public.user_roles, public.tutor_applications,
     public.parent_student_links, public.notifications, public.videos,
     public.video_watches, public.quiz_results, public.progress, public.visits,
     public.study_materials, public.topic_progress, public.promotions
  TO authenticated;

-- audit_logs: authenticated can only read via RLS (admin-only); no insert from client
GRANT SELECT ON public.audit_logs TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_role()                TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.approve_tutor_application    TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_tutor_application     TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_parent_link          TO authenticated;

