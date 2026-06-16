// api/quiz.js
// ═════════════════════════════════════════════════════════════════════════════
// Vercel serverless function — quiz generation entry point
// ═════════════════════════════════════════════════════════════════════════════

import { generateQuiz } from './lib/generateQuiz.js'
import {
  checkProviderKeys, log, validateInput, logProviderHealth,
  SUPPORTED_SUBJECTS, DIFFICULTIES,
} from './lib/aiProvider.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', allowed: ['POST'] })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch {
      return res.status(400).json({ error: 'Invalid JSON in request body' })
    }
  }
  if (!body || typeof body !== 'object') body = {}

  let { grade, subject, difficulty = 'mixed', recentQuestions = [], topicHints = [] } = body

  // Validate grade + subject
  const validation = validateInput(grade, subject)
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Invalid input',
      details: validation.errors,
      supported: { grades: '1-12', subjects: SUPPORTED_SUBJECTS },
    })
  }

  // Validate difficulty
  if (!DIFFICULTIES.includes(difficulty)) difficulty = 'mixed'

  // Sanitise recentQuestions — accept up to 15 recent question strings for dedup
  if (!Array.isArray(recentQuestions)) recentQuestions = []
  recentQuestions = recentQuestions
    .filter(q => typeof q === 'string' && q.trim())
    .slice(0, 15)

  // Sanitise topicHints
  if (!Array.isArray(topicHints)) topicHints = []
  topicHints = topicHints.filter(t => typeof t === 'string' && t.trim()).slice(0, 3)

  // Keep 'R' as string; coerce numeric grades to Number
  grade = String(grade).toUpperCase() === 'R' ? 'R' : Number(grade)

  const keys = checkProviderKeys()
  if (!keys.any) {
    logProviderHealth()
    return res.status(500).json({
      error: 'No AI providers configured',
      hint: 'Set GEMINI_API_KEY and/or ANTHROPIC_API_KEY in Vercel environment variables',
    })
  }

  log.info('Quiz request', { grade, subject, difficulty, recentCount: recentQuestions.length })
  const startTime = Date.now()

  try {
    const result = await generateQuiz(grade, subject, { difficulty, recentQuestions, topicHints })
    const duration = Date.now() - startTime

    return res.status(200).json({
      success:   true,
      questions: result.questions,
      provider:  result.provider,
      metadata: {
        grade,
        subject,
        difficulty:    result.difficulty,
        topics:        result.topics,
        questionCount: result.questions.length,
        generatedAt:   new Date().toISOString(),
        responseTime:  `${duration}ms`,
      },
    })
  } catch (err) {
    const duration = Date.now() - startTime
    log.error(`All providers failed after ${duration}ms`, { error: err.message })

    let providerErrors = { detail: err.message }
    try { providerErrors = JSON.parse(err.message) } catch { /* ok */ }

    return res.status(502).json({
      error: 'Quiz generation failed. Please try again in a moment.',
      providers: providerErrors,
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  }
}