# Initial Inventory — student → learner (pre-refactor scan)

Repository: Jacksalim/Eduspark-portal
Branch: rename/student-to/learner
Date: 2026-07-27

NOTE: Code search results are limited by the search tool. This inventory is a comprehensive first pass based on repository-wide lexical scans, but may be incomplete. Full GitHub code search: https://github.com/Jacksalim/Eduspark-portal/search?q=student&type=code

Summary
- I searched the codebase for occurrences of the terms (case-sensitive and plural forms):
  - student, Student, STUDENT
  - students, Students, STUDENTS

- This inventory lists every representative file and context found during the automated scan. I will perform a second, deeper pass and then apply the automated renames + migrations after you review the inventory and migration draft.

Representative occurrences (by path)

1) src/pages/dashboards/StudentDashboard.jsx
- UI component name: `StudentDashboard` (exported default)
- Supabase query: `.from('parent_student_links')` and `.eq('student_id', user.id)`
- UI text referencing parents wanting to monitor "learning progress"
- Planned action: rename file + component to LearnerDashboard.jsx / LearnerDashboard, update imports and supabase queries to use new table/column names after migration, add transitional code if needed.

2) src/App.jsx
- Router: Route path="/student/*" element={<RequireStudent><StudentDashboard /></RequireStudent>}
- Imports: `RequireStudent`, `StudentDashboard`
- Planned action: add /learner/* route and RequireLearner guard; keep /student/* route as redirect/alias for rollout; rename guard and update usages.

3) src/pages/AuthPages.jsx
- Registration logic: role === 'student' checks, dashboards mapping uses '/student'
- Registration UI: buttons that show 'student' and grade select
- Planned action: update role handling to use 'learner' as canonical, keep acceptance of 'student' during migration, update dashboards map to include '/learner' and redirect legacy '/student' route.

4) src/lib/supabase.js
- Several helper functions refer to role values and parent_student_links table:
  - fetchAllLearners() (already present) but uses .in('role', ['student','learner'])
  - fetchChildrenForParent() selects 'student:profiles!...'
  - findLearnerByEmail() uses .in('role', ['student', 'learner'])
  - linkChildToParent() updates profiles with parent_id by learnerId
- Planned action: update helper queries to the new table/column names and normalize role checks; preserve transitional .in() checks until migration applied.

5) SQL files (sql/01_schema.sql, sql/02_rls_policies.sql, sql/schema.sql)
- parent_student_links table, column student_id
- handle_new_user() trigger sets default role to 'student'
- RLS policies reference student_id, parent_student_links, and role = 'student'
- Planned action: generate migration to rename table → parent_learner_links, column student_id → learner_id, update trigger function to default to 'learner', update RLS policy definitions and recreate policies with new names.

6) docs/INTEGRATION_GUIDE.md and docs/DATABASE.md
- References to StudentDashboard, student role, parent_student_links table
- Planned action: update docs to use learner terminology and note migration steps; mark any legal language for manual review.

7) Public pages & UI copy
- src/pages/public/AboutUs.jsx, OurServices.jsx, PrivacyPolicy.jsx contain 'student' in content and should be updated to 'learner' (case-preserving) where appropriate.
- Planned action: update UI text and preserve contexts where "student" must remain (historical/legal mentions) — mark for manual review.

8) archive/ and backup files
- archive/* and .bak files contain legacy references. I will update tracked files but will not modify backups unless requested; these are flagged in the inventory.

9) Tests
- Tests referencing Student* components, role checks, or table names will be updated. I will run the test suite and fix failing tests.

10) Environment / JSON keys
- There may be env vars or JSON keys containing "STUDENT". I will rename env vars to LEARNER_... and implement compatibility reads (process.env.LEARNER_X ?? process.env.STUDENT_X). Any JSON keys consumed by external integrations will be flagged and left unchanged until you approve.

Files to be modified (planned — draft list)
- src/pages/dashboards/StudentDashboard.jsx → src/pages/dashboards/LearnerDashboard.jsx
- src/components/auth/RouteGuards (RequireStudent → RequireLearner)
- src/App.jsx (add /learner/* route; route alias for /student/*)
- src/lib/supabase.js (update queries, fk selectors, helper names)
- sql/01_schema.sql, sql/02_rls_policies.sql, sql/schema.sql (update definitions to use learner)
- sql/migrations/20260727_rename_student_to_learner.sql (new migration draft)
- docs/INTEGRATION_GUIDE.md, docs/DATABASE.md, and privacy/legal pages
- Tests and snapshots referencing student/Student

Items intentionally left unchanged for now
- Backups and archive files (.bak) — flagged but not modified unless you ask
- Any external API/SDK fields that explicitly require the term 'student' — flagged for review
- Historical/legal wording that may require a legal sign-off — flagged for manual review

Next step (pending your review)
- I will commit the draft SQL migration and the inventory/plan into the branch. After that I will proceed with the automated code renames + test fixes and push changes in small commits.

---

