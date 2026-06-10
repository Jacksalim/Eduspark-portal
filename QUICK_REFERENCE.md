# Quick Reference Guide — EduSpark Quiz System

## 🎯 5-Minute Setup

```bash
# 1. Get API keys
#    - Gemini:    https://console.cloud.google.com
#    - Anthropic: https://console.anthropic.com

# 2. Set environment variables
cp .env.example .env.local
# Edit .env.local and add your API keys

# 3. Verify setup
node verify-quiz-setup.js

# 4. Start development
npm run dev

# 5. Test API
curl -X POST http://localhost:5173/api/quiz \
  -H "Content-Type: application/json" \
  -d '{"grade": 9, "subject": "Mathematics"}'
```

## 📋 Supported Values

**Grades:** 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12

**Subjects:**
- Mathematics
- English
- Science
- Social Studies
- ICT

## 🔌 API Endpoint

```
POST /api/quiz
```

### Request
```json
{
  "grade": 9,
  "subject": "Mathematics"
}
```

### Response (Success)
```json
{
  "success": true,
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": "...",
      "explanation": "..."
    }
  ],
  "provider": "gemini",
  "metadata": {
    "grade": 9,
    "subject": "Mathematics",
    "questionCount": 5,
    "generatedAt": "2026-06-10T15:30:45.123Z",
    "responseTime": "2345ms"
  }
}
```

### Response (Error)
```json
{
  "error": "Invalid input",
  "details": ["Grade must be 1-12, got 15"],
  "supported": {
    "grades": "1-12",
    "subjects": ["Mathematics", "English", "..."],
    "exampleRequest": {
      "grade": 9,
      "subject": "Mathematics"
    }
  }
}
```

## 🔑 Environment Variables

| Variable | Where to Get | Example |
|----------|--------------|---------|
| `GEMINI_API_KEY` | console.cloud.google.com | `AIzaSyD...` |
| `ANTHROPIC_API_KEY` | console.anthropic.com | `sk-ant-...` |
| `DEBUG_EDUSPARK` | Manual | `true` |

## 📂 File Structure

```
api/
├── quiz.js                    # Entry point
└── lib/
    ├── aiProvider.js          # Utilities & validation
    └── generateQuiz.js        # Multi-provider logic

Documentation:
├── API_DOCUMENTATION.md       # Full reference
├── QUIZ_SETUP.md             # Setup guide
├── FRONTEND_INTEGRATION.md   # React examples
└── verify-quiz-setup.js      # Verification script
```

## 🧪 Testing

### Test with cURL
```bash
curl -X POST http://localhost:5173/api/quiz \
  -H "Content-Type: application/json" \
  -d '{"grade": 9, "subject": "Mathematics"}' | jq
```

### Test in Browser Console
```javascript
fetch('/api/quiz', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ grade: 9, subject: 'Mathematics' })
})
.then(r => r.json())
.then(console.log)
```

### Test Invalid Inputs
```bash
# Missing subject
curl -X POST http://localhost:5173/api/quiz \
  -d '{"grade": 9}'

# Invalid grade
curl -X POST http://localhost:5173/api/quiz \
  -d '{"grade": 99, "subject": "Mathematics"}'

# Invalid subject
curl -X POST http://localhost:5173/api/quiz \
  -d '{"grade": 9, "subject": "Physics"}'
```

## ⚙️ How It Works

```
Request
   ↓
Validate Input (grade 1-12, subject in list)
   ↓
Check Providers (at least one configured)
   ↓
Try Gemini (with 1 retry)
   ↓
  ├─ Success? → Return Response
  │
  └─ Fail? → Try Anthropic (with 1 retry)
                ├─ Success? → Return Response
                │
                └─ Fail? → Return Error
```

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| "No API providers configured" | Add GEMINI_API_KEY or ANTHROPIC_API_KEY to .env.local |
| "Request timed out" | Retry in a moment; check provider status |
| "SAFETY" error | May be transient; try different grade/subject |
| "Invalid input" | Check grade (1-12) and subject match supported list |
| API key format error | Verify key starts with `AIza` (Gemini) or `sk-ant-` (Anthropic) |

## 📊 Performance

- **Typical:** 2–5 seconds
- **Max:** 25 seconds
- **Monthly quota:** Gemini 10k (free), Anthropic varies
- **Questions:** Always 5
- **Options:** Always 4 per question

## 🚀 Vercel Deployment

1. Go to Vercel Dashboard
2. Settings → Environment Variables
3. Add `GEMINI_API_KEY` and `ANTHROPIC_API_KEY`
4. Redeploy (git push or click "Redeploy")
5. Check logs: Deployments → Function Logs

## 📖 Documentation Map

| Need | Read |
|------|------|
| Complete API reference | [API_DOCUMENTATION.md](API_DOCUMENTATION.md) |
| Setup & deployment | [QUIZ_SETUP.md](QUIZ_SETUP.md) |
| React integration | [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) |
| Full implementation details | [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) |
| Verify setup | `node verify-quiz-setup.js` |

## 💾 Logging

All requests logged to Vercel:
```
[EduSpark AI] INFO  Quiz request received
[EduSpark AI] INFO  Using primary provider: Gemini
[EduSpark AI] ✓ OK    Gemini success {questions: 5}
```

Enable debug logging: Set `DEBUG_EDUSPARK=true`

## 🔒 Security

- ✅ API keys never sent to frontend
- ✅ Server-side only
- ✅ Input validation
- ✅ No sensitive data logged
- ✅ CORS enabled
- ✅ HTTPS enforced

## 📞 Quick Links

- **Google Gemini:** https://ai.google.dev
- **Anthropic Claude:** https://docs.anthropic.com
- **Vercel Docs:** https://vercel.com/docs/functions/serverless-functions
- **Supabase:** https://supabase.com

## ✅ Checklist

- [ ] API keys obtained from both providers
- [ ] `.env.local` configured
- [ ] `verify-quiz-setup.js` passes
- [ ] `npm run dev` starts successfully
- [ ] cURL test returns quiz questions
- [ ] Browser fetch test works
- [ ] Deployed to Vercel
- [ ] Environment variables set in Vercel
- [ ] Vercel logs show successful generations
- [ ] Frontend integrated with quiz component

---

**Need help?** See [QUIZ_SETUP.md](QUIZ_SETUP.md) and [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
