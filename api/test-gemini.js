export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(200).json({ status: 'MISSING KEY' })

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-2.5-flash-preview-05-20']

  const results = {}
  for (const model of models) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Say hi.' }] }], generationConfig: { maxOutputTokens: 5 } })
        }
      )
      const data = await r.json()
      results[model] = r.ok
        ? 'OK: ' + (data?.candidates?.[0]?.content?.parts?.[0]?.text || '?')
        : `ERROR ${r.status}: ${data?.error?.message?.slice(0, 80)}`
    } catch (e) {
      results[model] = 'FETCH_ERROR: ' + e.message
    }
  }
  res.status(200).json(results)
}
