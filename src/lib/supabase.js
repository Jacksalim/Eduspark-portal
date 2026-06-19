import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Auth ─────────────────────────────────────────────────────────────────────

// Helper: fire-and-forget branded email via /api/send-email (non-blocking)
function sendEmail(payload) {
  fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(err => console.warn('[email] send-email call failed (non-fatal):', err.message))
}

export async function signUp({ email, password, name, role, grade }) {
  // emailRedirectTo tells Supabase where to send users after clicking the
  // confirmation link in the verification email. Must be listed in:
  //   Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
  const emailRedirectTo = typeof window !== 'undefined' ? window.location.origin : undefined

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role, grade },
      emailRedirectTo,
    },
  })
  if (error) throw error

  if (data.user) {
    const { error: pe } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, name, role, grade: grade || null, email })
    if (pe) console.warn('Profile insert error:', pe.message)

    // Send branded welcome email via Resend (non-blocking — won't break signup if it fails)
    sendEmail({ type: 'welcome', to: email, name, role })
  }

  return data
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function resetPassword(email) {
  // redirectTo must be listed in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
  // Supabase appends #access_token=...&type=recovery to this URL so PasswordResetPage can intercept it.
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/`
    : undefined

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
  if (error) throw error
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

// ─── Videos ───────────────────────────────────────────────────────────────────
export async function fetchVideos({ subject, grade } = {}) {
  let q = supabase.from('videos').select('*').order('created_at', { ascending: false })
  if (subject) q = q.eq('subject', subject)
  if (grade) q = q.eq('grade', grade)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function uploadVideo({ title, subject, grade, topic, url, description, uploadedBy }) {
  const { data, error } = await supabase.from('videos').insert({ title, subject, grade, topic, url, description, uploaded_by: uploadedBy }).select().single()
  if (error) throw error
  return data
}

export async function deleteVideo(id) {
  const { error } = await supabase.from('videos').delete().eq('id', id)
  if (error) throw error
}

export async function markVideoWatched(videoId, userId) {
  await supabase.from('video_watches').upsert({ video_id: videoId, user_id: userId, watched_at: new Date().toISOString() }, { onConflict: 'video_id,user_id' })
}

export async function fetchWatchedIds(userId) {
  const { data } = await supabase.from('video_watches').select('video_id').eq('user_id', userId)
  return (data || []).map(r => r.video_id)
}

// ─── Quiz Results ─────────────────────────────────────────────────────────────
export async function saveQuizResult({ userId, subject, grade, score, total }) {
  const percent = Math.round((score / total) * 100)
  const { data, error } = await supabase.from('quiz_results').insert({ user_id: userId, subject, grade, score, total, percent }).select().single()
  if (error) throw error
  await upsertProgress(userId, subject, percent)
  return data
}

export async function fetchQuizResults(userId) {
  const { data, error } = await supabase.from('quiz_results').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
  if (error) throw error
  return data || []
}

export async function fetchLeaderboard(subject, grade) {
  const { data, error } = await supabase
    .from('quiz_results')
    .select('user_id, percent, score, total, created_at, profiles(name)')
    .eq('subject', subject)
    .eq('grade', grade)
    .order('percent', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) throw error

  // Keep only each user's best attempt, then take top 10
  const best = new Map()
  for (const r of (data || [])) {
    if (!best.has(r.user_id) || r.percent > best.get(r.user_id).percent) {
      best.set(r.user_id, r)
    }
  }
  return [...best.values()]
    .sort((a, b) => b.percent - a.percent || a.score - b.score)
    .slice(0, 10)
}

// ─── Progress ─────────────────────────────────────────────────────────────────
async function upsertProgress(userId, subject, percent) {
  const { data: ex } = await supabase.from('progress').select('percent').eq('user_id', userId).eq('subject', subject).single()
  const newPct = ex ? Math.round((ex.percent + percent) / 2) : percent
  await supabase.from('progress').upsert({ user_id: userId, subject, percent: newPct, updated_at: new Date().toISOString() }, { onConflict: 'user_id,subject' })
}

export async function fetchProgress(userId) {
  const { data, error } = await supabase.from('progress').select('*').eq('user_id', userId)
  if (error) throw error
  return data || []
}

// ─── Admin ────────────────────────────────────────────────────────────────────
export async function fetchAllLearners() {
  const { data, error } = await supabase.from('profiles').select('*').eq('role', 'learner').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchChildrenForParent(parentId) {
  const { data, error } = await supabase.from('profiles').select('*, progress(*), quiz_results(*)').eq('parent_id', parentId)
  if (error) throw error
  return data || []
}

export async function findLearnerByEmail(email) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, grade, email')
    .eq('email', email.trim().toLowerCase())
    .eq('role', 'learner')
    .single()
  if (error) throw error
  return data
}

export async function linkChildToParent(learnerId, parentId) {
  const { error } = await supabase
    .from('profiles')
    .update({ parent_id: parentId })
    .eq('id', learnerId)
    .eq('role', 'learner')
  if (error) throw error
}

export async function unlinkChild(learnerId) {
  const { error } = await supabase
    .from('profiles')
    .update({ parent_id: null })
    .eq('id', learnerId)
  if (error) throw error
}

// ─── Visits ───────────────────────────────────────────────────────────────────
export async function logVisit(page, userId) {
  await supabase.from('visits').insert({ page, user_id: userId || null, visited_at: new Date().toISOString() })
}

export async function fetchVisits() {
  const { data, error } = await supabase.from('visits').select('*, profiles(name, role)').order('visited_at', { ascending: false }).limit(100)
  if (error) throw error
  return data || []
}

export async function fetchVisitStats() {
  const today = new Date().toISOString().split('T')[0]
  const [todayResult, totalResult] = await Promise.all([
    supabase.from('visits').select('*', { count: 'exact', head: true }).gte('visited_at', today),
    supabase.from('visits').select('*', { count: 'exact', head: true })
  ])
  return {
    today: todayResult?.count ?? 0,
    total: totalResult?.count ?? 0
  }
}
// ════════════════════════════════════════════════════════════════════════════
// ADD THESE TO src/lib/supabase.js
// Paste at the end of the file (after the existing fetchVisitStats function).
// ════════════════════════════════════════════════════════════════════════════

// ─── Topic Progress (drives promotion threshold) ───────────────────────────────

// Call this after a quiz is scored, once per topic that appeared in the quiz.
// percent = the learner's score % on questions for that specific topic in this attempt.
export async function recordTopicProgress({ userId, subject, grade, topic, percent }) {
  const { data: existing } = await supabase
    .from('topic_progress')
    .select('*')
    .eq('user_id', userId).eq('subject', subject).eq('grade', grade).eq('topic', topic)
    .maybeSingle()

  const attempts = (existing?.attempts || 0) + 1
  const bestPercent = Math.max(existing?.best_percent || 0, percent)
  // A topic is "covered" once the learner has scored 70%+ on it at least once.
  const covered = existing?.covered || percent >= 70

  await supabase.from('topic_progress').upsert({
    user_id: userId, subject, grade, topic,
    attempts, best_percent: bestPercent, covered,
    last_attempt_at: new Date().toISOString(),
  }, { onConflict: 'user_id,subject,grade,topic' })
}

export async function fetchTopicProgress(userId, grade) {
  let q = supabase.from('topic_progress').select('*').eq('user_id', userId)
  if (grade) q = q.eq('grade', grade)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

// ─── Promotion Eligibility & Decisions ─────────────────────────────────────────

// Computes the combined threshold: quiz average + % of topics covered for the
// learner's current grade. Used by the admin Promotions screen.
export async function computePromotionEligibility(userId, grade) {
  const [{ data: results }, { data: topics }] = await Promise.all([
    supabase.from('quiz_results').select('percent').eq('user_id', userId).eq('grade', grade),
    supabase.from('topic_progress').select('covered').eq('user_id', userId).eq('grade', grade),
  ])

  const quizAverage = results?.length
    ? Math.round(results.reduce((a, r) => a + r.percent, 0) / results.length)
    : 0

  const topicsCoveredPercent = topics?.length
    ? Math.round((topics.filter(t => t.covered).length / topics.length) * 100)
    : 0

  // Combined threshold: both must clear 65% to be promotion-eligible.
  const eligible = quizAverage >= 65 && topicsCoveredPercent >= 65

  return { quizAverage, topicsCoveredPercent, eligible, quizCount: results?.length || 0, topicCount: topics?.length || 0 }
}

function nextGrade(grade) {
  if (grade === 'R') return '1'
  const n = parseInt(grade, 10)
  return n >= 12 ? null : String(n + 1) // null = already at the top (Grade 12)
}

export async function recordPromotionDecision({ userId, fromGrade, academicYear, quizAverage, topicsCoveredPercent, decision, decidedBy, notes }) {
  const toGrade = decision === 'promoted' ? (nextGrade(fromGrade) || fromGrade) : fromGrade

  const { data, error } = await supabase.from('promotions').insert({
    user_id: userId, from_grade: fromGrade, to_grade: toGrade, academic_year: academicYear,
    quiz_average: quizAverage, topics_covered_percent: topicsCoveredPercent,
    decision, decided_by: decidedBy, notes: notes || null,
  }).select().single()
  if (error) throw error

  // Apply the grade change + bookkeeping to the learner's profile
  await supabase.from('profiles').update({
    grade: toGrade, current_academic_year: academicYear, last_promotion_id: data.id,
  }).eq('id', userId)

  return data
}

export async function fetchPromotionHistory(userId) {
  const { data, error } = await supabase
    .from('promotions').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ─── Study Materials (Notes + Revision / Past Papers) ──────────────────────────

export async function fetchStudyMaterials({ type, subject, grade, topic } = {}) {
  let q = supabase.from('study_materials').select('*').order('created_at', { ascending: false })
  if (type)    q = q.eq('type', type)
  if (subject) q = q.eq('subject', subject)
  if (grade)   q = q.eq('grade', grade)
  if (topic)   q = q.eq('topic', topic)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function createStudyMaterial({ type, subject, grade, topic, title, year, content, createdBy }) {
  const { data, error } = await supabase.from('study_materials').insert({
    type, subject, grade, topic: topic || null, title, year: year || null, content, created_by: createdBy,
  }).select().single()
  if (error) throw error
  return data
}

export async function updateStudyMaterial(id, fields) {
  const { error } = await supabase.from('study_materials')
    .update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteStudyMaterial(id) {
  const { error } = await supabase.from('study_materials').delete().eq('id', id)
  if (error) throw error
}
