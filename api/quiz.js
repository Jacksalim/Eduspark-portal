// api/quiz.js
// ─────────────────────────────────────────────────────────────────────────────
// Vercel serverless function — entry point for quiz generation
// Gemini primary → Anthropic fallback → user-friendly error
// ─────────────────────────────────────────────────────────────────────────────

import { generateQuiz } from './lib/generateQuiz.js'
import { checkProviderKeys, log } from './lib/aiProvider.js'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Parse body
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  if (!body || typeof body !== 'object') body = {}

  const { grade, subject } = body

  // Validate input
  if (!grade || !subject) {
    return res.status(400).json({
      error: 'grade and subject are required',
      received: { grade, subject }
    })
  }

  // Provider health check
  const keys = checkProviderKeys()
  log.info('Quiz request received', { grade, subject, providers: keys })

  if (!keys.any) {
    log.error('No API keys configured')
    return res.status(500).json({
      error: 'No AI providers configured',
      hint: 'Add GEMINI_API_KEY and/or ANTHROPIC_KEY in Vercel → Settings → Environment Variables'
    })
  }

  // Generate quiz
  const startTime = Date.now()

  try {
    const result = await generateQuiz(grade, subject)
    const duration = Date.now() - startTime

    log.ok(`Quiz generated in ${duration}ms`, {
      provider: result.provider,
      grade,
      subject,
      questions: result.questions.length
    })

    return res.status(200).json({
      questions: result.questions,
      provider: result.provider,
      duration
    })

  } catch (err) {
    const duration = Date.now() - startTime
    log.error(`All providers failed after ${duration}ms`, { error: err.message })

    let errorDetail = { gemini: 'unknown', anthropic: 'unknown' }
    try { errorDetail = JSON.parse(err.message) } catch { /* not structured */ }

    return res.status(502).json({
      error: 'Quiz generation failed. Please try again in a moment.',
      detail: errorDetail,
      duration
    })
  }
}