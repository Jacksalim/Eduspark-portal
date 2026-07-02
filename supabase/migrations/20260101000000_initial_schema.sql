-- ============================================================
-- EduSpark — Initial Schema Migration
-- Supabase CLI migration: supabase db push
--
-- This file is the authoritative source of truth for the
-- production database schema. It is identical to sql/schema.sql
-- and is safe to re-run (idempotent).
-- ============================================================

-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT        NOT NULL DEFAULT '',
  email                 TEXT        NOT NULL DEFAULT '',
  phone                 TEXT,
  role                  TEXT        NOT NULL DEFAULT 'student'
                                    CHECK (role IN ('student', 'learner', 'parent', 'tutor', 'admin')),
  grade                 TEXT,
  avatar_url            TEXT,
  parent_id             UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  current_academic_year TEXT,
  last_promotion_id     UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('student', 'learner', 'parent', 'tutor', 'admin')),
  granted_by UUID        REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- ============================================================
-- 2. ROLE-WORKFLOW TABLES
-- ============================================================

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

CREATE TABLE IF NOT EXISTS public.video_watches (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id   UUID        NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (video_id, user_id)
);

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

CREATE TABLE IF NOT EXISTS public.progress (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject    TEXT        NOT NULL,
  percent    INTEGER     NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, subject)
);

CREATE TABLE IF NOT EXISTS public.visits (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  page       TEXT,
  user_id    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_agent TEXT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.promotions (
  id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID           NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_grade             TEXT           NOT NULL,
  to_grade               TEXT           NOT NULL,
  academic_year          TEXT           NOT NULL,
  quiz_average           NUMERIC(5,1),
  topics_covered_percent NUMERIC(5,1),
  decision               TEXT           NOT NULL CHECK (decision IN ('promoted', 'repeated')),
  decided_by             UUID           REFERENCES public.profiles(id),
  notes                  TEXT,
  created_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Back-fill the FK on profiles now that promotions table exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL;

-- ============================================================
-- 5. FUNCTIONS & TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at              ON public.profiles;
DROP TRIGGER IF EXISTS set_tutor_applications_updated_at   ON public.tutor_applications;
DROP TRIGGER IF EXISTS set_parent_student_links_updated_at ON public.parent_student_links;
DROP TRIGGER IF EXISTS set_study_materials_updated_at      ON public.study_materials;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_tutor_applications_updated_at
  BEFORE UPDATE ON public.tutor_applications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_parent_student_links_updated_at
  BEFORE UPDATE ON public.parent_student_links FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_study_materials_updated_at
  BEFORE UPDATE ON public.study_materials FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _role TEXT;
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
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
  VALUES (NEW.id, 'user.signup', 'profile', NEW.id,
    jsonb_build_object('role', _role, 'email', COALESCE(NEW.email, '')));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.approve_tutor_application(
  application_id UUID, admin_id UUID, notes TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user_id UUID; _admin_role TEXT;
BEGIN
  SELECT role INTO _admin_role FROM public.profiles WHERE id = admin_id;
  IF _admin_role <> 'admin' THEN RAISE EXCEPTION 'Unauthorized: admin role required'; END IF;
  SELECT user_id INTO _user_id FROM public.tutor_applications WHERE id = application_id;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  UPDATE public.tutor_applications
    SET status = 'approved', admin_notes = notes, reviewed_by = admin_id, reviewed_at = NOW()
    WHERE id = application_id;
  UPDATE public.profiles SET role = 'tutor' WHERE id = _user_id;
  INSERT INTO public.user_roles (user_id, role, granted_by) VALUES (_user_id, 'tutor', admin_id)
    ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (_user_id, 'tutor_application_approved', 'Application Approved',
    'Congratulations! Your tutor application has been approved.');
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
  VALUES (admin_id, 'tutor.approve', 'tutor_application', application_id,
    jsonb_build_object('applicant_id', _user_id, 'notes', notes));
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_tutor_application(
  application_id UUID, admin_id UUID, notes TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user_id UUID; _admin_role TEXT;
BEGIN
  SELECT role INTO _admin_role FROM public.profiles WHERE id = admin_id;
  IF _admin_role <> 'admin' THEN RAISE EXCEPTION 'Unauthorized: admin role required'; END IF;
  SELECT user_id INTO _user_id FROM public.tutor_applications WHERE id = application_id;
  UPDATE public.tutor_applications
    SET status = 'rejected', admin_notes = notes, reviewed_by = admin_id, reviewed_at = NOW()
    WHERE id = application_id;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (_user_id, 'tutor_application_rejected', 'Application Update',
    COALESCE('Application not approved. Notes: ' || notes, 'Your application was not approved.'));
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
  VALUES (admin_id, 'tutor.reject', 'tutor_application', application_id,
    jsonb_build_object('applicant_id', _user_id, 'notes', notes));
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_parent_link(link_id UUID, approver_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _link RECORD; _approver_role TEXT;
BEGIN
  SELECT role INTO _approver_role FROM public.profiles WHERE id = approver_id;
  SELECT * INTO _link FROM public.parent_student_links WHERE id = link_id;
  IF _link IS NULL THEN RAISE EXCEPTION 'Link not found'; END IF;
  IF _approver_role <> 'admin' AND _link.student_id <> approver_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.parent_student_links
    SET status = 'approved', approved_by = approver_id WHERE id = link_id;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (_link.parent_id, 'parent_link_approved', 'Link Approved',
    'Your request to monitor a student has been approved.');
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
  VALUES (approver_id, 'parent_link.approve', 'parent_student_link', link_id,
    jsonb_build_object('parent_id', _link.parent_id, 'student_id', _link.student_id));
END;
$$;

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_applications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_watches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_progress       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions           ENABLE ROW LEVEL SECURITY;

-- Drop all old policies before recreating (idempotent)
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- profiles
CREATE POLICY "profiles: select" ON public.profiles FOR SELECT USING (
  auth.uid() = id OR get_my_role() = 'admin' OR get_my_role() = 'tutor'
  OR (get_my_role() = 'parent' AND (
    parent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.parent_student_links
               WHERE parent_id = auth.uid() AND student_id = profiles.id AND status = 'approved')
  ))
);
CREATE POLICY "profiles: own update" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "profiles: admin update" ON public.profiles FOR UPDATE USING (get_my_role() = 'admin');
CREATE POLICY "profiles: no insert"   ON public.profiles FOR INSERT WITH CHECK (FALSE);

-- user_roles
CREATE POLICY "user_roles: select"      ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR get_my_role() = 'admin');
CREATE POLICY "user_roles: admin write" ON public.user_roles FOR ALL   USING (get_my_role() = 'admin');

-- tutor_applications
CREATE POLICY "tutor_apps: select"       ON public.tutor_applications FOR SELECT USING (auth.uid() = user_id OR get_my_role() = 'admin');
CREATE POLICY "tutor_apps: insert"       ON public.tutor_applications FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (SELECT 1 FROM public.tutor_applications WHERE user_id = auth.uid() AND status = 'pending')
);
CREATE POLICY "tutor_apps: admin update" ON public.tutor_applications FOR UPDATE USING (get_my_role() = 'admin');
CREATE POLICY "tutor_apps: no delete"    ON public.tutor_applications FOR DELETE USING (FALSE);

-- parent_student_links
CREATE POLICY "psl: select"         ON public.parent_student_links FOR SELECT USING (auth.uid() = parent_id OR auth.uid() = student_id OR get_my_role() = 'admin');
CREATE POLICY "psl: parent insert"  ON public.parent_student_links FOR INSERT WITH CHECK (auth.uid() = parent_id AND get_my_role() = 'parent');
CREATE POLICY "psl: update"         ON public.parent_student_links FOR UPDATE USING (get_my_role() = 'admin' OR auth.uid() = student_id);
CREATE POLICY "psl: admin delete"   ON public.parent_student_links FOR DELETE USING (get_my_role() = 'admin');

-- notifications
CREATE POLICY "notif: select"               ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif: authenticated insert" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "notif: own update"           ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif: own delete"           ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- audit_logs
CREATE POLICY "audit: admin read"    ON public.audit_logs FOR SELECT USING (get_my_role() = 'admin');
CREATE POLICY "audit: no insert"     ON public.audit_logs FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "audit: no delete"     ON public.audit_logs FOR DELETE USING (FALSE);

-- videos
CREATE POLICY "videos: select"  ON public.videos FOR SELECT USING (is_published = TRUE OR get_my_role() IN ('tutor', 'admin'));
CREATE POLICY "videos: insert"  ON public.videos FOR INSERT WITH CHECK (get_my_role() IN ('tutor', 'admin'));
CREATE POLICY "videos: update"  ON public.videos FOR UPDATE USING (uploaded_by = auth.uid() OR get_my_role() = 'admin');
CREATE POLICY "videos: delete"  ON public.videos FOR DELETE USING (uploaded_by = auth.uid() OR get_my_role() = 'admin');

-- video_watches
CREATE POLICY "watches: own"          ON public.video_watches FOR ALL    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watches: admin select" ON public.video_watches FOR SELECT USING (get_my_role() = 'admin');

-- quiz_results
CREATE POLICY "qr: select"     ON public.quiz_results FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "qr: own insert" ON public.quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- progress
CREATE POLICY "progress: own"          ON public.progress FOR ALL    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress: parent select" ON public.progress FOR SELECT USING (EXISTS (SELECT 1 FROM public.parent_student_links WHERE parent_id = auth.uid() AND student_id = progress.user_id AND status = 'approved'));
CREATE POLICY "progress: admin select"  ON public.progress FOR SELECT USING (get_my_role() = 'admin');

-- visits
CREATE POLICY "visits: insert"       ON public.visits FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "visits: admin select" ON public.visits FOR SELECT USING (get_my_role() = 'admin');

-- study_materials
CREATE POLICY "sm: select"        ON public.study_materials FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "sm: admin insert"  ON public.study_materials FOR INSERT WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "sm: admin update"  ON public.study_materials FOR UPDATE USING (get_my_role() = 'admin');
CREATE POLICY "sm: admin delete"  ON public.study_materials FOR DELETE USING (get_my_role() = 'admin');

-- topic_progress
CREATE POLICY "tp: own"           ON public.topic_progress FOR ALL    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tp: parent select" ON public.topic_progress FOR SELECT USING (EXISTS (SELECT 1 FROM public.parent_student_links WHERE parent_id = auth.uid() AND student_id = topic_progress.user_id AND status = 'approved'));
CREATE POLICY "tp: admin select"  ON public.topic_progress FOR SELECT USING (get_my_role() = 'admin');

-- promotions
CREATE POLICY "prom: select"      ON public.promotions FOR SELECT USING (
  auth.uid() = user_id OR get_my_role() = 'admin'
  OR EXISTS (SELECT 1 FROM public.parent_student_links WHERE parent_id = auth.uid() AND student_id = promotions.user_id AND status = 'approved')
);
CREATE POLICY "prom: admin write" ON public.promotions FOR ALL USING (get_my_role() = 'admin');

-- ============================================================
-- 7. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role              ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_email             ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_parent_id         ON public.profiles (parent_id);
CREATE INDEX IF NOT EXISTS idx_tutor_apps_user_id         ON public.tutor_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_apps_status          ON public.tutor_applications (status);
CREATE INDEX IF NOT EXISTS idx_psl_parent_id              ON public.parent_student_links (parent_id);
CREATE INDEX IF NOT EXISTS idx_psl_student_id             ON public.parent_student_links (student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user         ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_actor                ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_subject_grade       ON public.videos (subject, grade);
CREATE INDEX IF NOT EXISTS idx_video_watches_user         ON public.video_watches (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user          ON public.quiz_results (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_subject_grade ON public.quiz_results (subject, grade);
CREATE INDEX IF NOT EXISTS idx_progress_user              ON public.progress (user_id);
CREATE INDEX IF NOT EXISTS idx_visits_at                  ON public.visits (visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_materials_lookup     ON public.study_materials (subject, grade, type);
CREATE INDEX IF NOT EXISTS idx_topic_progress_user_grade  ON public.topic_progress (user_id, grade);
CREATE INDEX IF NOT EXISTS idx_promotions_user            ON public.promotions (user_id);

-- ============================================================
-- 8. GRANTS
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL   ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL   ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL   ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.profiles, public.user_roles, public.tutor_applications,
  public.parent_student_links, public.notifications, public.videos,
  public.video_watches, public.quiz_results, public.progress, public.visits,
  public.study_materials, public.topic_progress, public.promotions
TO authenticated;

GRANT SELECT ON public.audit_logs TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_role()             TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.approve_tutor_application TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_tutor_application  TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_parent_link       TO authenticated;
