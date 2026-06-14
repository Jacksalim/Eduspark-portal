// api/lib/generateQuiz.js
// ─────────────────────────────────────────────────────────────────────────────
// Multi-provider quiz generation with full variation system
// Primary: Google Gemini | Fallback: Anthropic Claude
// ─────────────────────────────────────────────────────────────────────────────

import {
  buildPrompt, withTimeout, extractJSON, validateQuiz, shuffleOptions,
  pickRandom, shuffle, variationSeed,
  TOPIC_BANKS, QUESTION_TYPES, DIFFICULTIES,
  log, MAX_RETRIES, TIMEOUT_MS,
} from './aiProvider.js'

// ── Pick variation parameters for this request ────────────────────────────────
function buildVariationParams(grade, subject, options = {}) {
  const { difficulty = 'mixed', recentQuestions = [], topicHints = [] } = options

  const allTopics   = TOPIC_BANKS[subject] || ['General Knowledge']
  const recentText  = recentQuestions.join(' ').toLowerCase()
  const freshTopics = allTopics.filter(t => !recentText.includes(t.toLowerCase()))
  const pool        = freshTopics.length >= 3 ? freshTopics : allTopics
  const topics      = topicHints.length ? topicHints : pickRandom(pool, 3)

  const typeKeys      = Object.keys(QUESTION_TYPES)
  const questionTypes = pickRandom(typeKeys, 3)

  const seed = variationSeed()

  return { topics, questionTypes, difficulty, recentQuestions, seed }
}

// ── De-duplicate against recent questions ─────────────────────────────────────
function deduplicateQuestions(newQuestions, recentQuestions) {
  if (!recentQuestions?.length) return newQuestions
  const recentLower = recentQuestions.map(q => q.toLowerCase().slice(0, 80))
  return newQuestions.filter(q => {
    const qLower = q.question.toLowerCase().slice(0, 80)
    return !recentLower.some(r => {
      const shorter = Math.min(qLower.length, r.length)
      let matches = 0
      for (let i = 0; i < shorter; i++) { if (qLower[i] === r[i]) matches++ }
      return matches / shorter > 0.8
    })
  })
}

// ── GEMINI provider ───────────────────────────────────────────────────────────
async function callGemini(grade, subject, params, attempt) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  log.info(`Gemini attempt ${attempt}/${MAX_RETRIES + 1}`, { grade, subject, topics: params.topics, seed: params.seed })

  const prompt = buildPrompt({ grade, subject, ...params })
  const url    = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

  const response = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.95,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 2000,
          responseMimeType: 'application/json',
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    }),
    TIMEOUT_MS
  )

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    const snippet = errText.substring(0, 200)
    if (response.status === 400) throw new Error(`Gemini bad request: ${snippet}`)
    if (response.status === 401 || response.status === 403) throw new Error('Gemini API key invalid or quota exceeded')
    if (response.status === 429) throw new Error('Gemini rate limit hit')
    throw new Error(`Gemini HTTP ${response.status}: ${snippet}`)
  }

  const data = await response.json()
  if (data.error) throw new Error(`Gemini error: ${data.error.message || JSON.stringify(data.error)}`)

  const candidate    = data?.candidates?.[0]
  const finishReason = candidate?.finishReason
  if (finishReason && finishReason !== 'STOP') {
    if (finishReason === 'SAFETY')     throw new Error('Gemini blocked by safety filters')
    if (finishReason === 'MAX_TOKENS') throw new Error('Gemini response truncated')
    log.warn(`Gemini unusual finish reason: ${finishReason}`)
  }

  const text = candidate?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned empty content')

  const parsed = JSON.parse(extractJSON(text))
  validateQuiz(parsed)

  const finalQuestions = shuffleOptions(parsed.questions)
  log.ok('Gemini success', { grade, subject, topics: params.topics, questions: finalQuestions.length })
  return { questions: finalQuestions, provider: 'gemini', model: 'gemini-1.5-flash', topics: params.topics, difficulty: params.difficulty }
}

// ── ANTHROPIC provider ────────────────────────────────────────────────────────
async function callAnthropic(grade, subject, params, attempt) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  log.info(`Anthropic attempt ${attempt}/${MAX_RETRIES + 1}`, { grade, subject, topics: params.topics, seed: params.seed })

  const prompt   = buildPrompt({ grade, subject, ...params })
  const response = await withTimeout(
    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    }),
    TIMEOUT_MS
  )

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    const snippet = errText.substring(0, 200)
    if (response.status === 401) throw new Error('Anthropic API key invalid')
    if (response.status === 429) throw new Error('Anthropic rate limit hit')
    if (response.status === 529) throw new Error('Anthropic overloaded')
    if (snippet.toLowerCase().includes('credit')) throw new Error('Anthropic credit too low')
    throw new Error(`Anthropic HTTP ${response.status}: ${snippet}`)
  }

  const data = await response.json()
  if (data.error) {
    const msg = data.error.message || JSON.stringify(data.error)
    if (msg.toLowerCase().includes('credit')) throw new Error('Anthropic credit too low')
    throw new Error(`Anthropic error: ${msg}`)
  }

  const text = (data.content || []).map(b => b.text || '').join('')
  if (!text) throw new Error('Anthropic returned empty content')

  const parsed = JSON.parse(extractJSON(text))
  validateQuiz(parsed)

  const finalQuestions = shuffleOptions(parsed.questions)
  log.ok('Anthropic success', { grade, subject, topics: params.topics, questions: finalQuestions.length })
  return { questions: finalQuestions, provider: 'anthropic', model: 'claude-sonnet-4-6', topics: params.topics, difficulty: params.difficulty }
}

// ── Retry wrapper with exponential backoff ────────────────────────────────────
async function withRetry(fn, label, maxRetries = MAX_RETRIES) {
  let lastError
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn(attempt)
    } catch (err) {
      lastError = err
      log.warn(`${label} attempt ${attempt} failed: ${err.message}`)
      const msg = err.message.toLowerCase()
      if (msg.includes('not configured') || msg.includes('api key invalid') ||
          msg.includes('credit too low') || msg.includes('bad request')) {
        break
      }
      if (attempt <= maxRetries) {
        await new Promise(r => setTimeout(r, attempt * 1000))
      }
    }
  }
  throw lastError
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateQuiz(grade, subject, options = {}) {
  const startTime = Date.now()
  const errors    = {}

  const params = buildVariationParams(grade, subject, options)

  log.info('Quiz generation started', {
    grade, subject,
    topics:      params.topics,
    difficulty:  params.difficulty,
    types:       params.questionTypes,
    seed:        params.seed,
    recentCount: params.recentQuestions.length,
  })

  // ── Try Gemini (primary) ───────────────────────────────────────────────────
  if (process.env.GEMINI_API_KEY) {
    try {
      const result = await withRetry(
        (attempt) => callGemini(grade, subject, params, attempt),
        'Gemini'
      )
      log.ok(`Quiz ready in ${Date.now() - startTime}ms via Gemini`)
      const deduplicated = deduplicateQuestions(result.questions, options.recentQuestions)
      if (deduplicated.length >= 3) result.questions = deduplicated.slice(0, 5)
      return result
    } catch (err) {
      errors.gemini = err.message
      log.switch('Gemini', 'Anthropic', err.message)
    }
  } else {
    errors.gemini = 'GEMINI_API_KEY not set'
    log.switch('Gemini', 'Anthropic', 'GEMINI_API_KEY missing')
  }

  // ── Try Anthropic (fallback) ───────────────────────────────────────────────
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const result = await withRetry(
        (attempt) => callAnthropic(grade, subject, params, attempt),
        'Anthropic'
      )
      log.ok(`Quiz ready in ${Date.now() - startTime}ms via Anthropic`)
      const deduplicated = deduplicateQuestions(result.questions, options.recentQuestions)
      if (deduplicated.length >= 3) result.questions = deduplicated.slice(0, 5)
      return result
    } catch (err) {
      errors.anthropic = err.message
      log.error(`Anthropic fallback failed: ${err.message}`)
    }
  } else {
    errors.anthropic = 'ANTHROPIC_API_KEY not set'
  }

  log.error('All providers failed', { ...errors, elapsed: `${Date.now() - startTime}ms` })
  throw new Error(JSON.stringify({
    message: 'All AI providers failed',
    gemini:    errors.gemini    || 'not tried',
    anthropic: errors.anthropic || 'not tried',
  }))
}