import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function signUp({ email, password, name, role, grade }) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, role, grade } } })
  if (error) throw error
  if (data.user) {
    const { error: pe } = await supabase.from('profiles').insert({ id: data.user.id, name, role, grade: grade || null, email })
    if (pe) console.warn('Profile insert error:', pe.message)
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
  const [{ count: todayCount }, { count: total }] = await Promise.all([
    supabase.from('visits').select('*', { count: 'exact', head: true }).gte('visited_at', today),
    supabase.from('visits').select('*', { count: 'exact', head: true })
  ])
  return { today: todayCount || 0, total: total || 0 }
}
