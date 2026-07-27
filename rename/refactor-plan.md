# Refactor Plan — student → learner

Branch: rename/student-to/learner

Scope: Code + DB schema + docs + tests

High-level steps
1) Inventory (done) — I committed the initial inventory at rename/initial-inventory.md.
2) Add migration(s) — committed draft migration at sql/migrations/20260727_rename_student_to_learner.sql.
3) Code renames (iterative commits):
   - Rename components, files, and identifiers (Student → Learner), preserving case.
   - Update imports/exports across the repo.
   - Update SQL files in repo (schema & RLS) to the new naming.
   - Update env var reads to support both new and old names.
4) Routing & redirects:
   - Add /learner/* route and RequireLearner guard.
   - Implement redirects/aliases from /student/* → /learner/* (React Router Navigate or rewrites depending on stack).
5) Tests & CI:
   - Run build, run tests, fix failures.
   - Run ESLint / typecheck and address issues.
6) Final sweep & cleanup:
   - Remove compatibility view or transitional code after safe deployment window (documented in PR).
   - Update docs and CHANGELOG.

Rollout recommendation
- Stage 1: Apply migration to staging/local; deploy code that accepts both 'student' and 'learner' role values and contains compatibility view for old table name.
- Stage 2: Deploy updated code to production (reads both roles, uses new table). Monitor logs and tests.
- Stage 3: Once verified, run a follow-up migration to drop compatibility view and remove old code paths.

Rollback plan
- Reverse migration or keep compatibility view until rollback complete.
- The migration file includes a compatibility view so older code remains functional during the deployment window.

Manual review items to confirm before DB migrations run in production
- Do you want constraints/index names preserved or renamed? (I preserved table rename but did not rename indexes — we can adjust if you prefer)
- Approve dropping the parent_student_links table name in the final schema (Option 2 selected). The compatibility view keeps old name available until cleanup.
- Review policy recreations in sql/02_rls_policies.sql — I will update those files in the branch.

Next actions (automated)
- I will now start applying code renames in small commits on the branch. I will run the build and tests, fix any regressions, and push changes. I will open a PR when done that includes:
  - Full replacement report (counts, files changed/renamed, migrations added)
  - Migration instructions
  - List of occurrences intentionally left unchanged


