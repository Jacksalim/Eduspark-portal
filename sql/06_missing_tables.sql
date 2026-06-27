-- ============================================================
-- Migration 06: Add missing tables
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. VIDEOS
create table if not exists public.videos (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  subject     text not null,
  grade       text not null,
  topic       text,
  url         text not null,
  description text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now()
);

alter table public.videos enable row level security;

create policy "Anyone can view videos"
  on public.videos for select using (true);

create policy "Tutors and admins can insert videos"
  on public.videos for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('tutor', 'admin')
    )
  );

create policy "Uploader or admin can delete videos"
  on public.videos for delete
  using (
    uploaded_by = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 2. VIDEO WATCHES
create table if not exists public.video_watches (
  id         uuid primary key default gen_random_uuid(),
  video_id   uuid references public.videos(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  watched_at timestamptz default now(),
  unique(video_id, user_id)
);

alter table public.video_watches enable row level security;

create policy "Users manage own watch history"
  on public.video_watches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. QUIZ RESULTS
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

create policy "Users view own quiz results"
  on public.quiz_results for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.parent_student_links
      where parent_id = auth.uid() and student_id = quiz_results.user_id and status = 'approved'
    ) or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users insert own quiz results"
  on public.quiz_results for insert
  with check (auth.uid() = user_id);

-- 4. Add grade column to profiles if missing
alter table public.profiles add column if not exists grade text;

-- 5. Indexes for performance
create index if not exists idx_videos_subject_grade on public.videos(subject, grade);
create index if not exists idx_quiz_results_user_id on public.quiz_results(user_id);
create index if not exists idx_quiz_results_subject on public.quiz_results(subject);
create index if not exists idx_video_watches_user_id on public.video_watches(user_id);
