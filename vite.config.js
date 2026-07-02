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
          let parsed
          try { parsed = JSON.parse(body) }
          catch { send(400, { error: 'Invalid JSON body' }); return }

          // Delegate to the production handler so dev and prod are identical
          const { default: handler } = await import('./api/quiz.js')
          const mockReq = {
            method: 'POST',
            body: parsed,
            headers: { 'content-type': 'application/json' },
          }
          let statusCode = 200
          let responseBody = null
          const mockRes = {
            setHeader() { return this },
            status(s) { statusCode = s; return this },
            json(b) { responseBody = b; return this },
            end() { return this },
          }
          await handler(mockReq, mockRes)
          send(statusCode, responseBody || {})
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