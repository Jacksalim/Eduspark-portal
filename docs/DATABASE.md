# Database — EduSpark

## File reference

| File | Purpose |
|------|---------|
| `supabase/migrations/20260101000000_initial_schema.sql` | **Source of truth** — applied via `npm run db:push` |
| `supabase/seed.sql` | Optional demo video content |
| `sql/schema.sql` | Identical copy for manual SQL Editor use |
| `sql/migrate_existing_users.sql` | Run once on existing databases after schema.sql |

---

## One-time CLI setup

```bash
# Install CLI
npm install -g supabase

# Authenticate
supabase login

# Link to your Supabase project
# (find your ref: Dashboard → project → Settings → General → Reference ID)
supabase link --project-ref <your-project-ref>

# Apply schema to your remote database
npm run db:push

# Seed demo content (optional)
npm run db:seed
```

Add to your `.env` (copy from `.env.example`):
```
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_DB_PASSWORD=your-database-password
```

---

## Day-to-day workflow

### Applying a schema change

```bash
# 1. Generate a new timestamped migration file
supabase migration new describe_your_change

# 2. Edit the file in supabase/migrations/
# 3. Apply to production
npm run db:push
```

### Testing locally before pushing

```bash
supabase start     # spins up local Postgres + Studio at localhost:54323
npm run db:reset   # applies all migrations on local DB from scratch
npm run db:seed    # load demo data into local DB
npm run db:studio  # open Supabase Studio in browser
```

### Pulling changes made directly in the Supabase dashboard

```bash
npm run db:pull    # diffs remote vs local, generates a new migration file
```

---

## Tables (14 total)

| Table | Description |
|-------|-------------|
| `profiles` | One row per user; extends `auth.users` |
| `user_roles` | Audit-safe secondary role store |
| `tutor_applications` | Tutor onboarding workflow |
| `parent_student_links` | Parent ↔ student monitoring requests |
| `notifications` | In-app user notifications |
| `audit_logs` | Immutable event trail |
| `videos` | Uploaded lesson videos |
| `video_watches` | Per-user watch history |
| `quiz_results` | Quiz attempt scores |
| `progress` | Rolling per-subject average per user |
| `visits` | Site analytics |
| `study_materials` | Notes, past papers, revision guides |
| `topic_progress` | Per-topic quiz competency (drives promotions) |
| `promotions` | End-of-year grade promotion decisions |

---

## Supabase Dashboard — required settings

### Authentication → URL Configuration
Add to **Redirect URLs**:
```
http://localhost:5173/reset-password
https://<your-app>.vercel.app/reset-password
```

---

## npm scripts

| Script | What it does |
|--------|-------------|
| `npm run db:push` | Apply unapplied migrations to remote Supabase |
| `npm run db:pull` | Pull dashboard changes into a new migration file |
| `npm run db:reset` | Wipe and re-apply all migrations on local DB |
| `npm run db:seed` | Load seed data into local DB |
| `npm run db:studio` | Open Supabase Studio |
| `npm run db:diff` | Show schema diff between local and remote |
| `npm run db:status` | List applied / pending migrations |
