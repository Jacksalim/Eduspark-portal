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
    .single()

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
