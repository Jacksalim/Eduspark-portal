// api/lib/aiProvider.js
// ═════════════════════════════════════════════════════════════════════════════
// AI Provider abstraction — Gemini primary, Anthropic fallback
// Production-ready for Vercel with health checks, retry logic, and logging
// ═════════════════════════════════════════════════════════════════════════════

export const TIMEOUT_MS = 25000 // 25s — under Vercel's 30s function limit
export const MAX_RETRIES = 2    // retry twice per provider before switching

// ── Supported subjects and grades ─────────────────────────────────────────────
export const SUPPORTED_SUBJECTS = [
  'Mathematics',
  'English',
  'Science',
  'Social Studies',
  'ICT',
  'Life Skills',
  'History',
  'Geography',
]

export const SUPPORTED_GRADES = Array.from({ length: 12 }, (_, i) => i + 1) // 1–12

// ── Validate input ────────────────────────────────────────────────────────────
export function validateInput(grade, subject) {
  const errors = []
  const g = Number(grade)
  if (!grade && grade !== 0) errors.push('Grade is required')
  else if (!Number.isInteger(g) || g < 1 || g > 12) errors.push(`Grade must be 1–12, got "${grade}"`)
  if (!subject) errors.push('Subject is required')
  else if (!SUPPORTED_SUBJECTS.includes(subject)) {
    errors.push(`Subject must be one of: ${SUPPORTED_SUBJECTS.join(', ')}. Got "${subject}"`)
  }
  return { valid: errors.length === 0, errors }
}

// ── Shared prompt builder ─────────────────────────────────────────────────────
export function buildPrompt(grade, subject) {
  return `Generate a 5-question multiple choice quiz for Grade ${grade} ${subject} students aligned with the Kenyan CBC curriculum.

Rules:
- Questions must be appropriate for Grade ${grade} learners
- Cover different topics within ${subject}
- Mix difficulty: 2 easy, 2 medium, 1 challenging
- Explanations must be clear, concise, and educational
- Each question must have exactly 4 distinct options
- Avoid trick questions or ambiguous wording

Return ONLY valid JSON — no markdown, no backticks, no preamble — exactly this structure:
{
  "questions": [
    {
      "question": "question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "why this answer is correct"
    }
  ]
}

CRITICAL: "correctAnswer" must be the exact full string of the correct option (not an index).`
}

// ── Timeout wrapper ───────────────────────────────────────────────────────────
export function withTimeout(promise, ms = TIMEOUT_MS) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// ── JSON extractor — strips markdown fences safely ───────────────────────────
export function extractJSON(text) {
  if (!text) throw new Error('Empty response from AI provider')
  const clean = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found in AI response')
  return clean.slice(start, end + 1)
}

// ── Quiz validator ────────────────────────────────────────────────────────────
export function validateQuiz(parsed) {
  if (!parsed || typeof parsed !== 'object') throw new Error('Response is not a JSON object')
  if (!Array.isArray(parsed.questions)) throw new Error('Missing "questions" array in response')
  if (parsed.questions.length === 0) throw new Error('Questions array is empty')
  if (parsed.questions.length !== 5) throw new Error(`Expected 5 questions, got ${parsed.questions.length}`)

  parsed.questions.forEach((q, i) => {
    const n = i + 1
    if (!q.question || typeof q.question !== 'string') throw new Error(`Question ${n}: missing or invalid "question" field`)
    if (!Array.isArray(q.options) || q.options.length !== 4) throw new Error(`Question ${n}: must have exactly 4 options`)
    if (q.options.some(o => typeof o !== 'string' || !o.trim())) throw new Error(`Question ${n}: all options must be non-empty strings`)
    if (!q.correctAnswer || typeof q.correctAnswer !== 'string') throw new Error(`Question ${n}: missing "correctAnswer" field`)
    if (!q.options.includes(q.correctAnswer)) throw new Error(`Question ${n}: correctAnswer "${q.correctAnswer}" not found in options`)
    if (!q.explanation || typeof q.explanation !== 'string') throw new Error(`Question ${n}: missing or invalid "explanation" field`)
  })
  return true
}

// ── Structured logger ─────────────────────────────────────────────────────────
export const log = {
  info:   (msg, data) => console.log(`[EduSpark AI] ℹ INFO   ${msg}`, data ? JSON.stringify(data) : ''),
  ok:     (msg, data) => console.log(`[EduSpark AI] ✓ OK     ${msg}`, data ? JSON.stringify(data) : ''),
  warn:   (msg, data) => console.warn(`[EduSpark AI] ⚠ WARN   ${msg}`, data ? JSON.stringify(data) : ''),
  error:  (msg, data) => console.error(`[EduSpark AI] ✗ ERROR  ${msg}`, data ? JSON.stringify(data) : ''),
  switch: (from, to, reason) => console.warn(`[EduSpark AI] 🔄 SWITCH ${from} → ${to} | Reason: ${reason}`),
}

// ── Provider health check ─────────────────────────────────────────────────────
export function checkProviderKeys() {
  const gemini    = !!process.env.GEMINI_API_KEY
  const anthropic = !!process.env.ANTHROPIC_API_KEY
  return {
    gemini:    { available: gemini,    message: gemini    ? 'Configured ✓' : 'Missing GEMINI_API_KEY' },
    anthropic: { available: anthropic, message: anthropic ? 'Configured ✓' : 'Missing ANTHROPIC_API_KEY' },
    primary:  'gemini',
    fallback: 'anthropic',
    any: gemini || anthropic,
  }
}

export function logProviderHealth() {
  const h = checkProviderKeys()
  if (!h.any) {
    log.error('No AI providers configured!', {
      required: ['GEMINI_API_KEY', 'ANTHROPIC_API_KEY'],
      hint: 'Add these in Vercel → Project → Settings → Environment Variables',
    })
  } else {
    log.ok('Provider health', { gemini: h.gemini.message, anthropic: h.anthropic.message })
  }
}