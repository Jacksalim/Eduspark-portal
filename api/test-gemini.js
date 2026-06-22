// api/test-gemini.js — temporary diagnostic, will be removed after testing
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(200).json({ status: 'MISSING', error: 'GEMINI_API_KEY not set' })

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say hello in one word.' }] }],
        generationConfig: { maxOutputTokens: 10 }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(200).json({
        status: 'ERROR',
        httpStatus: response.status,
        error: data?.error?.message || 'Unknown error',
        code: data?.error?.code,
        details: data?.error?.details,
        fullResponse: data,
      })
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    return res.status(200).json({
      status: 'OK',
      response: text,
      keyPrefix: apiKey.slice(0, 8) + '...',
    })
  } catch (e) {
    return res.status(200).json({ status: 'FETCH_ERROR', error: e.message })
  }
}
