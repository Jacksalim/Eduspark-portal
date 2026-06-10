import { useState, useEffect } from 'react'
import {
  fetchVideos, fetchWatchedIds, markVideoWatched,
  saveQuizResult, fetchQuizResults, fetchProgress, fetchLeaderboard
  // ── AI Quiz Generation ────────────────────────────────────────────────────────
  // Gemini primary → Anthropic fallback via /api/quiz serverless function
  async function generateQuiz(grade, subject) {
    const res = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grade, subject })
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`)
    if (!data.questions || data.questions.length === 0) throw new Error('No questions returned from AI')

    // Normalise new format { question, options, correctAnswer, explanation }
    // into legacy format  { q, options, answer, explanation } used by the quiz UI
    const questions = data.questions.map(q => {
      if (q.q !== undefined) return q
      const answerIndex = q.options.indexOf(q.correctAnswer)
      return {
        q: q.question,
        options: q.options,
        answer: answerIndex >= 0 ? answerIndex : 0,
        explanation: q.explanation || ''
      }
    })

    return { questions, provider: data.provider || 'unknown' }
}
  let streak = 0
  let d = new Date()
  for (let i = 0; i < 30; i++) {
    const dateStr = d.toDateString()
    const hit = quizzes.some(q => new Date(q.created_at).toDateString() === dateStr)
    if (hit) { streak++; d.setDate(d.getDate() - 1) }
    else if (i === 0) { d.setDate(d.getDate() - 1) }
    else break
  }
  return streak
}

function getAchievements(quizzes, watchedIds) {
  const avg = quizzes.length ? Math.round(quizzes.reduce((a, q) => a + q.percent, 0) / quizzes.length) : 0
  const streak = calcStreak(quizzes)
  return [
    { icon: '🌟', label: 'First Step',     desc: 'Took your first quiz',    earned: quizzes.length >= 1 },
    { icon: '📺', label: 'Video Star',     desc: 'Watched your first video', earned: watchedIds.length >= 1 },
    { icon: '📚', label: 'Quiz Master',    desc: 'Completed 5 quizzes',      earned: quizzes.length >= 5 },
    { icon: '🏆', label: 'Perfect Score',  desc: 'Scored 100% on a quiz',    earned: quizzes.some(q => q.percent === 100) },
    { icon: '🔥', label: 'On Fire',        desc: '3-day learning streak',    earned: streak >= 3 },
    { icon: '🎯', label: 'Sharp Shooter',  desc: 'Average score ≥ 80%',      earned: avg >= 80 && quizzes.length >= 3 },
    { icon: '⚡', label: 'Speed Learner',  desc: 'Completed 10 quizzes',     earned: quizzes.length >= 10 },
    { icon: '👑', label: 'Champion',       desc: 'Completed 20 quizzes',     earned: quizzes.length >= 20 },
  ]
}

function weeklyData(quizzes) {
  const result = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    result.push({
      label: ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()],
      count: quizzes.filter(q => new Date(q.created_at).toDateString() === d.toDateString()).length
    })
  }
  return result
}

// ── Video Modal ───────────────────────────────────────────────────────────────
function VideoModal({ video, userId, onClose, onWatched }) {
  function getEmbedUrl(url) {
    if (!url) return ''
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/)
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`
    const vm = url.match(/vimeo\.com\/(\d+)/)
    if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`
    return url
  }
  useEffect(() => { if (video && userId) markVideoWatched(video.id, userId).then(onWatched) }, [video?.id])
  if (!video) return null
  const embedUrl = getEmbedUrl(video.url)
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={{ background: '#000', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 860, boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        {embedUrl
          ? <iframe src={embedUrl} width="100%" height="460" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen title={video.title} style={{ display: 'block' }} />
          : <div style={{ padding: 40, color: '#fff', textAlign: 'center' }}><div style={{ fontSize: '3rem', marginBottom: 12 }}>🎬</div><p>Video: <a href={video.url} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>{video.url}</a></p></div>
        }
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '.95rem' }}>{video.title}</div>
            <div style={{ color: '#888', fontSize: '.8rem', marginTop: 2 }}>{video.subject} · Grade {video.grade} · {video.topic}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Quiz Section ──────────────────────────────────────────────────────────────
async function generateQuiz(grade, subject) {
  const res = await fetch('/api/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grade, subject })
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Error ${res.status}`) }
  const data = await res.json()
  if (!data.questions?.length) throw new Error('No questions returned')
  return data.questions
}
function fallbackQuestions(subject, grade) {
  return [
    { q: `Core concept in Grade ${grade} ${subject}?`, options: ['Option A','Option B','Option C','Option D'], answer: 0, explanation: 'Placeholder quiz — add ANTHROPIC_KEY to Vercel env vars.' },
    { q: 'What is 7 × 8?', options: ['54','56','48','64'], answer: 1, explanation: '7 × 8 = 56' },
    { q: 'What is 15% of 200?', options: ['30','25','35','20'], answer: 0, explanation: '15/100 × 200 = 30' },
    { q: 'Simplify: 4/8', options: ['1/3','1/2','2/3','3/4'], answer: 1, explanation: '4÷4=1, 8÷4=2 → 1/2' },
    { q: 'Solve: x + 5 = 12', options: ['6','7','8','17'], answer: 1, explanation: 'x = 12 − 5 = 7' },
  ]
}
async function start() {
  setLoading(true)
  setQuiz(null); setQIdx(0); setSelected(null)
  setAnswered(false); setDone(false); setFinalScore(0)
  answersRef.current = []
  try {
    const result = await generateQuiz(grade, subject)
    setQuiz(result.questions)
    if (result.provider === 'anthropic') {
      show('Quiz generated via Anthropic (Gemini unavailable)', 'info')
    } else if (result.provider === 'gemini') {
      console.log('[EduSpark] Quiz generated via Gemini')
    }
  } catch (err) {
    console.error('Quiz generation failed:', err.message)
    setQuiz(fallbackQuestions(subject, grade))
    show('AI unavailable — showing practice questions. Check API keys in Vercel.', 'error')
  }
  setLoading(false)
}
function QuizSection({ profile }) {
  const [grade, setGrade] = useState(profile?.grade || '7')
  const [subject, setSubject] = useState('Mathematics')
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(false)
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [history, setHistory] = useState([])
  const { show, ToastEl } = useToast()

  useEffect(() => { if (profile?.id) fetchQuizResults(profile.id).then(setHistory).catch(() => {}) }, [profile?.id])

  
  }

  function answer(i) {
    if (answered) return
    setSelected(i); setAnswered(true)
    if (i === quiz[qIdx].answer) setScore(s => s + 1)
  }

  async function next() {
    const lastCorrect = selected === quiz[qIdx].answer ? 1 : 0
    const computed = score + lastCorrect
    if (qIdx + 1 >= quiz.length) {
      setFinalScore(computed); setDone(true)
      if (profile?.id) {
        try {
          await saveQuizResult({ userId: profile.id, subject, grade, score: computed, total: quiz.length })
          setHistory(await fetchQuizResults(profile.id))
          show('Quiz result saved! ✅')
        } catch (e) { console.warn('Could not save quiz result:', e.message) }
      }
    } else { setQIdx(i => i + 1); setSelected(null); setAnswered(false) }
  }

  const pct = quiz ? Math.round((finalScore / quiz.length) * 100) : 0

  return (
    <div>
      {ToastEl}
      <div className="section-header">
        <h2>🤖 AI Quiz Generator</h2>
        <p>Generate curriculum-aligned questions for any grade and subject using Claude AI.</p>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24, alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Grade</label>
          <select className="form-control" value={grade} onChange={e => setGrade(e.target.value)} style={{ width: 130 }}>
            {GRADES.map(g => <option key={g} value={g}>{g === 'R' ? 'Grade R' : `Grade ${g}`}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Subject</label>
          <select className="form-control" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: 200 }}>
            {Object.keys(SUBJECTS).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <button className="btn btn-teal" onClick={start} disabled={loading} style={{ gap: 8 }}>
          {loading ? '⏳ Generating…' : '🤖 Generate AI Quiz'}
        </button>
      </div>

      {loading && (
        <div className="card card-pad" style={{ textAlign: 'center', padding: '56px 24px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Claude is crafting your quiz…</div>
          <div style={{ color: '#aaa', fontSize: '.85rem', marginTop: 6 }}>Grade {grade} {subject} — curriculum-aligned questions</div>
        </div>
      )}

      {!loading && quiz && !done && (
        <div className="card card-pad quiz-wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: 2 }}>{subject} · Grade {grade}</h3>
              <div style={{ color: '#888', fontSize: '.8rem' }}>Question {qIdx + 1} of {quiz.length}</div>
            </div>
            <span className="pill pill-green">{score} correct</span>
          </div>
          <div style={{ marginBottom: 20 }}><ProgressBar value={(qIdx / quiz.length) * 100} /></div>
          <div style={{ fontSize: '1.04rem', fontWeight: 600, lineHeight: 1.65, marginBottom: 22 }}>{quiz[qIdx].q}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quiz[qIdx].options.map((opt, i) => {
              let cls = 'option-btn'
              if (answered) { if (i === quiz[qIdx].answer) cls += ' correct'; else if (i === selected) cls += ' wrong' }
              else if (selected === i) cls += ' selected'
              return (
                <button key={i} className={cls} disabled={answered} onClick={() => answer(i)}>
                  <span className="option-label">{['A','B','C','D'][i]}</span>{opt}
                </button>
              )
            })}
          </div>
          {answered && (
            <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, fontSize: '.87rem', background: selected === quiz[qIdx].answer ? '#e6f5e6' : 'var(--rose-light)', color: selected === quiz[qIdx].answer ? '#256625' : 'var(--rose)' }}>
              💡 {quiz[qIdx].explanation}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
            <span style={{ color: '#aaa', fontSize: '.84rem' }}>
              {answered ? (selected === quiz[qIdx].answer ? '✅ Correct!' : '❌ Incorrect') : 'Select an answer above'}
            </span>
            {answered && (
              <button className="btn btn-teal btn-sm" onClick={next}>
                {qIdx + 1 < quiz.length ? 'Next Question →' : 'See Results'}
              </button>
            )}
          </div>
        </div>
      )}

      {done && (
        <div className="card card-pad" style={{ textAlign: 'center', padding: '52px 32px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>
            {pct === 100 ? '🌟' : pct >= 70 ? '🎉' : '📚'}
          </div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '4rem', fontWeight: 700, color: pct >= 70 ? 'var(--teal)' : pct >= 50 ? 'var(--gold)' : 'var(--rose)', lineHeight: 1 }}>
            {finalScore}/{quiz.length}
          </div>
          <div style={{ color: '#777', marginTop: 8, marginBottom: 6, fontSize: '1.1rem', fontWeight: 600 }}>{pct}%</div>
          <div style={{ color: '#aaa', fontSize: '.87rem', marginBottom: 24 }}>{subject} · Grade {grade}</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 28, color: 'var(--ink)' }}>
            {pct === 100 ? '🌟 Perfect score! Outstanding work!'
              : pct >= 70 ? '💪 Great job! Keep practising!'
              : '📖 Keep going — every attempt makes you stronger!'}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-teal" onClick={start}>Try Again →</button>
            <button className="btn btn-ghost" onClick={() => { setQuiz(null); setDone(false) }}>Change Subject</button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h4 style={{ marginBottom: 14, fontSize: '1rem' }}>📋 Recent Quiz History</h4>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Subject</th><th>Grade</th><th>Score</th><th>Result</th><th>Date</th></tr></thead>
              <tbody>
                {history.slice(0, 10).map(r => (
                  <tr key={r.id}>
                    <td><b>{r.subject}</b></td>
                    <td>Grade {r.grade}</td>
                    <td>{r.score}/{r.total}</td>
                    <td><span className={`pill ${r.percent >= 70 ? 'pill-green' : r.percent >= 50 ? 'pill-amber' : 'pill-red'}`}>{r.percent}%</span></td>
                    <td style={{ color: '#999', fontSize: '.8rem' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Dashboard Home ─────────────────────────────────────────────────────────────
function DashboardHome({ profile, quizzes, progress, watchedIds, loading, onNavigate }) {
  const quote = QUOTES[new Date().getDay() % QUOTES.length]
  const streak = calcStreak(quizzes)
  const avgScore = quizzes.length ? Math.round(quizzes.reduce((a, q) => a + q.percent, 0) / quizzes.length) : 0
  const overallProgress = progress.length ? Math.round(progress.reduce((a, p) => a + p.percent, 0) / progress.length) : 0
  const uniqueSubjects = [...new Set(quizzes.map(q => q.subject))].length
  const achievements = getAchievements(quizzes, watchedIds)
  const earned = achievements.filter(a => a.earned).length
  const weekChart = weeklyData(quizzes)
  const maxCount = Math.max(...weekChart.map(d => d.count), 1)

  const subjectColors = { Mathematics: 'var(--teal)', 'Business Studies': 'var(--purple)', English: 'var(--rose)', 'Natural Sciences': '#2d7a2d', Geography: '#b87a00', History: '#5c3a1e', 'Life Orientation': 'var(--teal)', Technology: '#1a5fbf', Accounting: 'var(--purple)', 'Physical Sciences': '#2d7a2d' }

  if (loading) return (
    <div>
      <div className="skeleton" style={{ height: 140, marginBottom: 24, borderRadius: 16 }} />
      <div className="stats-grid-6">
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}
      </div>
    </div>
  )

  return (
    <div>
      {/* Hero Welcome */}
      <div className="dash-hero" style={{ background: 'linear-gradient(135deg, var(--ink) 0%, #0f2a2a 60%, var(--teal) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: '.75rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>
              🎓 Learner Dashboard
            </div>
            <h2 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontFamily: "'Playfair Display',serif", marginBottom: 4 }}>
              Welcome back, {profile?.name?.split(' ')[0] || 'Learner'}! 👋
            </h2>
            <div style={{ opacity: .65, fontSize: '.88rem' }}>Grade {profile?.grade || '—'} · {new Date().toLocaleDateString('en-ZA', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            <div className="dash-hero-quote">"{quote.text}" — {quote.author}</div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {streak > 0 && (
              <div style={{ background: 'rgba(201,168,76,.2)', border: '1px solid rgba(201,168,76,.4)', borderRadius: 12, padding: '12px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', marginBottom: 2 }}>🔥</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 700, color: '#f0d9a0' }}>{streak}</div>
                <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Day Streak</div>
              </div>
            )}
            <div style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12, padding: '12px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 2 }}>🏅</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>{earned}/{achievements.length}</div>
              <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Badges</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid-6">
        {[
          { icon: '📺', label: 'Videos Watched',    val: watchedIds.length,             color: 'var(--teal)' },
          { icon: '📝', label: 'Quizzes Done',       val: quizzes.length,                color: '#6b4fa0' },
          { icon: '⭐', label: 'Average Score',      val: quizzes.length ? `${avgScore}%` : '—', color: 'var(--gold)' },
          { icon: '📊', label: 'Overall Progress',   val: progress.length ? `${overallProgress}%` : '—', color: 'var(--rose)' },
          { icon: '🔥', label: 'Learning Streak',    val: `${streak}d`,                  color: '#e07b39' },
          { icon: '📚', label: 'Subjects Active',    val: uniqueSubjects || progress.length, color: '#2d7a2d' },
        ].map(s => (
          <div key={s.label} className="stat-card-v2">
            <div className="stat-accent" style={{ background: s.color }} />
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
            <div className="stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Quick Actions */}
        <div className="card card-pad">
          <h4 style={{ marginBottom: 16, fontSize: '.95rem' }}>⚡ Quick Actions</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: '▶️', label: 'Watch Video Lessons', section: 'lessons', color: 'var(--teal)' },
              { icon: '🤖', label: 'Take an AI Quiz',     section: 'quiz',    color: 'var(--purple)' },
              { icon: '📊', label: 'View My Progress',    section: 'progress',color: 'var(--rose)' },
              { icon: '🏆', label: 'See Leaderboard',     section: 'leaderboard', color: 'var(--gold)' },
            ].map(a => (
              <button key={a.section} onClick={() => onNavigate(a.section)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--mist)', background: '#fff', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: '.875rem', color: 'var(--ink)', transition: 'all .15s', textAlign: 'left' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = '#fafbfc' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--mist)'; e.currentTarget.style.background = '#fff' }}>
                <span style={{ fontSize: '1.1rem' }}>{a.icon}</span> {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="card card-pad">
          <h4 style={{ marginBottom: 6, fontSize: '.95rem' }}>📅 Weekly Activity</h4>
          <p style={{ color: '#aaa', fontSize: '.78rem', marginBottom: 20 }}>Quizzes completed this week</p>
          <div className="week-chart">
            {weekChart.map((d, i) => (
              <div key={i} className="week-bar-wrap">
                <div className="week-bar" style={{
                  height: `${Math.max((d.count / maxCount) * 44, d.count > 0 ? 8 : 4)}px`,
                  background: d.count > 0 ? 'var(--teal)' : 'var(--mist)'
                }} />
                <span className="week-label">{d.label}</span>
              </div>
            ))}
          </div>
          {quizzes.length === 0 && (
            <p style={{ color: '#ccc', fontSize: '.8rem', textAlign: 'center', marginTop: 8 }}>Take a quiz to see your activity here!</p>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Subject Progress */}
        {progress.length > 0 && (
          <div className="card card-pad">
            <h4 style={{ marginBottom: 18, fontSize: '.95rem' }}>📚 Subject Progress</h4>
            {progress.map(p => (
              <div key={p.subject} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '.85rem', fontWeight: 600 }}>{SUBJECTS[p.subject]?.icon} {p.subject}</span>
                  <span style={{ fontSize: '.82rem', fontWeight: 700, color: subjectColors[p.subject] || 'var(--teal)' }}>{p.percent}%</span>
                </div>
                <ProgressBar value={p.percent} color={subjectColors[p.subject] || 'var(--teal)'} />
              </div>
            ))}
          </div>
        )}

        {/* Recent Quiz Activity */}
        <div className="card card-pad">
          <h4 style={{ marginBottom: 16, fontSize: '.95rem' }}>🕐 Recent Activity</h4>
          {quizzes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#ccc' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📝</div>
              <div style={{ fontSize: '.85rem' }}>No activity yet — take your first quiz!</div>
            </div>
          ) : quizzes.slice(0, 5).map(q => (
            <div key={q.id} className="activity-item">
              <div className="activity-dot" style={{ background: q.percent >= 70 ? '#e6f5e6' : q.percent >= 50 ? '#fff3d6' : 'var(--rose-light)' }}>
                {q.percent >= 70 ? '✅' : q.percent >= 50 ? '⚠️' : '❌'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.subject}</div>
                <div style={{ fontSize: '.76rem', color: '#aaa', marginTop: 2 }}>Grade {q.grade} · {q.score}/{q.total} · {new Date(q.created_at).toLocaleDateString()}</div>
              </div>
              <span className={`pill ${q.percent >= 70 ? 'pill-green' : q.percent >= 50 ? 'pill-amber' : 'pill-red'}`}>{q.percent}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h4 style={{ fontSize: '.95rem', margin: 0 }}>🏅 Achievements</h4>
          <span style={{ fontSize: '.8rem', color: '#aaa' }}>{earned} of {achievements.length} earned</span>
        </div>
        <div className="achievements-grid">
          {achievements.map(a => (
            <div key={a.label} className={`badge ${a.earned ? 'earned' : 'locked'}`}>
              <div className="badge-icon">{a.icon}</div>
              <div className="badge-name">{a.label}</div>
              <div className="badge-desc">{a.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Progress Section ───────────────────────────────────────────────────────────
function ProgressSection({ profile }) {
  const [progress, setProgress] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) { setLoading(false); return }
    Promise.all([fetchProgress(profile.id), fetchQuizResults(profile.id)])
      .then(([p, q]) => { setProgress(p); setQuizzes(q) })
      .finally(() => setLoading(false))
  }, [profile?.id])

  if (loading) return <Spinner />

  const subjectColors = { Mathematics: 'var(--teal)', 'Business Studies': 'var(--purple)', English: 'var(--rose)', 'Natural Sciences': '#2d7a2d', Geography: '#b87a00', History: '#5c3a1e', 'Life Orientation': 'var(--teal)', Technology: '#1a5fbf', Accounting: 'var(--purple)', 'Physical Sciences': '#2d7a2d' }
  const avgScore = quizzes.length ? Math.round(quizzes.reduce((a, q) => a + q.percent, 0) / quizzes.length) : 0
  const overallProgress = progress.length ? Math.round(progress.reduce((a, p) => a + p.percent, 0) / progress.length) : 0
  const streak = calcStreak(quizzes)

  return (
    <div>
      <div className="section-header">
        <h2>📊 My Progress</h2>
        <p>Track your performance and improvement across all subjects.</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { num: quizzes.length, label: 'Quizzes Taken', sub: 'Total', color: 'var(--teal)' },
          { num: quizzes.length ? `${avgScore}%` : '—', label: 'Average Score', sub: 'All subjects', color: 'var(--gold)' },
          { num: progress.length, label: 'Subjects Active', sub: 'Tracked', color: 'var(--purple)' },
          { num: `${streak}d`, label: 'Current Streak', sub: 'Day streak', color: '#e07b39' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-num" style={{ color: s.color }}>{s.num}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-sub" style={{ color: s.color }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {progress.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: 24 }}>
          <h4 style={{ marginBottom: 20 }}>📚 Subject Progress</h4>
          {progress.map(p => (
            <div key={p.subject} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: '.9rem', fontWeight: 600 }}>{SUBJECTS[p.subject]?.icon} {p.subject}</span>
                <span style={{ fontSize: '.85rem', fontWeight: 700, color: subjectColors[p.subject] || 'var(--teal)' }}>{p.percent}%</span>
              </div>
              <ProgressBar value={p.percent} color={subjectColors[p.subject] || 'var(--teal)'} height={10} />
            </div>
          ))}
        </div>
      )}

      {quizzes.length > 0 && (
        <div className="card card-pad">
          <h4 style={{ marginBottom: 16 }}>📋 Quiz History</h4>
          <div className="data-table-wrap" style={{ boxShadow: 'none', border: '1px solid var(--mist)' }}>
            <table className="data-table">
              <thead><tr><th>Subject</th><th>Grade</th><th>Score</th><th>Result</th><th>Date</th></tr></thead>
              <tbody>
                {quizzes.slice(0, 15).map(r => (
                  <tr key={r.id}>
                    <td><b>{r.subject}</b></td>
                    <td>Grade {r.grade}</td>
                    <td>{r.score}/{r.total}</td>
                    <td><span className={`pill ${r.percent >= 70 ? 'pill-green' : r.percent >= 50 ? 'pill-amber' : 'pill-red'}`}>{r.percent}%</span></td>
                    <td style={{ color: '#999', fontSize: '.8rem' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {quizzes.length === 0 && progress.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#ccc' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📊</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#888', marginBottom: 8 }}>No progress data yet</div>
          <div style={{ fontSize: '.88rem' }}>Take a quiz to start tracking your progress here!</div>
        </div>
      )}
    </div>
  )
}

// ── Leaderboard Section ────────────────────────────────────────────────────────
function LeaderboardSection({ profile }) {
  const [subject, setSubject] = useState('Mathematics')
  const [grade, setGrade] = useState(profile?.grade || '7')
  const [board, setBoard] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchLeaderboard(subject, grade)
      .then(setBoard)
      .catch(() => setBoard([]))
      .finally(() => setLoading(false))
  }, [subject, grade])

  const myRank = board.findIndex(r => r.user_id === profile?.id)
  const medals = ['🥇','🥈','🥉']

  function anonymize(name, userId) {
    if (userId === profile?.id) return 'You ⭐'
    if (!name) return 'Learner'
    const parts = name.split(' ')
    return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0]
  }

  return (
    <div>
      <div className="section-header">
        <h2>🏆 Leaderboard</h2>
        <p>Top performers by subject and grade. Names are anonymised to protect privacy.</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select className="form-control" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: 200 }}>
          {Object.keys(SUBJECTS).map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-control" value={grade} onChange={e => setGrade(e.target.value)} style={{ width: 130 }}>
          {GRADES.map(g => <option key={g} value={g}>{g === 'R' ? 'Grade R' : `Grade ${g}`}</option>)}
        </select>
      </div>

      {loading ? <Spinner label="Loading leaderboard…" /> : board.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ccc' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏆</div>
          <div style={{ fontWeight: 600, color: '#888', marginBottom: 6 }}>No scores yet for this filter</div>
          <div style={{ fontSize: '.88rem' }}>Be the first to take a {subject} Grade {grade} quiz!</div>
        </div>
      ) : (
        <div>
          {myRank > -1 && (
            <div style={{ background: 'var(--teal-light)', border: '1px solid var(--teal)', borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: '.9rem' }}>
              <span style={{ fontSize: '1.2rem' }}>📍</span>
              <span>You are ranked <strong style={{ color: 'var(--teal)' }}>#{myRank + 1}</strong> on this leaderboard.</span>
            </div>
          )}
          {board.map((r, i) => (
            <div key={r.user_id} className={`lb-row ${r.user_id === profile?.id ? 'me' : ''}`}>
              <div className="lb-rank" style={{ color: i < 3 ? ['#c9a84c','#888','#b87a00'][i] : '#ccc' }}>
                {i < 3 ? medals[i] : `#${i + 1}`}
              </div>
              <div className="lb-name">{anonymize(r.profiles?.name, r.user_id)}</div>
              <span className={`pill ${r.percent >= 70 ? 'pill-green' : r.percent >= 50 ? 'pill-amber' : 'pill-red'}`} style={{ marginRight: 8 }}>
                {r.score}/{r.total}
              </span>
              <div className="lb-score" style={{ color: r.percent >= 70 ? '#256625' : 'var(--rose)' }}>{r.percent}%</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Learner Portal ────────────────────────────────────────────────────────
export default function LearnerPortal({ profile }) {
  const [section, setSection] = useState('home')
  const [grade, setGrade] = useState(profile?.grade || '7')
  const [subject, setSubject] = useState('Mathematics')
  const [videos, setVideos] = useState([])
  const [watchedIds, setWatchedIds] = useState([])
  const [videoLoading, setVideoLoading] = useState(false)
  const [openVideo, setOpenVideo] = useState(null)
  const [homeQuizzes, setHomeQuizzes] = useState([])
  const [homeProgress, setHomeProgress] = useState([])
  const [homeLoading, setHomeLoading] = useState(true)
  const { show, ToastEl } = useToast()

  useEffect(() => {
    setVideoLoading(true)
    fetchVideos({ subject, grade }).then(setVideos).catch(() => setVideos([]).finally(() => setVideoLoading(false)))
      .finally(() => setVideoLoading(false))
  }, [subject, grade])

  useEffect(() => {
    if (!profile?.id) { setHomeLoading(false); return }
    Promise.all([fetchQuizResults(profile.id), fetchProgress(profile.id), fetchWatchedIds(profile.id)])
      .then(([q, p, w]) => { setHomeQuizzes(q); setHomeProgress(p); setWatchedIds(w) })
      .finally(() => setHomeLoading(false))
  }, [profile?.id])

  const sideItems = [
    { id: 'home',        icon: '🏠', label: 'Dashboard' },
    { id: 'lessons',     icon: '▶️', label: 'Video Lessons' },
    { id: 'quiz',        icon: '📝', label: 'AI Quiz' },
    { id: 'progress',    icon: '📊', label: 'My Progress' },
    { id: 'leaderboard', icon: '🏆', label: 'Leaderboard' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {ToastEl}
      {openVideo && (
        <VideoModal
          video={openVideo} userId={profile?.id}
          onClose={() => setOpenVideo(null)}
          onWatched={() => setWatchedIds(ids => ids.includes(openVideo.id) ? ids : [...ids, openVideo.id])}
        />
      )}

      <div className="portal-layout">
        <div className="sidebar">
          <div className="sidebar-section">Navigation</div>
          {sideItems.map(s => (
            <button key={s.id} className={`sidebar-btn ${section === s.id ? 'active' : ''}`} onClick={() => setSection(s.id)}>
              {s.icon} {s.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ padding: '12px', background: 'rgba(255,255,255,.04)', borderRadius: 10, margin: '8px 4px 0' }}>
            <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>Profile</div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '.875rem' }}>{profile?.name?.split(' ')[0]}</div>
            <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '.75rem', marginTop: 2 }}>Grade {profile?.grade || '—'}</div>
          </div>
        </div>

        <div className="portal-main">
          {section === 'home' && (
            <DashboardHome
              profile={profile}
              quizzes={homeQuizzes}
              progress={homeProgress}
              watchedIds={watchedIds}
              loading={homeLoading}
              onNavigate={setSection}
            />
          )}

          {section === 'lessons' && (
            <>
              <div className="section-header">
                <h2>▶️ Video Lessons</h2>
                <p>Browse lessons by grade and subject. Click any video to watch it.</p>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa', marginBottom: 10 }}>Grade</div>
                <div className="grade-scroll">
                  {GRADES.map(g => (
                    <button key={g} className={`grade-pill ${grade === g ? 'active' : ''}`} onClick={() => setGrade(g)}>
                      {g === 'R' ? 'Grade R' : `Grade ${g}`}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa', marginBottom: 10 }}>Subject</div>
                <div className="subject-grid">
                  {Object.entries(SUBJECTS).map(([s, { icon }]) => (
                    <div key={s} className={`subject-card ${subject === s ? 'active' : ''}`} onClick={() => setSubject(s)}>
                      <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>{icon}</div>
                      <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{s}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: '1rem' }}>📺 {subject} — Grade {grade}</h3>
                <button className="btn btn-teal btn-sm" onClick={() => setSection('quiz')}>Take Quiz →</button>
              </div>
              {videoLoading ? <Spinner label="Loading lessons…" /> : videos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ccc' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📦</div>
                  <div style={{ fontWeight: 600, color: '#888' }}>No videos yet for Grade {grade} {subject}</div>
                  <div style={{ fontSize: '.85rem', marginTop: 6 }}>Your tutor will upload lessons soon!</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {videos.map(v => (
                    <div key={v.id} className="video-item" onClick={() => setOpenVideo(v)}>
                      <div className="video-thumb">{SUBJECTS[v.subject]?.icon || '▶️'}</div>
                      <div className="video-info">
                        <div className="video-title">{v.title}</div>
                        <div className="video-meta">📁 {v.topic || 'General'} · Grade {v.grade}</div>
                      </div>
                      <span className={`pill ${watchedIds.includes(v.id) ? 'pill-blue' : 'pill-green'}`}>
                        {watchedIds.includes(v.id) ? '✓ Watched' : 'New'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {section === 'quiz'        && <QuizSection profile={profile} />}
          {section === 'progress'    && <ProgressSection profile={profile} />}
          {section === 'leaderboard' && <LeaderboardSection profile={profile} />}
        </div>
      </div>
    </div>
  )
}
