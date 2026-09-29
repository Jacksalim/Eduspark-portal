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

// ─── Auth ───────────────────────────────────────────────────────────────────
export async function signUp({ email, password, fullName, phone = '', role = 'student', grade = null }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        role: role === 'parent' ? 'parent' : 'student',
        grade: role === 'student' ? grade : null,
      },
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  })

  // Profile creation is owned by handle_new_user() in supabase/migrations/
  return { data, error }
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  return { data, error }
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function resetPassword(email) {
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/`
    : undefined
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
  return { error }
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return { error }
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(userId, fields) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: fields.full_name?.trim(),
      phone: fields.phone?.trim() || null,
      avatar_url: fields.avatar_url?.trim() || null,
    })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

// ─── Videos ──────────────────────────────────────────────────────────────────
export async function fetchVideos({ subject, grade } = {}) {
  let query = supabase
    .from('videos')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
  if (subject) query = query.eq('subject', subject)
  if (grade) query = query.eq('grade', grade)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function uploadVideo({ title, subject, grade, topic, url, description, uploadedBy }) {
  const { data, error } = await supabase
    .from('videos')
    .insert({
      title, subject, grade, topic, url, description,
      uploaded_by: uploadedBy,
      is_published: true,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteVideo(id) {
  const { error } = await supabase.from('videos').delete().eq('id', id)
  if (error) throw error
}

export async function markVideoWatched(videoId, userId) {
  const { error } = await supabase
    .from('video_watches')
    .upsert(
      { video_id: videoId, user_id: userId, watched_at: new Date().toISOString() },
      { onConflict: 'video_id,user_id' }
    )
  if (error) throw error
}

export async function fetchWatchedIds(userId) {
  const { data, error } = await supabase
    .from('video_watches')
    .select('video_id')
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? []).map(row => row.video_id)
}

// ─── Quiz results ────────────────────────────────────────────────────────────
export async function saveQuizResult({ userId, subject, grade, score, total }) {
  if (!Number.isInteger(score) || !Number.isInteger(total) || total <= 0 || score < 0 || score > total) {
    throw new Error('Invalid quiz score')
  }

  const percent = Math.round((score / total) * 100)
  const { data, error } = await supabase
    .from('quiz_results')
    .insert({ user_id: userId, subject, grade: String(grade), score, total, percent })
    .select()
    .single()
  if (error) throw error
  await upsertProgress(userId, subject, percent)
  return data
}

export async function fetchQuizResults(userId) {
  const { data, error } = await supabase
    .from('quiz_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data ?? []
}

export async function fetchLeaderboard(subject, grade) {
  const { data, error } = await supabase
    .from('quiz_results')
    .select('user_id, percent, score, total, created_at, profiles(full_name)')
    .eq('subject', subject)
    .eq('grade', String(grade))
    .order('percent', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) throw error

  const best = new Map()
  for (const row of data ?? []) {
    if (!best.has(row.user_id) || row.percent > best.get(row.user_id).percent) {
      best.set(row.user_id, row)
    }
  }
  return [...best.values()]
    .sort((a, b) => b.percent - a.percent || a.score - b.score)
    .slice(0, 10)
}

// ─── Progress ────────────────────────────────────────────────────────────────
async function upsertProgress(userId, subject, percent) {
  const { data: existing } = await supabase
    .from('progress')
    .select('percent')
    .eq('user_id', userId)
    .eq('subject', subject)
    .maybeSingle()

  const nextPercent = existing
    ? Math.round((existing.percent + percent) / 2)
    : percent

  const { error } = await supabase
    .from('progress')
    .upsert(
      { user_id: userId, subject, percent: nextPercent, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,subject' }
    )
  if (error) throw error
}

export async function fetchProgress(userId) {
  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', userId)
    .order('subject')
  if (error) throw error
  return data ?? []
}

// ─── Parent/student links ────────────────────────────────────────────────────
/**
 * Fetch all students (users with role='student').
 * The function name "fetchAllLearners" is UI terminology; internally queries role='student'.
 */
export async function fetchAllLearners() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// Alias for naming consistency (DB schema uses 'student' role)
export const fetchAllStudents = fetchAllLearners

export async function fetchChildrenForParent(parentId) {
  const { data, error } = await supabase
    .from('parent_student_links')
    .select('id, parent_id, student_id, status, relationship, created_at, student:profiles!parent_student_links_student_id_fkey(id, full_name, email, grade, avatar_url)')
    .eq('parent_id', parentId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(link => ({
    ...(link.student ?? {}),
    link_id: link.id,
    link_status: link.status,
    relationship: link.relationship,
  }))
}

export async function findLearnerByEmail(email) {
  const { data, error } = await supabase.rpc('find_student_by_email', {
    target_email: email.trim().toLowerCase(),
  })
  if (error) throw error
  if (!data?.length) throw new Error('Student not found')
  return data[0]
}

export async function linkChildToParent(studentId, parentId, relationship = 'parent') {
  const { data, error } = await supabase
    .from('parent_student_links')
    .insert({ parent_id: parentId, student_id: studentId, relationship, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function unlinkChild(studentId, parentId) {
  const { data: link, error: lookupError } = await supabase
    .from('parent_student_links')
    .select('id')
    .eq('student_id', studentId)
    .eq('parent_id', parentId)
    .maybeSingle()
  if (lookupError) throw lookupError
  if (!link) return

  const { error } = await supabase.rpc('unlink_parent_link', {
    link_id: link.id,
    requesting_parent_id: parentId,
  })
  if (error) throw error
}

// ─── Visits ──────────────────────────────────────────────────────────────────
export async function logVisit(page, userId) {
  const { error } = await supabase
    .from('visits')
    .insert({
      page,
      user_id: userId || null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    })
  if (error) console.warn('[visits] Could not log visit:', error.message)
}

export async function fetchVisits() {
  const { data, error } = await supabase
    .from('visits')
    .select('*, profiles(full_name, role)')
    .order('visited_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data ?? []
}

export async function fetchVisitStats() {
  const today = new Date().toISOString().split('T')[0]
  const [todayResult, totalResult] = await Promise.all([
    supabase.from('visits').select('*', { count: 'exact', head: true }).gte('visited_at', today),
    supabase.from('visits').select('*', { count: 'exact', head: true }),
  ])
  return { today: todayResult.count ?? 0, total: totalResult.count ?? 0 }
}

// ─── Notifications ───────────────────────────────────────────────────────────
export async function getNotifications(userId) {
  const { data: sessionData } = await supabase.auth.getSession()
  const id = userId || sessionData.session?.user?.id
  if (!id) return { data: [], error: null }
  const result = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(50)
  return result
}

export async function markNotificationRead(id) {
  return supabase.from('notifications').update({ is_read: true }).eq('id', id)
}

export async function markAllNotificationsRead(userId) {
  const { data: sessionData } = await supabase.auth.getSession()
  const id = userId || sessionData.session?.user?.id
  if (!id) return { data: [], error: null }
  return supabase.from('notifications').update({ is_read: true }).eq('user_id', id).eq('is_read', false)
}

// ─── Topic progress and promotions ───────────────────────────────────────────
export async function recordTopicProgress({ userId, subject, grade, topic, percent }) {
  const { data: existing } = await supabase
    .from('topic_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('subject', subject)
    .eq('grade', String(grade))
    .eq('topic', topic)
    .maybeSingle()

  const { error } = await supabase.from('topic_progress').upsert({
    user_id: userId,
    subject,
    grade: String(grade),
    topic,
    attempts: (existing?.attempts ?? 0) + 1,
    best_percent: Math.max(existing?.best_percent ?? 0, percent),
    covered: existing?.covered || percent >= 70,
    last_attempt_at: new Date().toISOString(),
  }, { onConflict: 'user_id,subject,grade,topic' })
  if (error) throw error
}

export async function computePromotionEligibility(userId, grade) {
  const [{ data: results, error: resultsError }, { data: topics, error: topicsError }] = await Promise.all([
    supabase.from('quiz_results').select('percent').eq('user_id', userId).eq('grade', String(grade)),
    supabase.from('topic_progress').select('covered').eq('user_id', userId).eq('grade', String(grade)),
  ])
  if (resultsError) throw resultsError
  if (topicsError) throw topicsError

  const quizAverage = results?.length
    ? Math.round(results.reduce((sum, row) => sum + row.percent, 0) / results.length)
    : 0
  const topicsCoveredPercent = topics?.length
    ? Math.round((topics.filter(row => row.covered).length / topics.length) * 100)
    : 0

  return {
    quizAverage,
    topicsCoveredPercent,
    eligible: quizAverage >= 65 && topicsCoveredPercent >= 65,
    quizCount: results?.length ?? 0,
    topicCount: topics?.length ?? 0,
  }
}

function nextGrade(grade) {
  if (String(grade) === 'R') return '1'
  const number = Number.parseInt(grade, 10)
  return number >= 12 ? null : String(number + 1)
}

export async function recordPromotionDecision({
  userId, fromGrade, academicYear, quizAverage, topicsCoveredPercent, decision, decidedBy, notes,
}) {
  const toGrade = decision === 'promoted' ? (nextGrade(fromGrade) || String(fromGrade)) : String(fromGrade)
  const { data, error } = await supabase
    .from('promotions')
    .insert({
      user_id: userId,
      from_grade: String(fromGrade),
      to_grade: toGrade,
      academic_year: academicYear,
      quiz_average: quizAverage,
      topics_covered_percent: topicsCoveredPercent,
      decision,
      decided_by: decidedBy,
      notes: notes || null,
    })
    .select()
    .single()
  if (error) throw error

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ grade: toGrade, current_academic_year: academicYear, last_promotion_id: data.id })
    .eq('id', userId)
  if (updateError) throw updateError
  return data
}

export async function fetchPromotionHistory(userId) {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ─── Study materials ─────────────────────────────────────────────────────────
export async function fetchStudyMaterials({ type, subject, grade, topic } = {}) {
  let query = supabase.from('study_materials').select('*').order('created_at', { ascending: false })
  if (type) query = query.eq('type', type)
  if (subject) query = query.eq('subject', subject)
  if (grade) query = query.eq('grade', String(grade))
  if (topic) query = query.eq('topic', topic)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createStudyMaterial({ type, subject, grade, topic, title, year, content, createdBy }) {
  if (type === 'note' && !topic?.trim()) throw new Error('Topic is required for notes')
  if (type === 'past_paper' && !year?.trim()) throw new Error('Year is required for past papers')
  const { data, error } = await supabase
    .from('study_materials')
    .insert({
      type, subject, grade: String(grade), topic: topic?.trim() || null,
      title: title.trim(), year: year?.trim() || null, content, created_by: createdBy,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStudyMaterial(id, fields) {
  if (fields.type === 'note' && !fields.topic?.trim()) throw new Error('Topic is required for notes')
  if (fields.type === 'past_paper' && !fields.year?.trim()) throw new Error('Year is required for past papers')
  const { error } = await supabase
    .from('study_materials')
    .update({
      ...fields,
      grade: String(fields.grade),
      topic: fields.topic?.trim() || null,
      year: fields.year?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteStudyMaterial(id) {
  const { error } = await supabase.from('study_materials').delete().eq('id', id)
  if (error) throw error
}
