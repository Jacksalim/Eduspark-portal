-- ============================================================
-- EduSpark Schema v2 — Grade Promotion, Topic Progress,
-- Notes & Revision Materials (Past Papers)
-- Run this in Supabase → SQL Editor AFTER schema.sql
-- ============================================================

-- 1. TOPIC PROGRESS
-- Tracks whether a learner has "covered" a specific CBC topic
-- (derived from quiz attempts on that topic — see app logic).
create table if not exists public.topic_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  subject text not null,
  grade text not null,
  topic text not null,
  attempts int default 0,
  best_percent int default 0,
  covered boolean default false,        -- true once learner has demonstrated competency on this topic
  last_attempt_at timestamptz default now(),
  unique(user_id, subject, grade, topic)
);

-- 2. PROMOTIONS
-- One row per promotion decision (manually triggered by an admin).
create table if not exists public.promotions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  from_grade text not null,
  to_grade text not null,
  academic_year text not null,           -- e.g. '2025/2026'
  quiz_average numeric(5,1),             -- % average across quizzes that academic year
  topics_covered_percent numeric(5,1),   -- % of CBC topics marked covered
  decision text not null check (decision in ('promoted', 'repeated')),
  decided_by uuid references public.profiles(id),
  notes text,                            -- optional admin remark
  created_at timestamptz default now()
);

-- Track which academic year a learner is currently "in" so repeated
-- promotion runs don't double-process the same learner.
alter table public.profiles add column if not exists current_academic_year text;
alter table public.profiles add column if not exists last_promotion_id uuid references public.promotions(id);

-- 3. STUDY MATERIALS (Notes + Revision / Past Papers)
create table if not exists public.study_materials (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('note', 'past_paper', 'revision_guide')),
  subject text not null,
  grade text not null,
  topic text,                            -- required for type='note', optional for past papers
  title text not null,
  year text,                             -- exam year, for past papers (e.g. '2024')
  content text not null,                 -- markdown/plain text body
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_study_materials_lookup
  on public.study_materials (subject, grade, type);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.topic_progress enable row level security;
alter table public.promotions enable row level security;
alter table public.study_materials enable row level security;

-- TOPIC PROGRESS: learners manage their own; parents/admins can view
create policy "Learners manage own topic progress" on public.topic_progress
  for all using (auth.uid() = user_id);

create policy "Parents view children topic progress" on public.topic_progress
  for select using (
    exists (select 1 from public.profiles where id = topic_progress.user_id and parent_id = auth.uid())
  );

create policy "Admins view all topic progress" on public.topic_progress
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- PROMOTIONS: learners + parents can view; only admins can write
create policy "Learners view own promotions" on public.promotions
  for select using (auth.uid() = user_id);

create policy "Parents view children promotions" on public.promotions
  for select using (
    exists (select 1 from public.profiles where id = promotions.user_id and parent_id = auth.uid())
  );

create policy "Admins manage promotions" on public.promotions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- STUDY MATERIALS: anyone authenticated can read; only admins write
create policy "Anyone can view study materials" on public.study_materials
  for select using (auth.role() = 'authenticated');

create policy "Admins manage study materials" on public.study_materials
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins update study materials" on public.study_materials
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins delete study materials" on public.study_materials
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
