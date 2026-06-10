# EduSpark AI Quiz Generation API

## Overview

The EduSpark API provides intelligent quiz generation powered by multiple AI providers:

- **Google Gemini** (Primary) — Fast, efficient quiz generation
- **Anthropic Claude** (Fallback) — Automatic fallback if Gemini fails

## Architecture

```
POST /api/quiz
    ↓
Input Validation (grade, subject)
    ↓
Provider Health Check
    ↓
Try Gemini (with 1 retry on failure)
    ↓ (on failure)
Try Anthropic (with 1 retry on failure)
    ↓ (on failure)
Return User-Friendly Error
```

## Endpoint

### POST `/api/quiz`

Generate a quiz for a specific grade and subject.

**Request:**
```json
{
  "grade": 9,
  "subject": "Mathematics"
}
```

**Supported Grades:** 1–12

**Supported Subjects:**
- Mathematics
- English
- Science
- Social Studies
- ICT

**Success Response (200):**
```json
{
  "success": true,
  "questions": [
    {
      "question": "What is the capital of Kenya?",
      "options": ["Nairobi", "Mombasa", "Kisumu", "Nakuru"],
      "correctAnswer": "Nairobi",
      "explanation": "Nairobi has been the capital of Kenya since independence in 1964."
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

**Error Responses:**

- **400 — Invalid Input**
```json
{
  "error": "Invalid input",
  "details": ["Grade must be 1-12, got 15"],
  "supported": {
    "grades": "1-12",
    "subjects": ["Mathematics", "English", "Science", "Social Studies", "ICT"],
    "exampleRequest": {
      "grade": 9,
      "subject": "Mathematics"
    }
  }
}
```

- **500 — No Providers Configured**
```json
{
  "error": "No AI providers configured",
  "hint": "Set GEMINI_API_KEY and/or ANTHROPIC_API_KEY in Vercel environment variables",
  "setup": {
    "step1": "Go to Vercel project → Settings → Environment Variables",
    "step2": "Add GEMINI_API_KEY from console.cloud.google.com",
    "step3": "Add ANTHROPIC_API_KEY from console.anthropic.com"
  }
}
```

- **502 — All Providers Failed**
```json
{
  "error": "Quiz generation failed. Please try again in a moment.",
  "userMessage": "We are having trouble generating your quiz...",
  "providers": {
    "gemini": "Request timed out after 25000ms",
    "anthropic": "ANTHROPIC_API_KEY not configured"
  },
  "troubleshooting": {
    "step1": "Wait a moment and try again",
    "step2": "Check that API keys are correctly set",
    "step3": "Check Gemini API quota at console.cloud.google.com",
    "step4": "Check Anthropic account balance at console.anthropic.com"
  },
  "responseTime": "25150ms",
  "timestamp": "2026-06-10T15:30:45.123Z"
}
```

## Setup Instructions

### 1. Get API Keys

**Google Gemini:**
1. Visit [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Generative Language API**
4. Go to **APIs & Services → Credentials**
5. Create an API Key
6. Copy the key

**Anthropic Claude:**
1. Visit [Anthropic Console](https://console.anthropic.com)
2. Click **Settings → API Keys**
3. Create a new API key
4. Copy the key

### 2. Configure in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings → Environment Variables**
3. Add the following:
   - Name: `GEMINI_API_KEY`, Value: `your_gemini_key`
   - Name: `ANTHROPIC_API_KEY`, Value: `your_anthropic_key`
4. Redeploy or restart the function

### 3. Local Development

Create `.env.local`:
```
GEMINI_API_KEY=your_gemini_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Error Handling

The system implements robust error handling:

| Error | What It Means | How to Fix |
|-------|--------------|-----------|
| Invalid input | Grade/subject not supported | Check supported grades (1-12) and subjects |
| No providers configured | No API keys set | Add GEMINI_API_KEY and/or ANTHROPIC_API_KEY |
| Request timed out | Provider took > 25 seconds | Retry; check provider status |
| SAFETY | Content blocked by AI provider | Verify request content |
| Credit balance too low | Provider account has insufficient balance | Top up account credits |

## Retry Logic

Each provider is retried **once** before switching:

1. **Gemini Attempt 1** (with 25s timeout)
2. **Gemini Attempt 2** (if transient error)
3. → Falls back to Anthropic if both fail
4. **Anthropic Attempt 1** (with 25s timeout)
5. **Anthropic Attempt 2** (if transient error)
6. → Returns error if both fail

## Logging

All requests are logged to Vercel function logs:

```
[EduSpark AI] INFO  Quiz request received {"grade":9,"subject":"Mathematics","providers":...}
[EduSpark AI] INFO  Using primary provider: Gemini {"grade":9,"subject":"Mathematics"}
[EduSpark AI] ✓ OK    Gemini success {"grade":9,"subject":"Mathematics","questions":5}
```

Enable debug logging by setting `DEBUG_EDUSPARK=true` in environment variables.

## Rate Limiting

- **Gemini:** 10,000 requests/month free tier
- **Anthropic:** Depends on plan; typically 100k tokens/month for Claude 3.5 Sonnet

Monitor usage in:
- [Google Cloud Console](https://console.cloud.google.com/billing) — Gemini
- [Anthropic Console](https://console.anthropic.com/usage) — Anthropic

## Performance

- **Typical response time:** 2–5 seconds
- **Timeout limit:** 25 seconds (Vercel serverless timeout is 30s)
- **Max retries:** 1 per provider

## FAQ

**Q: Why does it try Gemini first?**
A: Gemini is faster and more cost-effective for quiz generation, making it the ideal primary choice.

**Q: What if both providers fail?**
A: Users see a friendly error message. Check environment variables, API quotas, and account balances.

**Q: Can I use only one provider?**
A: Yes, but set both keys for redundancy. The system automatically uses whichever is available.

**Q: How many questions are generated?**
A: Exactly 5 questions per request.

**Q: Can I customize the quiz format?**
A: Currently, the format is fixed (5 questions, 4 options each). Contact support for custom formats.

## Security

- API keys are **never** sent to the frontend (server-side only)
- All API calls use HTTPS
- Input is validated and sanitized
- CORS is enabled for cross-origin requests
- No sensitive data is logged

## Support

For issues or questions:
1. Check the troubleshooting section in error responses
2. Review logs in Vercel Dashboard → Function Logs
3. Verify API keys are correct and active
4. Check provider status pages:
   - [Google Cloud Status](https://status.cloud.google.com)
   - [Anthropic Status](https://status.anthropic.com)

## Implementation Example

### Frontend (React)

```jsx
import { useState } from 'react'

export default function QuizGenerator() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [questions, setQuestions] = useState([])

  const generateQuiz = async (grade, subject) => {
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade, subject })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.userMessage || data.error)
        return
      }
      
      setQuestions(data.questions)
      console.log(`Generated by ${data.provider} in ${data.metadata.responseTime}`)
      
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button 
        onClick={() => generateQuiz(9, 'Mathematics')}
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Generate Quiz'}
      </button>
      
      {error && <div style={{color: 'red'}}>{error}</div>}
      
      {questions.map((q, i) => (
        <div key={i}>
          <h3>{q.question}</h3>
          <ul>
            {q.options.map((opt, j) => (
              <li key={j}>{opt}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
```

### cURL Example

```bash
curl -X POST https://your-app.vercel.app/api/quiz \
  -H "Content-Type: application/json" \
  -d '{
    "grade": 9,
    "subject": "Mathematics"
  }'
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-10 | Initial release with Gemini + Anthropic multi-provider support |
