// api/lib/aiProvider.js
// ═════════════════════════════════════════════════════════════════════════════
// AI Provider abstraction — Gemini primary, Anthropic fallback
// ═════════════════════════════════════════════════════════════════════════════

export const TIMEOUT_MS = 25000
export const MAX_RETRIES = 2

export const SUPPORTED_SUBJECTS = [
  'Mathematics', 'English', 'Science', 'Social Studies',
  'ICT', 'Life Skills', 'History', 'Geography',
]
export const SUPPORTED_GRADES = Array.from({ length: 12 }, (_, i) => i + 1)

// ── Topic banks per subject (CBC-aligned) ────────────────────────────────────
export const TOPIC_BANKS = {
  Mathematics: [
    'Number Operations', 'Fractions and Decimals', 'Algebra and Equations',
    'Geometry and Shapes', 'Measurement and Units', 'Data and Statistics',
    'Ratios and Proportions', 'Percentages', 'Patterns and Sequences',
    'Word Problems', 'Time and Calendar', 'Money and Finance',
    'Indices and Powers', 'Probability', 'Coordinate Geometry',
  ],
  English: [
    'Grammar and Punctuation', 'Comprehension', 'Vocabulary and Spelling',
    'Creative Writing', 'Poetry', 'Sentence Structure', 'Parts of Speech',
    'Reading Skills', 'Oral Communication', 'Letter Writing',
    'Proverbs and Idioms', 'Tenses', 'Direct and Indirect Speech',
  ],
  Science: [
    'Living Things', 'Human Body', 'Plants and Photosynthesis',
    'Animals and Habitats', 'Matter and Materials', 'Forces and Motion',
    'Energy and Light', 'Sound', 'Electricity and Magnetism',
    'Earth and Space', 'Weather and Climate', 'Ecosystems',
    'Chemical Changes', 'Health and Nutrition', 'Simple Machines',
  ],
  'Social Studies': [
    'Kenya Geography', 'Kenyan History', 'Government and Citizenship',
    'African Countries', 'Natural Resources', 'Trade and Economy',
    'Culture and Heritage', 'Human Rights', 'Environmental Conservation',
    'Transport and Communication', 'Population and Settlement',
  ],
  ICT: [
    'Computer Basics', 'Internet Safety', 'Word Processing',
    'Spreadsheets', 'Presentations', 'Programming Concepts',
    'Digital Communication', 'Data Storage', 'Computer Networks',
    'Cybersecurity', 'Digital Citizenship',
  ],
  'Life Skills': [
    'Personal Hygiene', 'Emotional Intelligence', 'Decision Making',
    'Conflict Resolution', 'Healthy Relationships', 'Goal Setting',
    'Time Management', 'Critical Thinking', 'Leadership',
    'Civic Responsibility', 'Financial Literacy',
  ],
  History: [
    'Pre-colonial Africa', 'Colonial Period', 'Independence Movements',
    'Kenyan Heroes', 'World Wars', 'Ancient Civilisations',
    'African Kingdoms', 'Cold War Era', 'Modern Kenya',
    'East African Community', 'Human Rights Movements',
  ],
  Geography: [
    'Map Reading', 'Weather and Climate', 'Landforms',
    'Water Bodies', 'Vegetation Zones', 'Population Distribution',
    'Natural Disasters', 'Environmental Issues', 'Trade Routes',
    'Urban and Rural Settlement', 'East African Region',
  ],
}

// ── Question type definitions ─────────────────────────────────────────────────
export const QUESTION_TYPES = {
  multiple_choice: 'multiple choice with 4 options',
  true_false: 'true/false (options must be exactly ["True", "False"])',
  fill_blank: 'fill in the blank (provide 4 plausible word/phrase options)',
  scenario: 'scenario-based with a real-world situation and 4 options',
}

// ── Difficulty config ─────────────────────────────────────────────────────────
export const DIFFICULTIES = ['easy', 'medium', 'hard', 'mixed']

export const DIFFICULTY_INSTRUCTIONS = {
  easy:   "All 5 questions should be straightforward recall or recognition (Bloom's: remember/understand).",
  medium: "All 5 questions should require application or analysis (Bloom's: apply/analyse).",
  hard:   "All 5 questions should require evaluation or synthesis (Bloom's: evaluate/create).",
  mixed:  '2 easy recall questions, 2 medium application questions, 1 hard evaluative question.',
}

// ── Utility: pick N random items from array ───────────────────────────────────
export function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, arr.length))
}

// ── Utility: shuffle array ────────────────────────────────────────────────────
export function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// ── Utility: generate variation seed ─────────────────────────────────────────
export function variationSeed() {
  const adjectives = ['creative', 'analytical', 'practical', 'conceptual', 'challenging', 'exploratory', 'applied', 'critical']
  const nouns      = ['perspective', 'approach', 'angle', 'context', 'framing', 'scenario', 'dimension', 'viewpoint']
  const adj  = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adj}-${noun}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ── Build AI prompt with full variation parameters ────────────────────────────
export function buildPrompt({ grade, subject, topics, difficulty, questionTypes, recentQuestions, seed }) {
  const topicStr   = topics.join(', ')
  const diffInstr  = DIFFICULTY_INSTRUCTIONS[difficulty] || DIFFICULTY_INSTRUCTIONS.mixed
  const typeInstrs = questionTypes.map(t => `- ${QUESTION_TYPES[t]}`).join('\n')

  const avoidSection = recentQuestions?.length
    ? `\nAVOID repeating these recent questions (paraphrase or pick entirely different angles):\n${recentQuestions.map((q, i) => `${i + 1}. "${q}"`).join('\n')}\n`
    : ''

  return `You are an expert Kenyan CBC curriculum quiz writer. Generate exactly 5 unique quiz questions.

VARIATION SEED: ${seed}
TIMESTAMP: ${new Date().toISOString()}

PARAMETERS:
- Grade: ${grade}
- Subject: ${subject}
- Topics to cover: ${topicStr}
- Difficulty: ${difficulty.toUpperCase()}
- ${diffInstr}

QUESTION TYPES TO USE (rotate through these):
${typeInstrs}

LEARNING OBJECTIVES:
- Test genuine understanding, not just memorisation
- Use real-world Kenyan contexts and examples where possible
- Each question must cover a DIFFERENT aspect or topic
- Use varied sentence structures and question stems
${avoidSection}
STRICT RULES:
- No two questions may test the same fact or concept
- No duplicate answer options within any question
- correctAnswer must be the EXACT string of one of the options
- For true/false: options must be exactly ["True", "False"]
- Explanations must be educational, 1-2 sentences
- Wording must be age-appropriate for Grade ${grade}

Return ONLY valid JSON — no markdown, no code fences, no preamble:
{
  "questions": [
    {
      "question": "question text",
      "type": "multiple_choice",
      "topic": "specific topic covered",
      "difficulty": "easy|medium|hard",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "clear educational explanation"
    }
  ]
}`
}

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

// ── Timeout wrapper ───────────────────────────────────────────────────────────
export function withTimeout(promise, ms = TIMEOUT_MS) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// ── JSON extractor ────────────────────────────────────────────────────────────
export function extractJSON(text) {
  if (!text) throw new Error('Empty response from AI provider')
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const start = clean.indexOf('{')
  const end   = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found in AI response')
  return clean.slice(start, end + 1)
}

// ── Quiz validator ────────────────────────────────────────────────────────────
export function validateQuiz(parsed) {
  if (!parsed || typeof parsed !== 'object') throw new Error('Response is not a JSON object')
  if (!Array.isArray(parsed.questions))       throw new Error('Missing "questions" array')
  if (parsed.questions.length === 0)          throw new Error('Questions array is empty')
  if (parsed.questions.length !== 5)          throw new Error(`Expected 5 questions, got ${parsed.questions.length}`)

  const seenQuestions = new Set()
  parsed.questions.forEach((q, i) => {
    const n = i + 1
    if (!q.question || typeof q.question !== 'string') throw new Error(`Q${n}: missing "question"`)
    if (!Array.isArray(q.options) || q.options.length < 2) throw new Error(`Q${n}: must have at least 2 options`)
    if (q.options.some(o => typeof o !== 'string' || !o.trim())) throw new Error(`Q${n}: options must be non-empty strings`)
    const uniqueOpts = new Set(q.options.map(o => o.trim().toLowerCase()))
    if (uniqueOpts.size !== q.options.length) throw new Error(`Q${n}: duplicate answer options`)
    if (!q.correctAnswer || typeof q.correctAnswer !== 'string') throw new Error(`Q${n}: missing "correctAnswer"`)
    if (!q.options.includes(q.correctAnswer)) throw new Error(`Q${n}: correctAnswer not in options`)
    if (!q.explanation || typeof q.explanation !== 'string') throw new Error(`Q${n}: missing "explanation"`)
    const qKey = q.question.trim().toLowerCase().slice(0, 60)
    if (seenQuestions.has(qKey)) throw new Error(`Q${n}: duplicate question detected`)
    seenQuestions.add(qKey)
  })
  return true
}

// ── Post-process: shuffle options (keeping correctAnswer in sync) ─────────────
export function shuffleOptions(questions) {
  return questions.map(q => {
    const shuffled = shuffle(q.options)
    return { ...q, options: shuffled }
  })
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
    any: gemini || anthropic,
  }
}

export function logProviderHealth() {
  const h = checkProviderKeys()
  if (!h.any) {
    log.error('No AI providers configured!', { required: ['GEMINI_API_KEY', 'ANTHROPIC_API_KEY'] })
  } else {
    log.ok('Provider health', { gemini: h.gemini.message, anthropic: h.anthropic.message })
  }
}