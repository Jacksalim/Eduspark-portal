// api/lib/generateQuiz.js
// ─────────────────────────────────────────────────────────────────────────────
// Multi-provider quiz generation
// Primary:  Google Gemini
// Fallback: Anthropic Claude
// ─────────────────────────────────────────────────────────────────────────────

import { buildPrompt, withTimeout, extractJSON, validateQuiz, log } from './aiProvider.js'

const MAX_RETRIES = 1 // retry once per provider before switching

// ── GEMINI provider ───────────────────────────────────────────────────────────
async function callGemini(grade, subject, attempt = 1) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  log.info(`Gemini attempt ${attempt}`, { grade, subject })

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

  const response = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(grade, subject) }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
          responseMimeType: 'application/json'
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ]
      })
    })
  )

  if (!response.ok) {
    const errText = await response.text()
    log.error(`Gemini HTTP ${response.status}`, { errText: errText.substring(0, 200) })
    throw new Error(`Gemini HTTP ${response.status}: ${errText.substring(0, 100)}`)
  }

  const data = await response.json()

  if (data.error) {
    log.error('Gemini API error object', data.error)
    throw new Error(`Gemini error: ${data.error.message}`)
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    log.error('Gemini empty response', { data: JSON.stringify(data).substring(0, 300) })
    throw new Error('Gemini returned empty content')
  }

  const finishReason = data?.candidates?.[0]?.finishReason
  if (finishReason && finishReason !== 'STOP') {
    log.warn(`Gemini finish reason: ${finishReason}`)
    if (finishReason === 'MAX_TOKENS') throw new Error('Gemini response truncated')
    if (finishReason === 'SAFETY') throw new Error('Gemini blocked by safety filters')
  }

  const jsonStr = extractJSON(text)
  const parsed = JSON.parse(jsonStr)
  validateQuiz(parsed)

  log.ok(`Gemini success`, { grade, subject, questions: parsed.questions.length })
  return { questions: parsed.questions, provider: 'gemini' }
}

// ── ANTHROPIC provider ────────────────────────────────────────────────────────
async function callAnthropic(grade, subject, attempt = 1) {
  const apiKey = process.env.ANTHROPIC_KEY
  if (!apiKey) throw new Error('ANTHROPIC_KEY not configured')

  log.info(`Anthropic attempt ${attempt}`, { grade, subject })

  const response = await withTimeout(
    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: buildPrompt(grade, subject) }]
      })
    })
  )

  if (!response.ok) {
    const errText = await response.text()
    log.error(`Anthropic HTTP ${response.status}`, { errText: errText.substring(0, 200) })
    throw new Error(`Anthropic HTTP ${response.status}: ${errText.substring(0, 100)}`)
  }

  const data = await response.json()

  if (data.error) {
    log.error('Anthropic API error object', data.error)
    const msg = data.error.message || 'Anthropic API error'
    if (msg.toLowerCase().includes('credit') || msg.toLowerCase().includes('balance')) {
      throw new Error('Anthropic credit balance too low — top up at console.anthropic.com')
    }
    throw new Error(`Anthropic error: ${msg}`)
  }

  const text = (data.content || []).map(b => b.text || '').join('')
  if (!text) {
    log.error('Anthropic empty response')
    throw new Error('Anthropic returned empty content')
  }

  const jsonStr = extractJSON(text)
  const parsed = JSON.parse(jsonStr)
  validateQuiz(parsed)

  log.ok(`Anthropic success`, { grade, subject, questions: parsed.questions.length })
  return { questions: parsed.questions, provider: 'anthropic' }
}

// ── Retry wrapper ─────────────────────────────────────────────────────────────
async function withRetry(fn, label, maxRetries = MAX_RETRIES) {
  let lastError
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn(attempt)
    } catch (err) {
      lastError = err
      log.warn(`${label} attempt ${attempt} failed: ${err.message}`)
      if (
        err.message.includes('not configured') ||
        err.message.includes('credit balance') ||
        err.message.includes('ANTHROPIC_KEY') ||
        err.message.includes('GEMINI_API_KEY')
      ) {
        break
      }
      if (attempt <= maxRetries) {
        log.info(`${label} retrying in 1s...`)
        await new Promise(r => setTimeout(r, 1000))
      }
    }
  }
  throw lastError
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateQuiz(grade, subject) {
  const errors = {}

  // Try Gemini first
  if (process.env.GEMINI_API_KEY) {
    try {
      log.info('Using primary provider: Gemini', { grade, subject })
      const result = await withRetry(
        (attempt) => callGemini(grade, subject, attempt),
        'Gemini'
      )
      return result
    } catch (err) {
      errors.gemini = err.message
      log.warn(`Gemini failed, switching to Anthropic. Reason: ${err.message}`)
    }
  } else {
    log.warn('GEMINI_API_KEY not set — skipping Gemini, trying Anthropic')
    errors.gemini = 'GEMINI_API_KEY not configured'
  }

  // Fallback to Anthropic
  if (process.env.ANTHROPIC_KEY) {
    try {
      log.info('Using fallback provider: Anthropic', { grade, subject })
      const result = await withRetry(
        (attempt) => callAnthropic(grade, subject, attempt),
        'Anthropic'
      )
      return result
    } catch (err) {
      errors.anthropic = err.message
      log.error(`Anthropic fallback also failed: ${err.message}`)
    }
  } else {
    log.error('ANTHROPIC_KEY not set — no fallback available')
    errors.anthropic = 'ANTHROPIC_KEY not configured'
  }

  // Both failed
  log.error('All AI providers failed', errors)
  throw new Error(JSON.stringify({
    message: 'All AI providers failed',
    gemini: errors.gemini,
    anthropic: errors.anthropic
  }))
}