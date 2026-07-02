-- ============================================================
-- DEPRECATED — do not run this file directly.
-- All schema definitions have been consolidated into:
--   sql/schema.sql                  ← production schema (run this)
--   sql/migrate_existing_users.sql  ← run after schema.sql on existing DBs
--
-- This file (03_schema_core.sql) is kept for historical reference only.
-- ============================================================

-- ============================================================
-- EduSpark Database Schema
-- Run this in Supabase → SQL Editor
-- ============================================================

-- 1. PROFILES (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text not null,
  role text not null check (role in ('learner', 'parent', 'admin')),
  grade text,
  parent_id uuid references public.profiles(id),
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. VIDEOS
create table if not exists public.videos (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  subject text not null,
  grade text not null,
  topic text,
  url text not null,
  description text,
  thumbnail_url text,
  duration_seconds int,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- 3. VIDEO WATCHES (tracks which learner watched which video)
create table if not exists public.video_watches (
  id uuid default gen_random_uuid() primary key,
  video_id uuid references public.videos(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  watched_at timestamptz default now(),
  unique(video_id, user_id)
);

-- 4. QUIZ RESULTS
create table if not exists public.quiz_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  subject text not null,
  grade text not null,
  score int not null,
  total int not null,
  percent int not null,
  created_at timestamptz default now()
);

-- 5. PROGRESS (per learner per subject)
create table if not exists public.progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  subject text not null,
  percent int default 0,
  updated_at timestamptz default now(),
  unique(user_id, subject)
);

-- 6. VISITS (site visitor log)
create table if not exists public.visits (
  id uuid default gen_random_uuid() primary key,
  page text,
  user_id uuid references public.profiles(id),
  user_agent text,
  visited_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.video_watches enable row level security;
alter table public.quiz_results enable row level security;
alter table public.progress enable row level security;
alter table public.visits enable row level security;

-- Profiles: users see their own; admins see all; authenticated users can look up learners (for linking)
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Authenticated users can view learner profiles" on public.profiles for select
  using (role = 'learner' and auth.role() = 'authenticated');
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Parents can link themselves to a learner" on public.profiles for update
  using (role = 'learner')
  with check (parent_id = auth.uid());
create policy "Insert on signup" on public.profiles for insert with check (auth.uid() = id);

-- Videos: anyone authenticated can read; only admins can write
create policy "Anyone can view videos" on public.videos for select using (auth.role() = 'authenticated');
create policy "Admins can insert videos" on public.videos for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can delete videos" on public.videos for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Video watches: learners manage their own
create policy "Learners manage own watches" on public.video_watches for all using (auth.uid() = user_id);

-- Quiz results: own data only; admins see all; authenticated users see all for leaderboard
create policy "Users see own quiz results" on public.quiz_results for select using (auth.uid() = user_id);
create policy "Users insert own quiz results" on public.quiz_results for insert with check (auth.uid() = user_id);
create policy "Admins see all quiz results" on public.quiz_results for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Authenticated users see quiz results for leaderboard" on public.quiz_results
  for select using (auth.role() = 'authenticated');

-- Progress: own data; parents see children; admins see all
create policy "Users see own progress" on public.progress for select using (auth.uid() = user_id);
create policy "Users upsert own progress" on public.progress for all using (auth.uid() = user_id);
create policy "Parents see children progress" on public.progress for select using (
  exists (select 1 from public.profiles where id = user_id and parent_id = auth.uid())
);
create policy "Admins see all progress" on public.progress for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Visits: admins only
create policy "Anyone can insert visit" on public.visits for insert with check (true);
create policy "Admins see all visits" on public.visits for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- SAMPLE DATA (optional — remove if you want a clean start)
-- ============================================================

-- Sample videos (replace URLs with real YouTube embeds)
insert into public.videos (title, subject, grade, topic, url, description) values
  ('Introduction to Fractions', 'Mathematics', '7', 'Fractions', 'https://www.youtube.com/embed/yg5oMWFXjwg', 'Learn what fractions are and how to identify them'),
  ('Adding Fractions with Same Denominator', 'Mathematics', '7', 'Fractions', 'https://www.youtube.com/embed/52ZlXsFJULI', 'Step-by-step guide to adding fractions'),
  ('What is Entrepreneurship?', 'Business Studies', '10', 'Entrepreneurship', 'https://www.youtube.com/embed/FVe0BSXL1JU', 'Introduction to entrepreneurship concepts'),
  ('Reading Comprehension Skills', 'English', '8', 'Comprehension', 'https://www.youtube.com/embed/VfG1yLLcbxU', 'How to approach reading comprehension'),
  ('The Water Cycle', 'Natural Sciences', '6', 'Earth Science', 'https://www.youtube.com/embed/al-do-HGuIk', 'Understanding evaporation, condensation and precipitation')
on conflict do nothing;
