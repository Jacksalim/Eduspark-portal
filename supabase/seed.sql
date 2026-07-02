-- EduSpark seed data (optional demo content)
-- Run: supabase db seed  OR paste into SQL Editor
INSERT INTO public.videos (title, subject, grade, topic, url, description, is_published)
VALUES
  ('Introduction to Fractions',              'Mathematics',     '7',  'Fractions',       'https://www.youtube.com/embed/n0FZhQ_GkKw', 'Learn what fractions are and how to identify them', TRUE),
  ('Adding Fractions with Same Denominator', 'Mathematics',     '7',  'Fractions',       'https://www.youtube.com/embed/52ZlXsFJULI', 'Step-by-step guide to adding fractions',            TRUE),
  ('Solving Linear Equations',               'Mathematics',     '8',  'Algebra',         'https://www.youtube.com/embed/l3XzepN03KQ', 'Introduction to solving for x',                    TRUE),
  ('What is Entrepreneurship?',              'Business Studies','10', 'Entrepreneurship','https://www.youtube.com/embed/FVe0BSXL1JU', 'Introduction to entrepreneurship concepts',         TRUE),
  ('Reading Comprehension Skills',           'English',         '8',  'Comprehension',   'https://www.youtube.com/embed/VfG1yLLcbxU', 'How to approach reading comprehension',             TRUE),
  ('The Water Cycle',                        'Natural Sciences','6',  'Earth Science',   'https://www.youtube.com/embed/al-do-HGuIk', 'Evaporation, condensation and precipitation',       TRUE)
ON CONFLICT DO NOTHING;
