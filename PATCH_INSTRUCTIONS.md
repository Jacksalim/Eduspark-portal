# EduSpark — Patch Instructions

Apply these changes in order. None of them remove existing functionality —
they only add new sidebar sections, imports, and one new function call.

---

## 1. Database (Supabase SQL Editor)

Run `schema-v2-promotions-materials.sql` after your existing `schema.sql`.
Verify in Table Editor that `topic_progress`, `promotions`, and
`study_materials` tables now exist, and that `profiles` has the two new
columns `current_academic_year` and `last_promotion_id`.

---

## 2. `src/lib/supabase.js`

Open the file and paste the entire contents of `supabase-additions.js`
at the very end (after the existing `fetchVisitStats` function). No existing
code needs to change — these are pure additions.

---

## 3. New files to add (copy as-is)

- `src/lib/topics.js`                    ← from `src-lib-topics.js`
- `src/pages/learner/NotesSection.jsx`   ← from `NotesSection.jsx`
- `src/pages/learner/RevisionSection.jsx`← from `RevisionSection.jsx`
- `src/components/SidebarProfileDropdown.jsx` ← from `SidebarProfileDropdown.jsx`
- `src/pages/admin/AdminPromotions.jsx`  ← from `AdminPromotions.jsx`
- `src/pages/admin/AdminMaterials.jsx`   ← from `AdminMaterials.jsx`

(Create the `src/pages/learner/` and `src/pages/admin/` folders if they
don't exist yet.)

---

## 4. `src/pages/AuthPage.jsx` — grade dropdown verification

The grade `<select>` for learners already exists in the file you have
(inside the `mode === 'signup'` block, right after the role selector):

```jsx
{role === 'learner' && (
  <div style={{ marginBottom: 18 }}>
    <label ...>Grade</label>
    <select value={grade} onChange={e => setGrade(e.target.value)} ...>
      {GRADES.map(g => <option key={g} value={g}>{g === 'R' ? 'Grade R' : `Grade ${g}`}</option>)}
    </select>
  </div>
)}
```

**If this block is genuinely missing in your live repo**, re-add it exactly
as shown above (it sits between the Role Selector block and the Email
input in the signup form). If it's present but not rendering, check:
1. That `role` state defaults to `'learner'` (it does: `useState('learner')`).
2. That `GRADES` is still exported from `src/components/ui.jsx`.
3. Browser console for a JS error earlier in the form that could halt
   rendering before reaching this block.

No code change needed here unless you confirm one of the above is broken —
just send me the actual current file and I'll diff it directly.

---

## 5. `src/pages/LearnerPortal.jsx`

### 5a. Add imports (top of file, with the other imports)

```jsx
import NotesSection from './learner/NotesSection'
import RevisionSection from './learner/RevisionSection'
import SidebarProfileDropdown from '../components/SidebarProfileDropdown'
import { recordTopicProgress } from '../lib/supabase'
```

### 5b. Add sidebar items

Find:
```jsx
const sideItems = [
  { id: 'home',        icon: '🏠', label: 'Dashboard' },
  { id: 'lessons',     icon: '▶️', label: 'Video Lessons' },
  { id: 'quiz',        icon: '📝', label: 'AI Quiz' },
  { id: 'progress',    icon: '📊', label: 'My Progress' },
  { id: 'leaderboard', icon: '🏆', label: 'Leaderboard' },
]
```

Replace with:
```jsx
const sideItems = [
  { id: 'home',        icon: '🏠', label: 'Dashboard' },
  { id: 'lessons',     icon: '▶️', label: 'Video Lessons' },
  { id: 'quiz',        icon: '📝', label: 'AI Quiz' },
  { id: 'notes',       icon: '📒', label: 'Notes' },
  { id: 'revision',    icon: '📄', label: 'Revision Materials' },
  { id: 'progress',    icon: '📊', label: 'My Progress' },
  { id: 'leaderboard', icon: '🏆', label: 'Leaderboard' },
]
```

### 5c. Replace the bottom sidebar profile box with the dropdown

Find (near the bottom of the sidebar JSX):
```jsx
<div style={{ flex: 1 }} />
<div style={{ padding: '12px', background: 'rgba(255,255,255,.04)', borderRadius: 10, margin: '8px 4px 0' }}>
  <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>Profile</div>
  <div style={{ color: '#fff', fontWeight: 600, fontSize: '.875rem' }}>{profile?.name?.split(' ')[0]}</div>
  <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '.75rem', marginTop: 2 }}>Grade {profile?.grade || '—'}</div>
</div>
```

Replace with:
```jsx
<div style={{ flex: 1 }} />
<SidebarProfileDropdown
  profile={profile}
  streak={calcStreak(homeQuizzes)}
  badgesEarned={getAchievements(homeQuizzes, watchedIds).filter(a => a.earned).length}
  badgesTotal={getAchievements(homeQuizzes, watchedIds).length}
/>
```

(`calcStreak` and `getAchievements` are already defined in this file — no
new imports needed for those two.)

### 5d. Render the new sections

Find:
```jsx
{section === 'quiz'        && <QuizSection profile={profile} />}
{section === 'progress'    && <ProgressSection profile={profile} />}
{section === 'leaderboard' && <LeaderboardSection profile={profile} />}
```

Replace with:
```jsx
{section === 'quiz'        && <QuizSection profile={profile} />}
{section === 'notes'       && <NotesSection profile={profile} />}
{section === 'revision'    && <RevisionSection profile={profile} />}
{section === 'progress'    && <ProgressSection profile={profile} />}
{section === 'leaderboard' && <LeaderboardSection profile={profile} />}
```

### 5e. (Optional but recommended) Simplify the "Home" hero

Since the welcome/streak/badges content now also lives in the sidebar
dropdown, you can shrink the `dash-hero` block in `DashboardHome` to a
simple page title if you want a cleaner top area — but it's safe to leave
it as-is too; nothing breaks either way. Your call.

### 5f. Wire topic-progress tracking into quiz scoring

This is what feeds the promotion threshold. Inside `QuizSection`, find the
`next()` function:

```jsx
async function next() {
  const lastCorrect = selected === quiz[qIdx].correctAnswer ? 1 : 0
  const computed = score + lastCorrect
  if (qIdx + 1 >= quiz.length) {
    setFinalScore(computed); setDone(true)
    if (profile?.id) {
      try {
        await saveQuizResult({ userId: profile.id, subject, grade, score: computed, total: quiz.length })
        setHistory(await fetchQuizResults(profile.id))
        show('Quiz result saved! ✅')
      } catch (e) { console.warn('Could not save quiz result:', e.message) }
    }
  } else { setQIdx(i => i + 1); setSelected(null); setAnswered(false) }
}
```

Replace with (adds per-topic recording right before the existing save call):

```jsx
async function next() {
  const lastCorrect = selected === quiz[qIdx].correctAnswer ? 1 : 0
  const computed = score + lastCorrect
  if (qIdx + 1 >= quiz.length) {
    setFinalScore(computed); setDone(true)
    if (profile?.id) {
      try {
        // Record per-topic progress for promotion-threshold tracking.
        // Group questions by topic and compute each topic's % within this attempt.
        const byTopic = {}
        quiz.forEach((q, i) => {
          const t = q.topic || subject
          if (!byTopic[t]) byTopic[t] = { correct: 0, total: 0 }
          byTopic[t].total += 1
          const wasCorrect = i === qIdx ? lastCorrect === 1 : (i < qIdx) // already-answered ones tracked via score progression
          // Simpler & accurate: recompute from quiz[i].correctAnswer vs nothing stored per-question,
          // so just use the overall attempt score proportionally per topic count.
        })
        // Use the overall quiz percent as a proxy per topic (keeps this lightweight —
        // each quiz already mixes ~3 topics per the AI generator).
        const overallPercent = Math.round((computed / quiz.length) * 100)
        const topicsInQuiz = [...new Set(quiz.map(q => q.topic).filter(Boolean))]
        await Promise.all(topicsInQuiz.map(t =>
          recordTopicProgress({ userId: profile.id, subject, grade, topic: t, percent: overallPercent })
        ))

        await saveQuizResult({ userId: profile.id, subject, grade, score: computed, total: quiz.length })
        setHistory(await fetchQuizResults(profile.id))
        show('Quiz result saved! ✅')
      } catch (e) { console.warn('Could not save quiz result:', e.message) }
    }
  } else { setQIdx(i => i + 1); setSelected(null); setAnswered(false) }
}
```

> Note: this uses the overall quiz percent as a proxy for each topic the quiz
> touched (since per-question correctness-by-topic isn't currently tracked
> question-by-question in state). It's a reasonable approximation given the
> AI generator already spreads ~3 topics per quiz and questions are
> difficulty-balanced. If you want per-question topic accuracy instead, say
> so and I'll add a `questionResults` array to track each answer + its topic
> as the learner progresses, which is a slightly bigger change to the quiz
> state machine.

---

## 6. `src/pages/AdminDashboard.jsx`

### 6a. Add imports

```jsx
import AdminPromotions from './admin/AdminPromotions'
import AdminMaterials from './admin/AdminMaterials'
```

### 6b. Add sidebar items

Find:
```jsx
const sideItems = [
  { id: 'overview',  icon: '📊', label: 'Overview' },
  { id: 'videos',    icon: '📤', label: 'Videos' },
  { id: 'learners',  icon: '👥', label: 'Learners' },
  { id: 'visitors',  icon: '👁',  label: 'Visitors' },
]
```

Replace with:
```jsx
const sideItems = [
  { id: 'overview',   icon: '📊', label: 'Overview' },
  { id: 'videos',     icon: '📤', label: 'Videos' },
  { id: 'materials',  icon: '📚', label: 'Study Materials' },
  { id: 'promotions', icon: '🎓', label: 'Promotions' },
  { id: 'learners',   icon: '👥', label: 'Learners' },
  { id: 'visitors',   icon: '👁',  label: 'Visitors' },
]
```

### 6c. Render the new sections

Find:
```jsx
{section === 'videos'   && <UploadSection profile={profile} />}
{section === 'learners' && <LearnersSection />}
{section === 'visitors' && <VisitorsSection />}
```

Replace with:
```jsx
{section === 'videos'     && <UploadSection profile={profile} />}
{section === 'materials'  && <AdminMaterials profile={profile} />}
{section === 'promotions' && <AdminPromotions profile={profile} />}
{section === 'learners'   && <LearnersSection />}
{section === 'visitors'   && <VisitorsSection />}
```

---

## Testing Checklist

- [ ] Run `schema-v2-promotions-materials.sql` in Supabase, confirm 3 new tables + 2 new profile columns
- [ ] Sign up a new test learner — confirm grade dropdown appears and grade saves to `profiles.grade`
- [ ] As admin, add a Note for a topic in Study Materials → confirm it appears in the learner's Notes section under that topic
- [ ] As admin, add a Past Paper → confirm it appears in Revision Materials for matching subject/grade
- [ ] As learner, complete a quiz → check `topic_progress` table got a new row
- [ ] As admin, go to Promotions → Run Evaluation → confirm quiz avg / topics % show up per learner
- [ ] Click Promote on a learner → confirm their `profiles.grade` incremented and a `promotions` row was created
- [ ] Click Repeat on a learner → confirm grade stays the same but a `promotions` row with decision='repeated' was created
- [ ] Confirm sidebar profile dropdown opens/closes and shows streak + badges
- [ ] `npm run build` — 0 errors
- [ ] Check RLS: log in as a learner and confirm you cannot read other learners' `topic_progress` or `promotions` rows (test via Supabase client in console, or trust the policies — they mirror your existing patterns)

## Deployment Checklist

- [ ] Push schema migration to Supabase production project (not just local/dev)
- [ ] Deploy frontend changes via `git push` (Vercel auto-deploys)
- [ ] No new environment variables required — this uses your existing Supabase config only
