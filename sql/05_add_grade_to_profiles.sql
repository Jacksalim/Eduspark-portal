-- Migration: add grade column to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS grade TEXT;

-- Backfill grade from quiz_results (most recent grade used per user)
UPDATE public.profiles p
SET grade = q.grade
FROM (
  SELECT DISTINCT ON (user_id) user_id, grade
  FROM public.quiz_results
  ORDER BY user_id, created_at DESC
) q
WHERE p.id = q.user_id
AND p.grade IS NULL;
