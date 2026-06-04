-- ============================================================
-- EduSpark Database Schema
-- Run this in: Supabase → SQL Editor → New Query → Run
-- ============================================================

-- 1. PROFILES (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('learner', 'parent', 'admin')),
  grade text,                        -- for learners: 'R','1'...'12'
  parent_id uuid references public.profiles(id),  -- links child to parent
  avatar_url text,
  created_at timestamptz default now()
);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, grade)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    coalesce(new.raw_user_meta_data->>'role', 'learner'),
    new.raw_user_meta_data->>'grade'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. VIDEOS
create table public.videos (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  subject text not null,
  grade text not null,
  topic text,
  description text,
  url text not null,               -- YouTube/Vimeo embed URL
  thumbnail_url text,
  duration_seconds int,
  uploaded_by uuid references public.profiles(id),
  is_published boolean default true,
  created_at timestamptz default now()
);

-- 3. VIDEO WATCHES (tracks who watched what)
create table public.video_watches (
  id uuid default gen_random_uuid() primary key,
  learner_id uuid references public.profiles(id) on delete cascade,
  video_id uuid references public.videos(id) on delete cascade,
  watched_at timestamptz default now(),
  completed boolean default false,
  unique(learner_id, video_id)
);

-- 4. QUIZ RESULTS
create table public.quiz_results (
  id uuid default gen_random_uuid() primary key,
  learner_id uuid references public.profiles(id) on delete cascade,
  subject text not null,
  grade text not null,
  score int not null,
  total int not null,
  questions jsonb,                  -- stores full Q&A for review
  taken_at timestamptz default now()
);

-- 5. PROGRESS (computed per subject per learner)
create table public.progress (
  id uuid default gen_random_uuid() primary key,
  learner_id uuid references public.profiles(id) on delete cascade,
  subject text not null,
  videos_watched int default 0,
  quizzes_taken int default 0,
  avg_score numeric(4,1) default 0,
  percent_complete int default 0,
  last_active timestamptz default now(),
  unique(learner_id, subject)
);

-- 6. SITE VISITS
create table public.site_visits (
  id uuid default gen_random_uuid() primary key,
  visitor_id uuid references public.profiles(id),  -- null if not logged in
  page text not null,
  ip_address text,
  user_agent text,
  visited_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.video_watches enable row level security;
alter table public.quiz_results enable row level security;
alter table public.progress enable row level security;
alter table public.site_visits enable row level security;

-- PROFILES policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Parents can view their children" on public.profiles
  for select using (parent_id = auth.uid());

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- VIDEOS policies
create policy "Anyone can view published videos" on public.videos
  for select using (is_published = true);

create policy "Admins can manage all videos" on public.videos
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- VIDEO WATCHES policies
create policy "Learners can manage own watches" on public.video_watches
  for all using (auth.uid() = learner_id);

create policy "Admins can view all watches" on public.video_watches
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- QUIZ RESULTS policies
create policy "Learners can manage own results" on public.quiz_results
  for all using (auth.uid() = learner_id);

create policy "Parents can view children results" on public.quiz_results
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and parent_id = auth.uid())
  );

create policy "Admins can view all results" on public.quiz_results
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- PROGRESS policies
create policy "Learners can manage own progress" on public.progress
  for all using (auth.uid() = learner_id);

create policy "Parents can view children progress" on public.progress
  for select using (
    exists (select 1 from public.profiles p where p.id = learner_id and p.parent_id = auth.uid())
  );

create policy "Admins can view all progress" on public.progress
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- SITE VISITS policies
create policy "Admins can view all visits" on public.site_visits
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Anyone can insert visits" on public.site_visits
  for insert with check (true);

-- ============================================================
-- SAMPLE DATA (optional — delete if you don't want demo data)
-- ============================================================

insert into public.videos (title, subject, grade, topic, url, duration_seconds, is_published) values
  ('Introduction to Fractions', 'Mathematics', '7', 'Fractions', 'https://www.youtube.com/embed/n0FZhQ_GkKw', 742, true),
  ('Adding & Subtracting Fractions', 'Mathematics', '7', 'Fractions', 'https://www.youtube.com/embed/5juto2ze8Lg', 1082, true),
  ('Solving Linear Equations', 'Mathematics', '8', 'Algebra', 'https://www.youtube.com/embed/l3XzepN03KQ', 1331, true),
  ('Introduction to Entrepreneurship', 'Business Studies', '10', 'Entrepreneurship', 'https://www.youtube.com/embed/pTCwZGbPqBs', 980, true),
  ('Business Plan Basics', 'Business Studies', '10', 'Planning', 'https://www.youtube.com/embed/Fqch5OrUPvA', 1445, true),
  ('Parts of Speech', 'English', '6', 'Grammar', 'https://www.youtube.com/embed/8bCVrFE3VGg', 654, true),
  ('The Water Cycle', 'Science', '5', 'Earth Science', 'https://www.youtube.com/embed/al-do-HGuIk', 230, true);
