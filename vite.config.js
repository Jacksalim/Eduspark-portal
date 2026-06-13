import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ── Local development quiz API plugin ─────────────────────────────────────────
// Mirrors api/quiz.js so the AI Quiz works with `npm run dev` — no vercel dev needed.
const devQuizApiPlugin = () => ({
  name: 'dev-quiz-api',
  configureServer(server) {
    server.middlewares.use('/api/quiz', (req, res) => {
      if (req.method === 'OPTIONS') {
        res.writeHead(200); res.end(); return
      }
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Method not allowed' }))
        return
      }

      let body = ''
      req.on('data', chunk => { body += chunk.toString() })
      req.on('end', async () => {
        const send = (status, obj) => {
          res.writeHead(status, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(obj))
        }

        try {
          let grade, subject
          try { ({ grade, subject } = JSON.parse(body)) }
          catch { send(400, { error: 'Invalid JSON body' }); return }

          const apiKey =
            process.env.ANTHROPIC_API_KEY ||
            process.env.ANTHROPIC_KEY ||
            process.env.VITE_ANTHROPIC_KEY

          if (!apiKey) {
            send(500, {
              error: 'ANTHROPIC_KEY not set',
              hint: 'Add ANTHROPIC_KEY=sk-ant-... to your .env file for local quiz generation'
            })
            return
          }

          const prompt = `Generate exactly 5 multiple-choice quiz questions for Grade ${grade} ${subject} students, aligned with the Kenyan CBC curriculum.

Rules:
- Questions must be appropriate for Grade ${grade} level
- Cover different topics within ${subject}
- Mix difficulty: 2 easy, 2 medium, 1 challenging
- Explanations must be educational and clear

Return ONLY valid JSON with no markdown, no code fences, no preamble. Exactly this structure:
{
  "questions": [
    {
      "question": "question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "why this answer is correct"
    }
  ]
}

CRITICAL: "correctAnswer" must be the exact full string of the correct option (not an index).`

          const MODELS = [
            process.env.ANTHROPIC_MODEL,
            'claude-sonnet-4-6',
            'claude-sonnet-4-20250514',
            'claude-3-5-sonnet-20241022',
          ].filter(Boolean)

          let lastErr = null
          for (const model of MODELS) {
            try {
              const r = await fetch('https://api.anthropic.com/v1/messages', {
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

              if (!r.ok) {
                const t = await r.text()
                if (r.status === 404 || (r.status === 400 && t.includes('model'))) { lastErr = t; continue }
                if (r.status === 401) { send(401, { error: 'Invalid Anthropic API key' }); return }
                send(r.status, { error: `Anthropic error ${r.status}`, detail: t.slice(0, 300) }); return
              }

              const data = await r.json()
              const rawText = (data.content || []).map(b => b.text || '').join('')
              const stripped = rawText.replace(/```(?:json)?/gi, '').trim()

              let parsed = null
              try { parsed = JSON.parse(stripped) } catch (_) {}
              if (!parsed) {
                const m = stripped.match(/\{[\s\S]*\}/)
                if (m) try { parsed = JSON.parse(m[0]) } catch (_) {}
              }

              if (!parsed?.questions?.length) {
                send(502, { error: 'Could not parse AI response', raw: rawText.slice(0, 300) }); return
              }

              send(200, { questions: parsed.questions, model, provider: 'anthropic' })
              return
            } catch (err) { lastErr = err.message }
          }
          send(500, { error: 'All models failed', detail: lastErr })
        } catch (err) {
          send(500, { error: err.message })
        }
      })
    })
  }
})

// ── Local development send-email plugin ───────────────────────────────────────
// Mirrors api/send-email.js so welcome emails can be tested locally.
const devSendEmailPlugin = () => ({
  name: 'dev-send-email',
  configureServer(server) {
    server.middlewares.use('/api/send-email', (req, res) => {
      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Method not allowed' })); return
      }

      let body = ''
      req.on('data', chunk => { body += chunk.toString() })
      req.on('end', async () => {
        const send = (status, obj) => {
          res.writeHead(status, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(obj))
        }

        const apiKey = process.env.RESEND_API_KEY
        if (!apiKey) {
          console.warn('[dev-send-email] RESEND_API_KEY not set — skipping email (non-fatal in dev)')
          send(200, { success: false, error: 'RESEND_API_KEY not set — email skipped in local dev' })
          return
        }

        try {
          let payload
          try { payload = JSON.parse(body) }
          catch { send(400, { error: 'Invalid JSON' }); return }

          const { default: handler } = await import('./api/send-email.js')
          const mockReq = { method: 'POST', body: payload }
          const mockRes = {
            _status: 200, _body: null,
            status(s) { this._status = s; return this },
            json(b) { this._body = b; return this },
            setHeader() { return this },
            end() { return this },
          }
          await handler(mockReq, mockRes)
          send(mockRes._status, mockRes._body || { success: true })
        } catch (err) {
          console.warn('[dev-send-email] Error:', err.message)
          send(200, { success: false, error: err.message })
        }
      })
    })
  }
})

export default defineConfig({
  plugins: [react(), devQuizApiPlugin(), devSendEmailPlugin()],
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
    port: 5000,
  }
})