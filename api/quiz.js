// api/quiz.js
// Vercel serverless function — sits between the browser and Anthropic API
// Keeps the API key server-side and avoids CORS issues

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { grade, subject } = req.body

  if (!grade || !subject) {
    return res.status(400).json({ error: 'grade and subject are required' })
  }

  const apiKey = process.env.ANTHROPIC_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_KEY environment variable not set' })
  }

  const prompt = `Generate a 5-question multiple choice quiz for Grade ${grade} ${subject} students aligned with the South African CAPS curriculum.

Rules:
- Questions must be appropriate for Grade ${grade} learners
- Cover different topics within ${subject}
- Mix difficulty: 2 easy, 2 medium, 1 hard
- Explanations must be clear and educational

Return ONLY valid JSON — no markdown, no backticks, no preamble — exactly this structure:
{"questions":[{"q":"question text","options":["option A","option B","option C","option D"],"answer":0,"explanation":"why this answer is correct"}]}

"answer" is the 0-based index of the correct option (0=A, 1=B, 2=C, 3=D).`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', errText)
      return res.status(502).json({ error: 'AI service error', detail: errText })
    }

    const data = await response.json()
    const text = (data.content || []).map(b => b.text || '').join('')
    const clean = text.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      console.error('JSON parse failed. Raw text:', text)
      return res.status(502).json({ error: 'Could not parse AI response', raw: text })
    }

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return res.status(502).json({ error: 'Invalid quiz structure from AI' })
    }

    return res.status(200).json({ questions: parsed.questions })

  } catch (err) {
    console.error('Quiz handler error:', err)
    return res.status(500).json({ error: err.message })
  }
}