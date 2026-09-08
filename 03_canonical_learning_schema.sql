-- ============================================================
-- EduSpark — Canonical learning tables
-- Run AFTER 01_schema.sql and 02_rls_policies.sql.
--
-- This migration completes the 01/02 auth lineage used by the
-- active React app. It intentionally does not merge schema.sql
-- or supabase-schema.sql automatically.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grade TEXT,
  ADD COLUMN IF NOT EXISTS current_academic_year TEXT,
  ADD COLUMN IF NOT EXISTS last_promotion_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_grade_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_grade_check
      CHECK (grade IS NULL OR grade IN ('R','1','2','3','4','5','6','7','8','9','10','11','12'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.videos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  subject      TEXT NOT NULL,
  grade        TEXT NOT NULL,
  topic        TEXT,
  url          TEXT NOT NULL,
  description  TEXT,
  uploaded_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.video_watches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id   UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (video_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.quiz_results (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject    TEXT NOT NULL,
  grade      TEXT NOT NULL,
  score      INTEGER NOT NULL CHECK (score >= 0),
  total      INTEGER NOT NULL CHECK (total > 0),
  percent    INTEGER NOT NULL CHECK (percent >= 0 AND percent <= 100),
  questions  JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quiz_results_grade_check'
      AND conrelid = 'public.quiz_results'::regclass
  ) THEN
    ALTER TABLE public.quiz_results
      ADD CONSTRAINT quiz_results_grade_check
      CHECK (grade IN ('R','1','2','3','4','5','6','7','8','9','10','11','12'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.progress (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject    TEXT NOT NULL,
  percent    INTEGER NOT NULL DEFAULT 0 CHECK (percent >= 0 AND percent <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, subject)
);

CREATE TABLE IF NOT EXISTS public.visits (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page       TEXT NOT NULL,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_agent TEXT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_subject_grade ON public.videos (subject, grade);
CREATE INDEX IF NOT EXISTS idx_video_watches_user ON public.video_watches (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON public.quiz_results (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_filter ON public.quiz_results (subject, grade, percent DESC);
CREATE INDEX IF NOT EXISTS idx_progress_user ON public.progress (user_id);
CREATE INDEX IF NOT EXISTS idx_visits_created ON public.visits (visited_at DESC);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "canonical videos read" ON public.videos;
CREATE POLICY "canonical videos read" ON public.videos FOR SELECT
  USING (is_published = TRUE OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "canonical videos admin write" ON public.videos;
CREATE POLICY "canonical videos admin write" ON public.videos FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "canonical video watches own" ON public.video_watches;
CREATE POLICY "canonical video watches own" ON public.video_watches FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "canonical quiz results read" ON public.quiz_results;
CREATE POLICY "canonical quiz results read" ON public.quiz_results FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.get_my_role() IN ('admin', 'tutor')
    OR (
      public.get_my_role() = 'parent'
      AND EXISTS (
        SELECT 1
        FROM public.parent_student_links l
        WHERE l.parent_id = auth.uid()
          AND l.student_id = quiz_results.user_id
          AND l.status = 'approved'
      )
    )
  );

DROP POLICY IF EXISTS "canonical quiz results insert" ON public.quiz_results;
CREATE POLICY "canonical quiz results insert" ON public.quiz_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "canonical progress own" ON public.progress;
CREATE POLICY "canonical progress own" ON public.progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "canonical progress linked parent read" ON public.progress;
CREATE POLICY "canonical progress linked parent read" ON public.progress FOR SELECT
  USING (
    public.get_my_role() IN ('admin', 'tutor')
    OR (
      public.get_my_role() = 'parent'
      AND EXISTS (
        SELECT 1
        FROM public.parent_student_links l
        WHERE l.parent_id = auth.uid()
          AND l.student_id = progress.user_id
          AND l.status = 'approved'
      )
    )
  );

DROP POLICY IF EXISTS "canonical visits insert" ON public.visits;
CREATE POLICY "canonical visits insert" ON public.visits FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "canonical visits admin read" ON public.visits;
CREATE POLICY "canonical visits admin read" ON public.visits FOR SELECT
  USING (public.get_my_role() = 'admin');