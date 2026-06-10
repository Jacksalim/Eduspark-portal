// api/lib/aiProvider.js
// ─────────────────────────────────────────────────────────────────────────────
// AI Provider abstraction — Gemini primary, Anthropic fallback
// ─────────────────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 25000 // 25s — under Vercel's 30s function limit

// ── Shared prompt builder ─────────────────────────────────────────────────────
export function buildPrompt(grade, subject) {
  return `Generate a 5-question multiple choice quiz for Grade ${grade} ${subject} students aligned with the Kenyan CBC and South African CAPS curriculum.

Rules:
- Questions must be appropriate for Grade ${grade} learners
- Cover different topics within ${subject}
- Mix difficulty: 2 easy, 2 medium, 1 hard
- Explanations must be clear and educational
- Each question must have exactly 4 options

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

correctAnswer must be the exact string of the correct option.`
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
  parsed.questions.forEach((q, i) => {
    if (!q.question) throw new Error(`Question ${i + 1} missing "question" field`)
    if (!Array.isArray(q.options) || q.options.length !== 4) throw new Error(`Question ${i + 1} must have exactly 4 options`)
    if (!q.correctAnswer) throw new Error(`Question ${i + 1} missing "correctAnswer"`)
    if (!q.options.includes(q.correctAnswer)) throw new Error(`Question ${i + 1} correctAnswer not in options`)
  })
  return true
}

// ── Logger ────────────────────────────────────────────────────────────────────
export const log = {
  info:  (msg, data) => console.log(`[EduSpark AI] INFO  ${msg}`, data ? JSON.stringify(data) : ''),
  ok:    (msg, data) => console.log(`[EduSpark AI] OK    ${msg}`, data ? JSON.stringify(data) : ''),
  warn:  (msg, data) => console.warn(`[EduSpark AI] WARN  ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg, data) => console.error(`[EduSpark AI] ERROR ${msg}`, data ? JSON.stringify(data) : ''),
}

// ── Provider health check ─────────────────────────────────────────────────────
export function checkProviderKeys() {
  const gemini    = !!process.env.GEMINI_API_KEY
  const anthropic = !!process.env.ANTHROPIC_KEY
  return { gemini, anthropic, any: gemini || anthropic }
}