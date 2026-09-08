import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

function devApiPlugin(route, modulePath) {
  return {
    name: `dev-${route.replaceAll('/', '-')}-api`,
    configureServer(server) {
      server.middlewares.use(route, (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200)
          res.end()
          return
        }

        let body = ''
        req.on('data', chunk => {
          body += chunk.toString()
          if (body.length > 1024 * 1024) req.destroy()
        })
        req.on('end', async () => {
          const send = (status, headers, payload) => {
            res.writeHead(status, { 'Content-Type': 'application/json', ...headers })
            if (payload === undefined) res.end()
            else res.end(JSON.stringify(payload))
          }

          let payload = {}
          try {
            payload = body ? JSON.parse(body) : {}
          } catch {
            send(400, {}, { error: 'Invalid JSON in request body' })
            return
          }

          try {
            const { default: handler } = await import(modulePath)
            const mockReq = {
              method: req.method,
              body: payload,
              headers: req.headers,
            }
            const mockRes = {
              _status: 200,
              _body: undefined,
              _headers: {},
              status(status) { this._status = status; return this },
              json(value) { this._body = value; return this },
              setHeader(name, value) { this._headers[name] = value; return this },
              end() { this._ended = true; return this },
            }

            await handler(mockReq, mockRes)
            send(mockRes._status, mockRes._headers, mockRes._body)
          } catch (error) {
            console.warn(`[${route}] Error:`, error.message)
            send(500, {}, { error: 'Internal API error' })
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    devApiPlugin('/api/quiz', path.resolve(process.cwd(), 'api/quiz.js')),
    devApiPlugin('/api/send-email', path.resolve(process.cwd(), 'api/send-email.js')),
  ],
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
    port: 5000,
  },
})