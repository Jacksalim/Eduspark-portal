# EduSpark Auth System — Integration Guide

## What's in this package

```
sql/
  01_schema.sql          — All table definitions, triggers, and SECURITY DEFINER functions
  02_rls_policies.sql    — Row Level Security policies for every table

src/
  lib/supabase.js        — Supabase client + auth helpers
  contexts/AuthContext.jsx — React context providing session, profile, and role state
  components/auth/RouteGuards.jsx — RequireAuth, RequireRole, RequireAdmin, etc.
  hooks/index.js         — useNotifications, useParentChildren, useTutorApplication
  pages/
    AuthPages.jsx        — LoginPage + RegisterPage (with role toggle)
    AccessDeniedPage.jsx — AccessDeniedPage + ForgotPasswordPage
    TutorApplicationPage.jsx — Full tutor application form with status tracking
    dashboards/
      AdminDashboard.jsx — Admin panel (tutor reviews, parent links, users, audit log)
      ParentDashboard.jsx — Parent dashboard (child linking, monitoring)
      StudentDashboard.jsx — Student dashboard wrapper + App.jsx router
  App.jsx                — Complete React Router setup with all guards
```

---

## Step 1 — Run SQL migrations

In Supabase SQL Editor:
1. Run `01_schema.sql` first (tables, triggers, functions)
2. Run `02_rls_policies.sql` second (RLS policies)

> **Important**: The `handle_new_user()` trigger auto-creates a profile with a safe role
> ('student' or 'parent') on every signup. Users can NEVER self-assign 'tutor' or 'admin'.

---

## Step 2 — Create your first admin account

Admin accounts CANNOT be created through public registration. Create them directly:

```sql
-- 1. Create the user in Supabase Auth dashboard OR via:
-- supabase.auth.admin.createUser({ email, password }) (server-side only)

-- 2. Manually set their role (run in SQL editor):
UPDATE public.profiles SET role = 'admin' WHERE email = 'your-admin@example.com';
INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT id, 'admin', id FROM public.profiles WHERE email = 'your-admin@example.com';
```

---

## Step 3 — Install into your React app

```bash
# Already in your project:
npm install @supabase/supabase-js react-router-dom
```

Copy the files into your `src/` directory, then update `main.jsx`:

```jsx
// main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

---

## Step 4 — Update your existing dashboard

In `StudentDashboard.jsx`, replace the placeholder comment with your existing components:

```jsx
// Replace this:
<div>Your existing student dashboard content goes here.</div>

// With your actual components:
<SubjectGrid />
<RecentVideos />
<ProgressTracker />
<QuizHistory />
```

Your existing components don't need to change — they just need to live inside the
`RequireStudent` guard provided by `App.jsx`.

---

## Step 5 — Protect your existing quiz API

Your Vercel `api/quiz.js` should verify the user's role from Supabase before responding:

```js
// api/quiz.js — add at the top of your handler
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role — never expose to client
)

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' })

  // Verify role from DB (not JWT metadata which can be stale)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['student', 'tutor', 'admin'].includes(profile?.role)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // ... rest of your quiz handler
}
```

---

## Security architecture

| Layer              | Mechanism                                     |
|--------------------|-----------------------------------------------|
| Frontend routes    | `RequireRole` checks DB role, redirects       |
| Supabase queries   | RLS policies enforce per-table access rules   |
| Role verification  | `get_my_role()` reads from `profiles` table, not JWT |
| Admin functions    | `SECURITY DEFINER` functions verify admin role server-side |
| Role escalation    | Blocked: users can't write to `profiles.role` or `user_roles` |
| Tutor promotion    | Only via `approve_tutor_application()` RPC (admin-gated) |
| Admin creation     | Only via direct SQL — no public signup path   |

---

## Key design decisions

**Role stored in `profiles`, not JWT metadata**
JWT metadata is set at signup and can become stale. `get_my_role()` always reads live
from the `profiles` table, so an admin who demotes a tutor sees the change immediately.

**SECURITY DEFINER functions for sensitive operations**
`approve_tutor_application`, `reject_tutor_application`, and `approve_parent_link` run
with elevated privileges but verify the caller's role as their first action. This means
RLS policies can be restrictive while still allowing controlled admin operations.

**Parents can't see unlinked students**
The `parent_student_links` table uses a status check (`status = 'approved'`) in every
parent-facing query. Students approve their own links; admins can force-approve.

**Audit log is append-only**
The `no delete` and `no direct write` policies on `audit_logs` mean only SECURITY
DEFINER functions can write to it, and nobody can delete entries.
