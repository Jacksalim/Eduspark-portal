-- ============================================================
-- EduSpark — Row Level Security Policies
-- Run AFTER 01_schema.sql
-- ============================================================

-- ============================================================
-- HELPER: get_my_role() — reads from profiles, not JWT metadata
-- Avoids role spoofing via modified JWT claims
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- PROFILES — RLS
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users read their own profile; admins read all
CREATE POLICY "profiles: own read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR get_my_role() = 'admin');

-- Users update their own profile (cannot change own role)
CREATE POLICY "profiles: own update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Admins can update any profile (including role changes)
CREATE POLICY "profiles: admin update"
  ON public.profiles FOR UPDATE
  USING (get_my_role() = 'admin');

-- No public insert (handle_new_user trigger handles it)
CREATE POLICY "profiles: no direct insert"
  ON public.profiles FOR INSERT
  WITH CHECK (FALSE);

-- Tutors & parents need to see student profiles for linked data
CREATE POLICY "profiles: tutor read students"
  ON public.profiles FOR SELECT
  USING (
    get_my_role() = 'tutor'
    OR (
      get_my_role() = 'parent'
      AND EXISTS (
        SELECT 1 FROM public.parent_student_links
        WHERE parent_id = auth.uid()
          AND student_id = profiles.id
          AND status = 'approved'
      )
    )
  );

-- ============================================================
-- USER_ROLES — RLS
-- ============================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles: own read"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR get_my_role() = 'admin');

-- Only admins (via SECURITY DEFINER functions) can insert/update
CREATE POLICY "user_roles: admin only write"
  ON public.user_roles FOR ALL
  USING (get_my_role() = 'admin');

-- ============================================================
-- TUTOR APPLICATIONS — RLS
-- ============================================================
ALTER TABLE public.tutor_applications ENABLE ROW LEVEL SECURITY;

-- Own application: read
CREATE POLICY "tutor_applications: own read"
  ON public.tutor_applications FOR SELECT
  USING (auth.uid() = user_id OR get_my_role() = 'admin');

-- Own application: insert (once per user per open application)
CREATE POLICY "tutor_applications: own insert"
  ON public.tutor_applications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.tutor_applications
      WHERE user_id = auth.uid() AND status = 'pending'
    )
  );

-- Admins update (approve/reject) only; applicants cannot modify once submitted
CREATE POLICY "tutor_applications: admin update"
  ON public.tutor_applications FOR UPDATE
  USING (get_my_role() = 'admin');

-- No deletes by anyone (audit integrity)
CREATE POLICY "tutor_applications: no delete"
  ON public.tutor_applications FOR DELETE
  USING (FALSE);

-- ============================================================
-- PARENT_STUDENT_LINKS — RLS
-- ============================================================
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- Parent sees their own links; student sees links to them; admin sees all
CREATE POLICY "parent_student_links: read"
  ON public.parent_student_links FOR SELECT
  USING (
    auth.uid() = parent_id
    OR auth.uid() = student_id
    OR get_my_role() = 'admin'
  );

-- Only parents insert link requests (to themselves)
CREATE POLICY "parent_student_links: parent insert"
  ON public.parent_student_links FOR INSERT
  WITH CHECK (
    auth.uid() = parent_id
    AND get_my_role() = 'parent'
  );

-- Admins update (approve/reject); students approve their own links
-- (actual enforcement in approve_parent_link SECURITY DEFINER function)
CREATE POLICY "parent_student_links: update"
  ON public.parent_student_links FOR UPDATE
  USING (
    get_my_role() = 'admin'
    OR auth.uid() = student_id
  );

-- Only admins can remove links
CREATE POLICY "parent_student_links: admin delete"
  ON public.parent_student_links FOR DELETE
  USING (get_my_role() = 'admin');

-- ============================================================
-- NOTIFICATIONS — RLS
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users only see their own notifications
CREATE POLICY "notifications: own read"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own as read
CREATE POLICY "notifications: own update"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No user-initiated inserts (done by SECURITY DEFINER functions)
CREATE POLICY "notifications: no direct insert"
  ON public.notifications FOR INSERT
  WITH CHECK (FALSE);

-- Users can delete their own notifications
CREATE POLICY "notifications: own delete"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- AUDIT LOGS — RLS
-- ============================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "audit_logs: admin read"
  ON public.audit_logs FOR SELECT
  USING (get_my_role() = 'admin');

-- No one can write audit logs directly (SECURITY DEFINER functions only)
CREATE POLICY "audit_logs: no direct write"
  ON public.audit_logs FOR INSERT
  WITH CHECK (FALSE);

-- No deletes — immutable audit trail
CREATE POLICY "audit_logs: no delete"
  ON public.audit_logs FOR DELETE
  USING (FALSE);

-- ============================================================
-- INDEXES (performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_tutor_applications_user_id ON public.tutor_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_applications_status ON public.tutor_applications (status);
CREATE INDEX IF NOT EXISTS idx_parent_student_links_parent ON public.parent_student_links (parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_links_student ON public.parent_student_links (student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_id, created_at DESC);

-- ============================================================
-- STORAGE BUCKETS (run separately if using Supabase Storage)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('tutor-documents', 'tutor-documents', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
--
-- Storage RLS for tutor-documents:
-- CREATE POLICY "tutor docs: owner upload"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'tutor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "tutor docs: admin read"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'tutor-documents' AND (
--     auth.uid()::text = (storage.foldername(name))[1]
--     OR get_my_role() = 'admin'
--   ));
