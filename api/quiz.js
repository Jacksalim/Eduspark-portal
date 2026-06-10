// api/quiz.js
// ═════════════════════════════════════════════════════════════════════════════
// Vercel serverless function — entry point for quiz generation
// Gemini primary → Anthropic fallback → user-friendly error
// ═════════════════════════════════════════════════════════════════════════════

import { generateQuiz } from './lib/generateQuiz.js'
import {
  checkProviderKeys,
  log,
  validateInput,
  logProviderHealth,
  SUPPORTED_SUBJECTS,
  SUPPORTED_GRADES
} from './lib/aiProvider.js'

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      allowed: ['POST'],
      hint: 'Use POST /api/quiz with { grade, subject } body'
    })
  }

  // Parse request body
  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      return res.status(400).json({
        error: 'Invalid JSON in request body',
        received: body.substring(0, 100)
      })
    }
  }
  if (!body || typeof body !== 'object') body = {}

  let { grade, subject } = body

  // Validate input
  const validation = validateInput(grade, subject)
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Invalid input',
      details: validation.errors,
      supported: {
        grades: `1-12 (received: ${grade})`,
        subjects: SUPPORTED_SUBJECTS,
        exampleRequest: {
          grade: 9,
          subject: 'Mathematics'
        }
      }
    })
  }

  // Convert grade to number
  grade = Number(grade)

  // Check provider configuration
  const keys = checkProviderKeys()
  log.info('Quiz request received', { grade, subject, providers: keys })

  if (!keys.any) {
    logProviderHealth()
    return res.status(500).json({
      error: 'No AI providers configured',
      hint: 'Set GEMINI_API_KEY and/or ANTHROPIC_API_KEY in Vercel environment variables',
      setup: {
        step1: 'Go to Vercel project → Settings → Environment Variables',
        step2: 'Add GEMINI_API_KEY from console.cloud.google.com',
        step3: 'Add ANTHROPIC_API_KEY from console.anthropic.com',
        documentation: 'https://github.com/Jacksalim/Eduspark-portal#setup'
      }
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
      success: true,
      questions: result.questions,
      provider: result.provider,
      metadata: {
        grade,
        subject,
        questionCount: result.questions.length,
        generatedAt: new Date().toISOString(),
        responseTime: `${duration}ms`
      }
    })

  } catch (err) {
    const duration = Date.now() - startTime
    log.error(`All providers failed after ${duration}ms`, { error: err.message })

    // Parse structured error from generateQuiz
    let providerErrors = { gemini: 'unknown error', anthropic: 'unknown error' }
    try {
      providerErrors = JSON.parse(err.message)
    } catch {
      providerErrors = { detail: err.message }
    }

    return res.status(502).json({
      error: 'Quiz generation failed. Please try again in a moment.',
      userMessage: 'We are having trouble generating your quiz. This could be due to temporary service issues.',
      providers: providerErrors,
      troubleshooting: {
        step1: 'Wait a moment and try again',
        step2: 'Check that API keys are correctly set in Vercel environment variables',
        step3: 'Check Gemini API quota at console.cloud.google.com',
        step4: 'Check Anthropic account balance at console.anthropic.com',
        support: 'Contact support if issues persist'
      },
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
  }
}