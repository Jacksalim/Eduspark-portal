// api/check-keys.js — temporary diagnostic endpoint, safe to leave (returns no key values)
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const gemini    = !!process.env.GEMINI_API_KEY
  const anthropic = !!process.env.ANTHROPIC_API_KEY
  const geminiLen = process.env.GEMINI_API_KEY?.length || 0
  const antLen    = process.env.ANTHROPIC_API_KEY?.length || 0

  res.status(200).json({
    GEMINI_API_KEY:    gemini    ? `set (${geminiLen} chars)` : 'MISSING',
    ANTHROPIC_API_KEY: anthropic ? `set (${antLen} chars)`    : 'MISSING',
    allKeysPresent: gemini && anthropic,
    timestamp: new Date().toISOString(),
  })
}
