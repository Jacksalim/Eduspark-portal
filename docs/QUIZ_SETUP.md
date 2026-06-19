# EduSpark Quiz System — Setup Guide

## Quick Start

### 1. Get API Keys (5 minutes)

#### Google Gemini
```bash
# Visit: https://console.cloud.google.com
# 1. Create/select a project
# 2. Enable: Generative Language API
# 3. Go to: APIs & Services → Credentials
# 4. Click: Create Credentials → API Key
# 5. Copy the key
```

#### Anthropic Claude
```bash
# Visit: https://console.anthropic.com/account/keys
# 1. Log in or create account
# 2. Click: Create Key
# 3. Copy the key
```

### 2. Local Development

1. **Copy environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Add your API keys to `.env.local`:**
   ```
   GEMINI_API_KEY=your_key_here
   ANTHROPIC_API_KEY=your_key_here
   ```

3. **Test locally:**
   ```bash
   npm run dev
   # Test: curl -X POST http://localhost:5173/api/quiz \
   #   -H "Content-Type: application/json" \
   #   -d '{"grade": 9, "subject": "Mathematics"}'
   ```

### 3. Deploy to Vercel

1. **Go to Vercel Dashboard** → Your Project → Settings

2. **Add Environment Variables:**
   - Click: Environment Variables
   - Add: `GEMINI_API_KEY` = your_key
   - Add: `ANTHROPIC_API_KEY` = your_key
   - Click: Save

3. **Redeploy:**
   ```bash
   git push origin main
   # or click "Redeploy" in Vercel Dashboard
   ```

4. **Verify:** Check Vercel Deployments → Function Logs

## File Structure

```
/workspaces/Eduspark-portal/
├── api/
│   ├── quiz.js                    # Main entry point (Vercel function)
│   └── lib/
│       ├── aiProvider.js          # Provider abstraction & utilities
│       └── generateQuiz.js        # Multi-provider quiz generation
├── .env.example                   # Environment template
└── API_DOCUMENTATION.md           # Full API reference
```

## What Each File Does

### `api/quiz.js`
- Vercel serverless function handler
- Validates input (grade 1-12, subject validation)
- Checks provider configuration
- Calls quiz generation
- Returns formatted response with metadata
- Handles CORS and error responses

### `api/lib/aiProvider.js`
- Shared utilities for AI providers
- `buildPrompt()` — Creates optimized prompts for quiz generation
- `extractJSON()` — Safely extracts JSON from responses
- `validateQuiz()` — Ensures quiz quality
- `withTimeout()` — 25-second request timeout
- `log` — Structured logging
- `checkProviderKeys()` — Health check of configured providers
- Subject/grade validation

### `api/lib/generateQuiz.js`
- Core multi-provider logic
- `callGemini()` — Google Gemini provider
- `callAnthropic()` — Anthropic Claude provider
- `withRetry()` — Retry logic (1 attempt per provider)
- `generateQuiz()` — Main orchestrator
  - Tries Gemini first
  - Falls back to Anthropic on failure
  - Returns detailed error if both fail

## Features

✅ **Multi-Provider Support**
- Google Gemini (primary)
- Anthropic Claude (fallback)

✅ **Automatic Fallback**
- If Gemini fails → switches to Anthropic
- If Anthropic fails → returns user-friendly error

✅ **Retry Logic**
- 1 retry per provider for transient errors
- Only retries on timeout/transient issues
- Fails fast on configuration errors

✅ **Production-Ready**
- 25-second timeout (under Vercel's 30s limit)
- CORS enabled
- Comprehensive error messages
- Structured logging
- Health checks

✅ **Flexible**
- Grades 1–12 supported
- 5 subjects supported
- Easy to add more subjects
- Easy to switch providers

✅ **Secure**
- API keys never sent to frontend
- Server-side only
- Input validation
- No sensitive data logged

## Supported Content

| Grade | Subjects |
|-------|----------|
| 1–12 | Mathematics, English, Science, Social Studies, ICT |

## Troubleshooting

### Issue: "No AI providers configured"
**Solution:**
1. Check `.env.local` has both keys (local dev)
2. Check Vercel → Settings → Environment Variables
3. Restart Vercel function (redeploy)

### Issue: "Request timed out after 25000ms"
**Solution:**
1. Wait a moment and retry
2. Check provider status:
   - [Google Cloud Status](https://status.cloud.google.com)
   - [Anthropic Status](https://status.anthropic.com)
3. Check provider quotas and balances

### Issue: "Anthropic credit balance too low"
**Solution:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Add payment method
3. Wait for balance to update
4. Retry

### Issue: "SAFETY" error from Gemini
**Solution:**
1. Gemini blocked content
2. Check the prompt/request
3. Try different subject/grade
4. Retry (may be transient)

### Issue: Seeing provider switches in logs
**Solution:**
- This is normal! The system is working correctly
- Check logs to see which provider succeeded
- Both providers working = redundancy is working

### How to View Logs

**Local Development:**
```bash
npm run dev
# Logs print to console
```

**Vercel Production:**
1. Go to Vercel Dashboard → Deployments
2. Click recent deployment
3. Click "Function Logs"
4. Filter by time/status

**Log Format:**
```
[EduSpark AI] ✓ OK    Quiz generated in 2345ms {"provider":"gemini","grade":9,"subject":"Mathematics","questions":5}
[EduSpark AI] WARN    Gemini attempt 1 failed: Request timed out
[EduSpark AI] INFO    Using fallback provider: Anthropic
[EduSpark AI] ✓ OK    Anthropic success
```

## Testing

### Test in Browser
```javascript
// Open browser console and run:
fetch('/api/quiz', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ grade: 9, subject: 'Mathematics' })
})
.then(r => r.json())
.then(console.log)
```

### Test with cURL
```bash
curl -X POST http://localhost:5173/api/quiz \
  -H "Content-Type: application/json" \
  -d '{"grade": 9, "subject": "Mathematics"}' | jq
```

### Test Edge Cases
```bash
# Invalid grade
curl -X POST http://localhost:5173/api/quiz \
  -d '{"grade": 99, "subject": "Mathematics"}'
# Expected: 400 error

# Missing subject
curl -X POST http://localhost:5173/api/quiz \
  -d '{"grade": 9}'
# Expected: 400 error

# Invalid subject
curl -X POST http://localhost:5173/api/quiz \
  -d '{"grade": 9, "subject": "Physics"}'
# Expected: 400 error
```

## Performance Optimization

### Current Performance
- **Typical response:** 2–5 seconds
- **P95 response:** ~10 seconds
- **Timeout:** 25 seconds
- **Queries/month (free tier):** Gemini 10k, Anthropic varies by plan

### To Optimize Further
1. **Cache responses:**
   - Add Redis/KV store
   - Cache by `grade+subject` pair

2. **Parallelize calls:**
   - Call both providers in parallel
   - Return first successful response

3. **Use faster models:**
   - Switch to Gemini Flash for faster generations
   - Already using Claude 3.5 Sonnet

## Next Steps

1. ✅ Set up API keys
2. ✅ Deploy to Vercel
3. 📋 Integrate with frontend (see API_DOCUMENTATION.md)
4. 📊 Monitor usage in Vercel Logs
5. 🔄 Add caching if needed
6. 📈 Scale as usage grows

## Support & Resources

- **API Documentation:** [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Google Gemini Docs:** https://ai.google.dev
- **Anthropic Docs:** https://docs.anthropic.com
- **Vercel Functions:** https://vercel.com/docs/functions/serverless-functions
- **Status Pages:**
  - https://status.cloud.google.com
  - https://status.anthropic.com

## Environment Variables Reference

| Variable | Required | Where to Get | Example |
|----------|----------|--------------|---------|
| `GEMINI_API_KEY` | Yes* | console.cloud.google.com | `AIzaSyD...` |
| `ANTHROPIC_API_KEY` | Yes* | console.anthropic.com | `sk-ant-...` |
| `DEBUG_EDUSPARK` | No | Manual | `true` or `false` |

*At least one is required; both recommended for redundancy

---

**Last Updated:** 2026-06-10
**System Version:** 1.0.0
