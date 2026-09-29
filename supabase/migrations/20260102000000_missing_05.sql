-- ============================================================
-- Migration 05: Add missing tables for videos, quizzes, and progress tracking
-- Run in Supabase SQL Editor or via Supabase CLI
-- ============================================================

-- 1. VIDEOS TABLE
create table if not exists public.videos (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  subject     text not null,
  grade       text not null,
  topic       text,
  url         text not null,
  description text,
  is_published boolean default true,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now()
);

alter table public.videos enable row level security;

create policy "Anyone can view published videos"
  on public.videos for select using (is_published = true);

create policy "Tutors and admins can insert videos"
  on public.videos for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('tutor', 'admin')
    )
  );

create policy "Uploader or admin can update videos"
  on public.videos for update
  using (
    uploaded_by = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Uploader or admin can delete videos"
  on public.videos for delete
  using (
    uploaded_by = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 2. VIDEO WATCHES TABLE
create table if not exists public.video_watches (
  id         uuid primary key default gen_random_uuid(),
  video_id   uuid references public.videos(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  watched_at timestamptz default now(),
  unique(video_id, user_id)
);

alter table public.video_watches enable row level security;

create policy "Users can view own watch history"
  on public.video_watches for select
  using (auth.uid() = user_id);

create policy "Users can manage own watch history"
  on public.video_watches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. QUIZ RESULTS TABLE
create table if not exists public.quiz_results (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  subject    text not null,
  grade      text not null,
  score      int not null,
  total      int not null,
  percent    int not null,
  created_at timestamptz default now()
);

alter table public.quiz_results enable row level security;

create policy "Users can view own quiz results"
  on public.quiz_results for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.parent_student_links
      where parent_id = auth.uid() and student_id = quiz_results.user_id and status = 'approved'
    ) or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can insert own quiz results"
  on public.quiz_results for insert
  with check (auth.uid() = user_id);

-- 4. PROGRESS TABLE
create table if not exists public.progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  subject    text not null,
  percent    int default 0,
  updated_at timestamptz default now(),
  unique(user_id, subject)
);

alter table public.progress enable row level security;

create policy "Users can view own progress"
  on public.progress for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.parent_student_links
      where parent_id = auth.uid() and student_id = progress.user_id and status = 'approved'
    )
  );

create policy "Users can update own progress"
  on public.progress for update
  using (auth.uid() = user_id);

-- 5. TOPIC PROGRESS TABLE
create table if not exists public.topic_progress (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles(id) on delete cascade,
  subject          text not null,
  grade            text not null,
  topic            text not null,
  attempts         int default 0,
  best_percent     int default 0,
  covered          boolean default false,
  last_attempt_at  timestamptz default now(),
  unique(user_id, subject, grade, topic)
);

alter table public.topic_progress enable row level security;

create policy "Users can view own topic progress"
  on public.topic_progress for select
  using (auth.uid() = user_id);

create policy "Users can update own topic progress"
  on public.topic_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. STUDY MATERIALS TABLE
create table if not exists public.study_materials (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('note', 'past_paper', 'revision_guide')),
  subject    text not null,
  grade      text not null,
  topic      text,
  title      text not null,
  year       text,
  content    text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.study_materials enable row level security;

create policy "Anyone can view study materials"
  on public.study_materials for select using (true);

create policy "Tutors and admins can create materials"
  on public.study_materials for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('tutor', 'admin')
    )
  );

create policy "Creator or admin can update materials"
  on public.study_materials for update
  using (
    created_by = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 7. PROMOTIONS TABLE
create table if not exists public.promotions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references public.profiles(id) on delete cascade,
  from_grade            text not null,
  to_grade              text not null,
  academic_year         text not null,
  quiz_average          int default 0,
  topics_covered_percent int default 0,
  decision              text not null check (decision in ('promoted', 'retained')),
  decided_by            uuid references public.profiles(id),
  notes                 text,
  created_at            timestamptz default now()
);

alter table public.promotions enable row level security;

create policy "Users and parents can view promotion history"
  on public.promotions for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.parent_student_links
      where parent_id = auth.uid() and student_id = promotions.user_id and status = 'approved'
    ) or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 8. Add grade column to profiles if it doesn't exist
alter table public.profiles add column if not exists grade text;
alter table public.profiles add column if not exists current_academic_year text;
alter table public.profiles add column if not exists last_promotion_id uuid references public.promotions(id) on delete set null;

-- 9. CREATE INDEXES FOR PERFORMANCE
create index if not exists idx_videos_subject_grade on public.videos(subject, grade);
create index if not exists idx_videos_uploaded_by on public.videos(uploaded_by);
create index if not exists idx_quiz_results_user_id on public.quiz_results(user_id);
create index if not exists idx_quiz_results_subject on public.quiz_results(subject);
create index if not exists idx_video_watches_user_id on public.video_watches(user_id);
create index if not exists idx_progress_user_id on public.progress(user_id);
create index if not exists idx_topic_progress_user_id on public.topic_progress(user_id);
create index if not exists idx_study_materials_subject_grade on public.study_materials(subject, grade);
create index if not exists idx_promotions_user_id on public.promotions(user_id);

-- 10. UPDATE TRIGGER FOR updated_at on new tables
create trigger set_study_materials_updated_at
  before update on public.study_materials
  for each row execute function public.handle_updated_at();
