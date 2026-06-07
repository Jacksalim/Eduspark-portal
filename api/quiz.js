// api/quiz.js
// Vercel serverless function — proxies quiz generation through Claude API
// The API key stays server-side and is never exposed to the browser.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── Resolve API key: accept any of the common naming conventions ─────────────
  const apiKey =
    process.env.ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_KEY ||
    process.env.VITE_ANTHROPIC_KEY ||
    process.env.VITE_ANTHROPIC_API_KEY

  if (!apiKey) {
    console.error('[quiz] No Anthropic API key found. Checked: ANTHROPIC_API_KEY, ANTHROPIC_KEY, VITE_ANTHROPIC_KEY')
    return res.status(500).json({
      error: 'Anthropic API key not configured',
      hint: 'Add ANTHROPIC_KEY to your Vercel environment variables at vercel.com/dashboard → Settings → Environment Variables'
    })
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  const { grade, subject } = req.body || {}
  if (!grade || !subject) {
    return res.status(400).json({ error: 'grade and subject are required' })
  }

  console.log(`[quiz] Generating Grade ${grade} ${subject} quiz…`)

  // ── Model selection — try in order of preference ─────────────────────────────
  // Set ANTHROPIC_MODEL env var to override (e.g. "claude-3-5-sonnet-20241022")
  const MODELS = [
    process.env.ANTHROPIC_MODEL,
    'claude-opus-4-5',
    'claude-sonnet-4-5',
    'claude-opus-4-20250514',
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
  ].filter(Boolean)

  const prompt = `Generate exactly 5 multiple-choice quiz questions for Grade ${grade} ${subject} students, aligned with the South African CAPS curriculum.

Rules:
- Questions must be appropriate for Grade ${grade} level
- Cover different topics within ${subject}
- Mix difficulty: 2 easy, 2 medium, 1 challenging
- Explanations must be educational and clear

Return ONLY valid JSON with no markdown, no code fences, no preamble, no trailing text. Exactly this structure:
{"questions":[{"q":"question text","options":["A text","B text","C text","D text"],"answer":0,"explanation":"why this answer is correct"}]}

"answer" is the 0-based index of the correct option (0=A, 1=B, 2=C, 3=D). Return all 5 questions in the array.`

  let lastError = null

  for (const model of MODELS) {
    try {
      console.log(`[quiz] Trying model: ${model}`)

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }]
        })
      })

      if (!response.ok) {
        const errBody = await response.text()
        console.error(`[quiz] Anthropic API ${response.status} for model ${model}:`, errBody)

        // 404 = model not found → try next model
        if (response.status === 404) { lastError = `Model "${model}" not found`; continue }
        // 400 with model error → try next
        if (response.status === 400 && errBody.includes('model')) { lastError = errBody; continue }
        // Auth error → fail immediately
        if (response.status === 401) {
          return res.status(401).json({ error: 'Invalid Anthropic API key. Check the key in your Vercel environment variables.' })
        }
        if (response.status === 429) {
          return res.status(429).json({ error: 'Anthropic rate limit reached. Please try again in a moment.' })
        }

        return res.status(502).json({ error: `Anthropic API error ${response.status}`, detail: errBody.slice(0, 300) })
      }

      const data = await response.json()
      const rawText = (data.content || []).map(b => b.text || '').join('')

      console.log(`[quiz] Raw Claude response (first 200 chars):`, rawText.slice(0, 200))

      // ── Robust JSON extraction ─────────────────────────────────────────────
      // Try 1: strip markdown code fences and parse directly
      let parsed = null
      const stripped = rawText.replace(/```(?:json)?/gi, '').trim()

      try { parsed = JSON.parse(stripped) } catch (_) {}

      // Try 2: extract first {...} block (handles leading/trailing prose)
      if (!parsed) {
        const match = stripped.match(/\{[\s\S]*\}/)
        if (match) {
          try { parsed = JSON.parse(match[0]) } catch (_) {}
        }
      }

      // Try 3: extract array directly if Claude returned [...] without wrapper
      if (!parsed) {
        const arrMatch = stripped.match(/\[[\s\S]*\]/)
        if (arrMatch) {
          try { parsed = { questions: JSON.parse(arrMatch[0]) } } catch (_) {}
        }
      }

      if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        console.error('[quiz] Could not parse quiz JSON. Raw text:', rawText)
        return res.status(502).json({
          error: 'Could not parse AI response as quiz JSON',
          raw: rawText.slice(0, 500)
        })
      }

      // Validate and normalise each question
      const questions = parsed.questions.map((q, i) => ({
        q:           String(q.q || q.question || `Question ${i + 1}`),
        options:     Array.isArray(q.options) ? q.options.map(String) : ['A', 'B', 'C', 'D'],
        answer:      typeof q.answer === 'number' ? q.answer : 0,
        explanation: String(q.explanation || q.explain || 'See your textbook for more details.')
      }))

      console.log(`[quiz] ✅ Success with model ${model}: ${questions.length} questions`)
      return res.status(200).json({ questions, model })

    } catch (err) {
      console.error(`[quiz] Exception with model ${model}:`, err.message)
      lastError = err.message
    }
  }

  // All models failed
  console.error('[quiz] All models failed. Last error:', lastError)
  return res.status(500).json({
    error: 'Quiz generation failed after trying all available models',
    detail: lastError
  })
}
