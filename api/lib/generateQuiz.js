// api/lib/generateQuiz.js
// ─────────────────────────────────────────────────────────────────────────────
// Multi-provider quiz generation
// Primary:  Google Gemini (gemini-1.5-flash)
// Fallback: Anthropic Claude (claude-sonnet-4-6)
// ─────────────────────────────────────────────────────────────────────────────

import {
  buildPrompt, withTimeout, extractJSON, validateQuiz,
  log, MAX_RETRIES, TIMEOUT_MS
} from './aiProvider.js'

// ── GEMINI provider ───────────────────────────────────────────────────────────
async function callGemini(grade, subject, attempt) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  log.info(`Gemini attempt ${attempt}/${MAX_RETRIES + 1}`, { grade, subject })

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
    log.error(`Gemini HTTP ${response.status}`, { snippet })

    if (response.status === 400) throw new Error(`Gemini bad request: ${snippet}`)
    if (response.status === 401 || response.status === 403) throw new Error('Gemini API key invalid or quota exceeded')
    if (response.status === 429) throw new Error('Gemini rate limit hit — retrying')

    throw new Error(`Gemini HTTP ${response.status}: ${snippet}`)
  }

  const data = await response.json()

  if (data.error) {
    log.error('Gemini API error', data.error)
    throw new Error(`Gemini error: ${data.error.message || JSON.stringify(data.error)}`)
  }

  const candidate = data?.candidates?.[0]
  const finishReason = candidate?.finishReason

  if (finishReason && finishReason !== 'STOP') {
    log.warn(`Gemini finish reason: ${finishReason}`)
    if (finishReason === 'MAX_TOKENS')  throw new Error('Gemini response truncated — increase maxOutputTokens')
    if (finishReason === 'SAFETY')      throw new Error('Gemini blocked content by safety filters')
    if (finishReason === 'RECITATION')  throw new Error('Gemini recitation filter triggered')
  }

  const text = candidate?.content?.parts?.[0]?.text
  if (!text) {
    log.error('Gemini returned empty content', { data: JSON.stringify(data).substring(0, 300) })
    throw new Error('Gemini returned empty content')
  }

  const parsed = JSON.parse(extractJSON(text))
  validateQuiz(parsed)

  log.ok('Gemini success', { grade, subject, questions: parsed.questions.length })
  return { questions: parsed.questions, provider: 'gemini', model: 'gemini-1.5-flash' }
}

// ── ANTHROPIC provider ────────────────────────────────────────────────────────
async function callAnthropic(grade, subject, attempt) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  log.info(`Anthropic attempt ${attempt}/${MAX_RETRIES + 1}`, { grade, subject })

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
        max_tokens: 1500,
        messages: [{ role: 'user', content: buildPrompt(grade, subject) }],
      }),
    }),
    TIMEOUT_MS
  )

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    const snippet = errText.substring(0, 200)
    log.error(`Anthropic HTTP ${response.status}`, { snippet })

    if (response.status === 401) throw new Error('Anthropic API key invalid')
    if (response.status === 429) throw new Error('Anthropic rate limit hit — retrying')
    if (response.status === 529) throw new Error('Anthropic overloaded — retrying')

    if (snippet.toLowerCase().includes('credit') || snippet.toLowerCase().includes('balance')) {
      throw new Error('Anthropic account credit too low — top up at console.anthropic.com')
    }

    throw new Error(`Anthropic HTTP ${response.status}: ${snippet}`)
  }

  const data = await response.json()

  if (data.error) {
    log.error('Anthropic API error object', data.error)
    const msg = data.error.message || JSON.stringify(data.error)
    if (msg.toLowerCase().includes('credit') || msg.toLowerCase().includes('balance')) {
      throw new Error('Anthropic account credit too low — top up at console.anthropic.com')
    }
    throw new Error(`Anthropic error: ${msg}`)
  }

  const text = (data.content || []).map(b => b.text || '').join('')
  if (!text) {
    log.error('Anthropic returned empty content')
    throw new Error('Anthropic returned empty content')
  }

  const parsed = JSON.parse(extractJSON(text))
  validateQuiz(parsed)

  log.ok('Anthropic success', { grade, subject, questions: parsed.questions.length })
  return { questions: parsed.questions, provider: 'anthropic', model: 'claude-sonnet-4-6' }
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
      if (
        msg.includes('not configured') ||
        msg.includes('api key invalid') ||
        msg.includes('credit too low') ||
        msg.includes('bad request')
      ) {
        log.warn(`${label} non-retryable error — skipping retries`)
        break
      }

      if (attempt <= maxRetries) {
        const delay = attempt * 1000
        log.info(`${label} retrying in ${delay}ms…`)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  throw lastError
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateQuiz(grade, subject) {
  const errors = {}
  const startTime = Date.now()

  log.info('Quiz generation started', { grade, subject })

  // ── Try Gemini (primary) ───────────────────────────────────────────────────
  if (process.env.GEMINI_API_KEY) {
    try {
      log.info('Provider: Gemini (primary)')
      const result = await withRetry(
        (attempt) => callGemini(grade, subject, attempt),
        'Gemini'
      )
      log.ok(`Quiz generated in ${Date.now() - startTime}ms`, { provider: 'gemini' })
      return result
    } catch (err) {
      errors.gemini = err.message
      log.switch('Gemini', 'Anthropic', err.message)
    }
  } else {
    errors.gemini = 'GEMINI_API_KEY not set'
    log.warn('Gemini skipped — GEMINI_API_KEY not configured')
    log.switch('Gemini', 'Anthropic', 'GEMINI_API_KEY missing')
  }

  // ── Try Anthropic (fallback) ───────────────────────────────────────────────
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      log.info('Provider: Anthropic Claude (fallback)')
      const result = await withRetry(
        (attempt) => callAnthropic(grade, subject, attempt),
        'Anthropic'
      )
      log.ok(`Quiz generated in ${Date.now() - startTime}ms`, { provider: 'anthropic' })
      return result
    } catch (err) {
      errors.anthropic = err.message
      log.error(`Anthropic fallback also failed: ${err.message}`)
    }
  } else {
    errors.anthropic = 'ANTHROPIC_API_KEY not set'
    log.error('Anthropic skipped — ANTHROPIC_API_KEY not configured. No fallback available.')
  }

  // ── Both failed ────────────────────────────────────────────────────────────
  log.error('All providers failed', { ...errors, elapsed: `${Date.now() - startTime}ms` })
  throw new Error(JSON.stringify({
    message: 'All AI providers failed',
    gemini: errors.gemini || 'not tried',
    anthropic: errors.anthropic || 'not tried',
  }))
}