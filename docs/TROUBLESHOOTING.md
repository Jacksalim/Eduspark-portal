# Troubleshooting & Best Practices — EduSpark Quiz System

## 🔧 Troubleshooting Guide

### Problem: "No API providers configured"

**Error Message:**
```json
{
  "error": "No AI providers configured",
  "hint": "Set GEMINI_API_KEY and/or ANTHROPIC_API_KEY..."
}
```

**Causes:**
1. Environment variables not set
2. Wrong environment variable names
3. Function not redeployed after adding variables

**Solutions:**

**Local Development:**
```bash
# 1. Check .env.local exists and has both keys
cat .env.local
# Should show:
# GEMINI_API_KEY=your_key
# ANTHROPIC_API_KEY=your_key

# 2. Verify keys are not empty
echo $GEMINI_API_KEY
echo $ANTHROPIC_API_KEY

# 3. Restart dev server
npm run dev
```

**Vercel Deployment:**
```bash
# 1. Go to: Vercel Dashboard → Project → Settings → Environment Variables
# 2. Verify both variables are set (not empty)
# 3. Click "Redeploy" button
# 4. Wait for deployment to complete
# 5. Check logs: Deployments → Function Logs

# Or redeploy via git:
git add .
git commit -m "Trigger redeploy"
git push origin main
```

---

### Problem: "Invalid input"

**Error Message:**
```json
{
  "error": "Invalid input",
  "details": ["Grade must be 1-12, got 15"]
}
```

**Causes:**
1. Grade outside 1-12 range
2. Subject not in supported list
3. Missing grade or subject

**Supported Values:**
- **Grades:** 1, 2, 3, ..., 12
- **Subjects:** Mathematics, English, Science, Social Studies, ICT

**Solution:**
```bash
# ✓ Valid request
curl -X POST http://localhost:5173/api/quiz \
  -H "Content-Type: application/json" \
  -d '{"grade": 9, "subject": "Mathematics"}'

# ✗ Invalid grade
curl -X POST http://localhost:5173/api/quiz \
  -d '{"grade": 99, "subject": "Mathematics"}'

# ✗ Invalid subject
curl -X POST http://localhost:5173/api/quiz \
  -d '{"grade": 9, "subject": "Physics"}'

# ✗ Missing subject
curl -X POST http://localhost:5173/api/quiz \
  -d '{"grade": 9}'
```

---

### Problem: "Request timed out after 25000ms"

**Error Message:**
```json
{
  "error": "Quiz generation failed. Please try again in a moment.",
  "providers": {
    "gemini": "Request timed out after 25000ms",
    "anthropic": "Request timed out after 25000ms"
  }
}
```

**Causes:**
1. AI provider is slow or unavailable
2. Network latency
3. API overload
4. Invalid API key (slow rejection)

**Solutions:**

**Immediate:**
- Wait a moment and retry
- Check your internet connection

**Check Provider Status:**
```bash
# Google Cloud Status
# https://status.cloud.google.com

# Anthropic Status
# https://status.anthropic.com
```

**Check API Keys:**
```bash
# Verify key format
echo $GEMINI_API_KEY | head -c 10  # Should start with "AIza"
echo $ANTHROPIC_API_KEY | head -c 10  # Should start with "sk-ant"

# Verify keys are active:
# Google: https://console.cloud.google.com/apis/credentials
# Anthropic: https://console.anthropic.com/account/keys
```

**Check Quotas:**
```bash
# Google Cloud Console
# https://console.cloud.google.com/billing

# Anthropic Console
# https://console.anthropic.com/usage
```

---

### Problem: "Anthropic credit balance too low"

**Error Message:**
```json
{
  "error": "Quiz generation failed. Please try again in a moment.",
  "providers": {
    "anthropic": "Anthropic credit balance too low — top up at console.anthropic.com"
  }
}
```

**Solution:**
1. Go to https://console.anthropic.com/account/billing
2. Add payment method
3. Add credits/balance
4. Wait 5-10 minutes for balance to update
5. Retry quiz generation

---

### Problem: "SAFETY" error from Gemini

**Error Message:**
```json
{
  "error": "Quiz generation failed. Please try again in a moment.",
  "providers": {
    "gemini": "Gemini blocked by safety filters"
  }
}
```

**Causes:**
1. Content may violate safety policies
2. Specific words or topics triggered filters
3. Transient issue

**Solutions:**
- Try a different subject or grade
- Retry (may be transient)
- Report if persistent

---

### Problem: "Empty response from AI provider"

**Error Message:**
```
[EduSpark AI] ERROR Gemini empty response
```

**Causes:**
1. API returned empty content
2. Malformed response
3. API error not properly handled

**Solutions:**
- Retry the request
- Check API status
- Verify API key is valid
- Check logs for more details

---

### Problem: Seeing provider switching in logs

**Log Output:**
```
[EduSpark AI] INFO  Using primary provider: Gemini
[EduSpark AI] WARN  Gemini failed, switching to Anthropic
[EduSpark AI] INFO  Using fallback provider: Anthropic
[EduSpark AI] ✓ OK    Anthropic success
```

**What This Means:**
- ✅ System is working correctly!
- Gemini had a transient issue
- Anthropic successfully generated the quiz
- This is expected behavior for redundancy

**Not a Problem:** This is normal operation showing the fallback system working.

---

### Problem: "Method not allowed"

**Error Message:**
```json
{
  "error": "Method not allowed",
  "allowed": ["POST"],
  "hint": "Use POST /api/quiz with { grade, subject } body"
}
```

**Causes:**
1. Using GET instead of POST
2. Using PUT, DELETE, or other methods

**Solution:**
```bash
# ✗ Wrong
curl http://localhost:5173/api/quiz

# ✗ Wrong
curl -X GET http://localhost:5173/api/quiz

# ✓ Correct
curl -X POST http://localhost:5173/api/quiz \
  -H "Content-Type: application/json" \
  -d '{"grade": 9, "subject": "Mathematics"}'
```

---

## 🎯 Best Practices

### 1. Environment Variable Management

**Do:**
```bash
# ✓ Use .env.local for local development
cp .env.example .env.local

# ✓ Set both keys for redundancy
GEMINI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key

# ✓ Keep keys secret — add to .gitignore
echo ".env.local" >> .gitignore
```

**Don't:**
```bash
# ✗ Don't commit .env.local
git add .env.local  # BAD

# ✗ Don't use placeholder values in production
GEMINI_API_KEY=placeholder

# ✗ Don't log API keys
console.log(process.env.GEMINI_API_KEY)  // BAD
```

### 2. Error Handling in Frontend

**Do:**
```jsx
// ✓ Show user-friendly messages
const { error, loading, questions } = useQuizGenerator()

if (error) {
  return (
    <div className="error">
      <p>We're having trouble generating your quiz.</p>
      <p>Please try again in a moment.</p>
      <button onClick={() => generateQuiz(grade, subject)}>
        Retry
      </button>
    </div>
  )
}

if (loading) {
  return <div className="loading">Generating quiz...</div>
}

return <QuestionCard questions={questions} />
```

**Don't:**
```jsx
// ✗ Don't expose API error details to users
{error && <div>{error}</div>}  // Shows raw error

// ✗ Don't retry immediately
if (error) {
  generateQuiz()  // Infinite retry loop!
}

// ✗ Don't show loading spinner and error together
{loading && <Spinner />}
{error && <Error />}
```

### 3. API Call Management

**Do:**
```javascript
// ✓ Use AbortController for timeout handling
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 30000)

try {
  const response = await fetch('/api/quiz', {
    method: 'POST',
    signal: controller.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grade, subject })
  })
} finally {
  clearTimeout(timeoutId)
}

// ✓ Handle network errors
try {
  const result = await generateQuiz(grade, subject)
} catch (err) {
  if (err instanceof TypeError) {
    // Network error
  } else if (err.name === 'AbortError') {
    // Timeout
  } else {
    // Other error
  }
}
```

**Don't:**
```javascript
// ✗ Don't fire and forget
fetch('/api/quiz', ...).then(...)  // No error handling

// ✗ Don't retry immediately on failure
async function generateWithRetry() {
  try {
    return await generateQuiz()
  } catch {
    return generateWithRetry()  // Infinite recursion!
  }
}

// ✗ Don't make requests without debouncing
<input 
  onChange={(e) => generateQuiz(e.target.value)}  // Fires on every keystroke!
/>
```

### 4. Monitoring & Logging

**Do:**
```javascript
// ✓ Log important events
console.log('[Quiz] Generated by', provider, 'in', responseTime, 'ms')

// ✓ Track metrics
analytics.trackEvent('quiz_generated', {
  grade,
  subject,
  provider,
  responseTime
})

// ✓ Monitor errors
Sentry.captureException(error, {
  tags: { grade, subject }
})
```

**Don't:**
```javascript
// ✗ Don't log sensitive data
console.log({ apiKey, apiResponse })

// ✗ Don't ignore errors silently
try {
  await generateQuiz()
} catch (err) {
  // Say nothing
}

// ✗ Don't log on every keystroke
<input onChange={(e) => console.log(e.target.value)} />
```

### 5. Testing

**Do:**
```bash
# ✓ Test with valid inputs
curl -X POST http://localhost:5173/api/quiz \
  -d '{"grade": 9, "subject": "Mathematics"}'

# ✓ Test edge cases
curl -X POST http://localhost:5173/api/quiz \
  -d '{"grade": 1, "subject": "Mathematics"}'  # Minimum

curl -X POST http://localhost:5173/api/quiz \
  -d '{"grade": 12, "subject": "Mathematics"}'  # Maximum

# ✓ Test error cases
curl -X POST http://localhost:5173/api/quiz \
  -d '{"grade": 99, "subject": "Mathematics"}'  # Invalid

# ✓ Use verification script
node verify-quiz-setup.js
```

**Don't:**
```bash
# ✗ Don't test with hardcoded values only
# Test a range of inputs

# ✗ Don't skip error testing
# Always test invalid inputs

# ✗ Don't test only happy paths
# Test failure scenarios
```

### 6. Performance Optimization

**Do:**
```javascript
// ✓ Cache responses by grade+subject
const cacheKey = `${grade}_${subject}`
if (cache[cacheKey]) {
  return cache[cacheKey]
}

// ✓ Show loading state early
setLoading(true)
const result = await generateQuiz()

// ✓ Debounce rapid requests
const debouncedGenerate = debounce(generateQuiz, 500)
```

**Don't:**
```javascript
// ✗ Don't make unnecessary API calls
// Check cache first

// ✗ Don't wait for loading state to update
// Set it immediately

// ✗ Don't allow rapid-fire requests
// User mashing "Generate" button = multiple API calls
```

## 📋 Production Checklist

Before deploying to production:

### Setup
- [ ] Both API keys obtained
- [ ] `.env.example` updated
- [ ] All environment variables configured in Vercel
- [ ] Verification script passes

### Code Quality
- [ ] No API keys in code
- [ ] No API keys in logs
- [ ] Error handling complete
- [ ] Loading states implemented
- [ ] Mobile responsive

### Testing
- [ ] Happy path tested (valid inputs)
- [ ] Edge cases tested (grades 1 and 12)
- [ ] Error cases tested (invalid inputs)
- [ ] Network errors handled
- [ ] Timeout scenarios tested
- [ ] Provider fallback tested

### Monitoring
- [ ] Vercel logs accessible
- [ ] Error tracking configured
- [ ] Performance metrics collected
- [ ] Rate limiting understood
- [ ] Quota limits tracked

### Documentation
- [ ] API documentation reviewed
- [ ] Team has access to guides
- [ ] Troubleshooting guide shared
- [ ] Support process defined

### Security
- [ ] API keys not in git history
- [ ] CORS configured correctly
- [ ] Input validation complete
- [ ] Rate limiting considered
- [ ] Error messages safe

## 🆘 Getting Help

### Check Documentation
1. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) — Fast answers
2. [API_DOCUMENTATION.md](API_DOCUMENTATION.md) — API details
3. [QUIZ_SETUP.md](QUIZ_SETUP.md) — Setup help
4. [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) — Frontend help

### Debug Steps
1. Run `node verify-quiz-setup.js`
2. Check `npm run dev` console logs
3. Check Vercel function logs
4. Check API key format and validity
5. Check provider status pages

### Report Issues
- Check existing error in this guide
- Review logs and error messages
- Test with curl to isolate frontend issues
- Verify API keys are active
- Check provider status

---

**Last Updated:** 2026-06-10
