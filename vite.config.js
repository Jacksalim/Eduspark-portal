import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ── Local development quiz API plugin ─────────────────────────────────────────
// Mirrors api/quiz.js so the AI Quiz works with `npm run dev` — no vercel dev needed.
// Requires ANTHROPIC_KEY (or ANTHROPIC_API_KEY) in your local .env file.
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

          const prompt = `Generate exactly 5 multiple-choice quiz questions for Grade ${grade} ${subject} students, aligned with the South African CAPS curriculum.

Rules:
- Questions must be appropriate for Grade ${grade} level
- Cover different topics within ${subject}
- Mix difficulty: 2 easy, 2 medium, 1 challenging
- Explanations must be educational and clear

Return ONLY valid JSON with no markdown, no code fences, no preamble. Exactly this structure:
{"questions":[{"q":"question text","options":["A text","B text","C text","D text"],"answer":0,"explanation":"why this answer is correct"}]}

"answer" is the 0-based index of the correct option (0=A, 1=B, 2=C, 3=D).`

          const MODELS = [
            process.env.ANTHROPIC_MODEL,
            'claude-opus-4-5',
            'claude-sonnet-4-5',
            'claude-opus-4-20250514',
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

              send(200, { questions: parsed.questions, model })
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

export default defineConfig({
  plugins: [react(), devQuizApiPlugin()],
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
    port: 5000,
  }
})
