// api/lib/aiProvider.js
// ═════════════════════════════════════════════════════════════════════════════
// AI Provider abstraction — Gemini primary, Anthropic fallback
// Production-ready for Vercel with health checks, retry logic, and logging
// ═════════════════════════════════════════════════════════════════════════════

const TIMEOUT_MS = 25000 // 25s — under Vercel's 30s function limit

// ── Supported subjects and grades ─────────────────────────────────────────────
export const SUPPORTED_SUBJECTS = [
  'Mathematics',
  'English',
  'Science',
  'Social Studies',
  'ICT'
]

export const SUPPORTED_GRADES = Array.from({ length: 12 }, (_, i) => i + 1) // Grades 1-12

// ── Validate input ────────────────────────────────────────────────────────────
export function validateInput(grade, subject) {
  const errors = []
  
  if (!grade) errors.push('Grade is required')
  else if (!Number.isInteger(Number(grade)) || grade < 1 || grade > 12) {
    errors.push(`Grade must be 1-12, got ${grade}`)
  }
  
  if (!subject) errors.push('Subject is required')
  else if (!SUPPORTED_SUBJECTS.includes(subject)) {
    errors.push(`Subject must be one of: ${SUPPORTED_SUBJECTS.join(', ')}, got "${subject}"`)
  }
  
  return { valid: errors.length === 0, errors }
}

// ── Shared prompt builder ─────────────────────────────────────────────────────
export function buildPrompt(grade, subject) {
  return `Generate a 5-question multiple choice quiz for Grade ${grade} ${subject} students aligned with the Kenyan CBC and South African CAPS curriculum.

Rules:
- Questions must be appropriate for Grade ${grade} learners
- Cover different topics within ${subject}
- Mix difficulty: 2 easy, 2 medium, 1 hard
- Explanations must be clear, concise, and educational
- Each question must have exactly 4 distinct options
- Avoid trick questions or ambiguous wording
- Ensure questions are culturally relevant and appropriate

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

CRITICAL: correctAnswer must be the exact string of the correct option.`
}

// ── Timeout wrapper ───────────────────────────────────────────────────────────
export function withTimeout(promise, ms = TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    )
  ])
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
  if (start === -1 || end === -1) throw new Error('No JSON object found in response')
  return clean.slice(start, end + 1)
}

// ── Quiz validator ────────────────────────────────────────────────────────────
export function validateQuiz(parsed) {
  if (!parsed || typeof parsed !== 'object') throw new Error('Response is not an object')
  if (!Array.isArray(parsed.questions)) throw new Error('Missing questions array')
  if (parsed.questions.length === 0) throw new Error('Questions array is empty')
  if (parsed.questions.length !== 5) throw new Error(`Expected 5 questions, got ${parsed.questions.length}`)
  
  parsed.questions.forEach((q, i) => {
    if (!q.question || typeof q.question !== 'string') throw new Error(`Question ${i + 1} missing or invalid "question" field`)
    if (!Array.isArray(q.options) || q.options.length !== 4) throw new Error(`Question ${i + 1} must have exactly 4 options`)
    if (!q.correctAnswer) throw new Error(`Question ${i + 1} missing "correctAnswer"`)
    if (!q.options.includes(q.correctAnswer)) throw new Error(`Question ${i + 1} correctAnswer "${q.correctAnswer}" not in options`)
    if (!q.explanation || typeof q.explanation !== 'string') throw new Error(`Question ${i + 1} missing or invalid "explanation"`)
  })
  return true
}

// ── Logger with structured output ─────────────────────────────────────────────
export const log = {
  info:  (msg, data) => console.log(`[EduSpark AI] INFO  ${msg}`, data ? JSON.stringify(data) : ''),
  ok:    (msg, data) => console.log(`[EduSpark AI] ✓ OK    ${msg}`, data ? JSON.stringify(data) : ''),
  warn:  (msg, data) => console.warn(`[EduSpark AI] ⚠ WARN  ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg, data) => console.error(`[EduSpark AI] ✗ ERROR ${msg}`, data ? JSON.stringify(data) : ''),
  debug: (msg, data) => {
    if (process.env.DEBUG_EDUSPARK) {
      console.debug(`[EduSpark AI] DEBUG ${msg}`, data ? JSON.stringify(data) : '')
    }
  }
}

// ── Provider health check ─────────────────────────────────────────────────────
export function checkProviderKeys() {
  const gemini    = !!process.env.GEMINI_API_KEY
  const anthropic = !!process.env.ANTHROPIC_API_KEY
  
  return {
    gemini: {
      available: gemini,
      configured: gemini ? '✓' : '✗',
      message: gemini ? 'Configured' : 'Missing GEMINI_API_KEY'
    },
    anthropic: {
      available: anthropic,
      configured: anthropic ? '✓' : '✗',
      message: anthropic ? 'Configured' : 'Missing ANTHROPIC_API_KEY'
    },
    primary: 'gemini',
    fallback: 'anthropic',
    any: gemini || anthropic
  }
}

// ── Health summary for logging ────────────────────────────────────────────────
export function logProviderHealth() {
  const health = checkProviderKeys()
  if (!health.any) {
    log.error('No providers configured!', {
      required: ['GEMINI_API_KEY', 'ANTHROPIC_API_KEY'],
      setup: 'Visit Vercel → Settings → Environment Variables'
    })
  } else {
    log.ok('Provider health check', {
      gemini: health.gemini.message,
      anthropic: health.anthropic.message
    })
  }
}