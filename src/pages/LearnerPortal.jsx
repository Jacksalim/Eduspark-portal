import { useState, useEffect } from 'react'
import { fetchVideos, fetchWatchedIds, markVideoWatched, saveQuizResult, fetchQuizResults, fetchProgress } from '../lib/supabase'
import { SUBJECTS, GRADES, Spinner, ProgressBar, StatCard, useToast } from '../components/ui'

// ── AI Quiz Generation — proxied through /api/quiz serverless function ────────
async function generateQuiz(grade, subject) {
  const res = await fetch('/api/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grade, subject })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Server error ${res.status}`)
  }
  const data = await res.json()
  if (!data.questions || data.questions.length === 0) throw new Error('No questions returned')
  return data.questions
}

// ── Fallback questions (used if API call fails) ───────────────────────────────
function fallbackQuestions(subject, grade) {
  return [
    { q: `Which of the following is a core concept in Grade ${grade} ${subject}?`, options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 0, explanation: 'Placeholder quiz — check your ANTHROPIC_KEY environment variable in Vercel.' },
    { q: 'What is 7 × 8?', options: ['54', '56', '48', '64'], answer: 1, explanation: '7 × 8 = 56' },
    { q: 'What is 15% of 200?', options: ['30', '25', '35', '20'], answer: 0, explanation: '15/100 × 200 = 30' },
    { q: 'Simplify: 4/8', options: ['1/3', '1/2', '2/3', '3/4'], answer: 1, explanation: '4÷4=1 and 8÷4=2 → 1/2' },
    { q: 'Solve: x + 5 = 12', options: ['6', '7', '8', '17'], answer: 1, explanation: 'x = 12 - 5 = 7' },
  ]
}

// ── Video Modal ───────────────────────────────────────────────────────────────
function VideoModal({ video, userId, onClose, onWatched }) {
  function getEmbedUrl(url) {
    if (!url) return ''
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/)
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`
    return url
  }

  useEffect(() => {
    if (video && userId) markVideoWatched(video.id, userId).then(onWatched)
  }, [video?.id])

  if (!video) return null
  const embedUrl = getEmbedUrl(video.url)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={{ background: '#000', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 860, boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        {embedUrl ? (
          <iframe src={embedUrl} width="100%" height="460" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen title={video.title} style={{ display: 'block' }} />
        ) : (
          <div style={{ padding: 40, color: '#fff', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎬</div>
            <p>Video URL: <a href={video.url} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>{video.url}</a></p>
          </div>
        )}
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

  useEffect(() => {
    if (profile?.id) fetchQuizResults(profile.id).then(setHistory).catch(() => {})
  }, [profile?.id])

  async function start() {
    setLoading(true)
    setQuiz(null); setQIdx(0); setSelected(null)
    setAnswered(false); setScore(0); setDone(false); setFinalScore(0)
    try {
      const qs = await generateQuiz(grade, subject)
      setQuiz(qs)
    } catch (err) {
      console.error('Quiz generation failed:', err.message)
      setQuiz(fallbackQuestions(subject, grade))
      show('Using offline questions — check ANTHROPIC_KEY in Vercel settings', 'error')
    }
    setLoading(false)
  }

  function answer(i) {
    if (answered) return
    setSelected(i)
    setAnswered(true)
    if (i === quiz[qIdx].answer) setScore(s => s + 1)
  }

  async function next() {
    const isLastQuestion = qIdx + 1 >= quiz.length
    const lastAnswerCorrect = selected === quiz[qIdx].answer ? 1 : 0
    const computedFinal = score + lastAnswerCorrect

    if (isLastQuestion) {
      setFinalScore(computedFinal)
      setDone(true)
      if (profile?.id) {
        try {
          await saveQuizResult({
            userId: profile.id,
            subject,
            grade,
            score: computedFinal,
            total: quiz.length
          })
          const h = await fetchQuizResults(profile.id)
          setHistory(h)
          show('Quiz result saved! ✅')
        } catch (e) {
          console.warn('Could not save quiz result:', e.message)
        }
      }
    } else {
      setQIdx(i => i + 1)
      setSelected(null)
      setAnswered(false)
    }
  }

  return (
    <div>
      {ToastEl}

      {/* Grade + Subject controls */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24, alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '.78rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Grade</label>
          <select className="form-control" value={grade} onChange={e => setGrade(e.target.value)} style={{ width: 130 }}>
            {GRADES.map(g => <option key={g} value={g}>{g === 'R' ? 'Grade R' : `Grade ${g}`}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '.78rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Subject</label>
          <select className="form-control" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: 200 }}>
            {Object.keys(SUBJECTS).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <button className="btn btn-teal" onClick={start} disabled={loading}>
          {loading ? '⏳ Generating…' : '🤖 Generate AI Quiz'}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="card card-pad" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontWeight: 600 }}>Generating Grade {grade} {subject} quiz…</div>
          <div style={{ color: '#aaa', fontSize: '.85rem', marginTop: 6 }}>Claude is crafting curriculum-aligned questions</div>
        </div>
      )}

      {/* Active quiz */}
      {!loading && quiz && !done && (
        <div className="card card-pad quiz-wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>{subject} · Grade {grade}</h3>
              <div style={{ color: '#888', fontSize: '.8rem', marginTop: 3 }}>Question {qIdx + 1} of {quiz.length}</div>
            </div>
            <span className="pill pill-green">{score} correct</span>
          </div>

          <div style={{ marginBottom: 20 }}>
            <ProgressBar value={(qIdx / quiz.length) * 100} />
          </div>

          <div style={{ fontSize: '1.02rem', fontWeight: 600, lineHeight: 1.6, marginBottom: 20 }}>
            {quiz[qIdx].q}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quiz[qIdx].options.map((opt, i) => {
              let cls = 'option-btn'
              if (answered) {
                if (i === quiz[qIdx].answer) cls += ' correct'
                else if (i === selected) cls += ' wrong'
              } else if (selected === i) {
                cls += ' selected'
              }
              return (
                <button key={i} className={cls} disabled={answered} onClick={() => answer(i)}>
                  <span className="option-label">{['A','B','C','D'][i]}</span>
                  {opt}
                </button>
              )
            })}
          </div>

          {answered && (
            <div style={{
              marginTop: 16, padding: '11px 16px', borderRadius: 8, fontSize: '.87rem',
              background: selected === quiz[qIdx].answer ? '#e6f5e6' : 'var(--rose-light)',
              color: selected === quiz[qIdx].answer ? '#256625' : 'var(--rose)'
            }}>
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

      {/* Results screen */}
      {done && (
        <div className="card card-pad" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 10 }}>
            {finalScore === quiz.length ? '🌟' : finalScore >= quiz.length * 0.7 ? '🎉' : '📚'}
          </div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '3.5rem', fontWeight: 700, color: 'var(--teal)' }}>
            {finalScore}/{quiz.length}
          </div>
          <div style={{ color: '#888', marginTop: 4, marginBottom: 16 }}>
            {Math.round((finalScore / quiz.length) * 100)}% — {subject} · Grade {grade}
          </div>
          <div style={{ fontSize: '1rem', marginBottom: 24, color: 'var(--ink)' }}>
            {finalScore === quiz.length ? '🌟 Perfect score! Outstanding work!'
              : finalScore >= quiz.length * 0.7 ? '💪 Great job! Keep practising!'
              : '📖 Keep going — every attempt makes you stronger!'}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-teal" onClick={start}>Try Again →</button>
            <button className="btn btn-ghost" onClick={() => { setQuiz(null); setDone(false) }}>Change Subject</button>
          </div>
        </div>
      )}

      {/* Quiz history */}
      {history.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h4 style={{ marginBottom: 14, fontSize: '1rem' }}>📋 Recent Quiz History</h4>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Subject</th><th>Grade</th><th>Score</th><th>Result</th><th>Date</th></tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map(r => (
                  <tr key={r.id}>
                    <td><b>{r.subject}</b></td>
                    <td>Grade {r.grade}</td>
                    <td>{r.score}/{r.total}</td>
                    <td>
                      <span className={`pill ${r.percent >= 70 ? 'pill-green' : r.percent >= 50 ? 'pill-amber' : 'pill-red'}`}>
                        {r.percent}%
                      </span>
                    </td>
                    <td style={{ color: '#999', fontSize: '.8rem' }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
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

// ── Progress Section ──────────────────────────────────────────────────────────
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

  const subjectColors = {
    'Mathematics': 'var(--teal)',
    'Business Studies': 'var(--purple)',
    'English': 'var(--rose)',
    'Natural Sciences': '#2d7a2d'
  }

  return (
    <div>
      <div className="stats-grid">
        <StatCard num={quizzes.length} label="Quizzes Taken" sub="Total" color="var(--teal)" />
        <StatCard
          num={quizzes.length ? Math.round(quizzes.reduce((a, q) => a + q.percent, 0) / quizzes.length) + '%' : '—'}
          label="Avg Quiz Score" sub="All subjects" color="var(--gold)"
        />
        <StatCard num={progress.length} label="Subjects Active" sub="Tracked" color="var(--purple)" />
      </div>

      {progress.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: 24 }}>
          <h4 style={{ marginBottom: 18 }}>📚 Subject Progress</h4>
          {progress.map(p => (
            <div key={p.subject} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '.87rem', fontWeight: 600 }}>{SUBJECTS[p.subject]?.icon} {p.subject}</span>
                <span style={{ fontSize: '.82rem', fontWeight: 700, color: subjectColors[p.subject] || 'var(--teal)' }}>{p.percent}%</span>
              </div>
              <ProgressBar value={p.percent} color={subjectColors[p.subject] || 'var(--teal)'} />
            </div>
          ))}
        </div>
      )}

      {quizzes.length === 0 && progress.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📊</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No data yet</div>
          <div style={{ fontSize: '.88rem' }}>Take a quiz to see your progress tracked here!</div>
        </div>
      )}
    </div>
  )
}

// ── Main Learner Portal ───────────────────────────────────────────────────────
export default function LearnerPortal({ profile }) {
  const [section, setSection] = useState('lessons')
  const [grade, setGrade] = useState(profile?.grade || '7')
  const [subject, setSubject] = useState('Mathematics')
  const [videos, setVideos] = useState([])
  const [watchedIds, setWatchedIds] = useState([])
  const [videoLoading, setVideoLoading] = useState(false)
  const [openVideo, setOpenVideo] = useState(null)
  const { show, ToastEl } = useToast()

  useEffect(() => {
    setVideoLoading(true)
    fetchVideos({ subject, grade })
      .then(setVideos)
      .catch(() => setVideos([]))
      .finally(() => setVideoLoading(false))
  }, [subject, grade])

  useEffect(() => {
    if (profile?.id) fetchWatchedIds(profile.id).then(setWatchedIds).catch(() => {})
  }, [profile?.id])

  const sideItems = [
    { id: 'lessons',  icon: '▶️',  label: 'Video Lessons' },
    { id: 'quiz',     icon: '📝',  label: 'Quizzes' },
    { id: 'progress', icon: '📊',  label: 'My Progress' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {ToastEl}
      {openVideo && (
        <VideoModal
          video={openVideo}
          userId={profile?.id}
          onClose={() => setOpenVideo(null)}
          onWatched={() => setWatchedIds(ids => [...ids, openVideo.id])}
        />
      )}

      <div style={{ background: 'var(--teal)', color: '#fff', padding: '24px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem' }}>Welcome back, {profile?.name?.split(' ')[0] || 'Learner'} 👋</h2>
          <p style={{ opacity: .75, fontSize: '.88rem', marginTop: 3 }}>Grade {grade} · {subject}</p>
        </div>
        <span className="nav-badge" style={{ background: 'rgba(255,255,255,.2)', fontSize: '.8rem' }}>Grade {grade}</span>
      </div>

      <div className="portal-layout">
        <div className="sidebar">
          <div className="sidebar-section">Portal</div>
          {sideItems.map(s => (
            <button key={s.id} className={`sidebar-btn ${section === s.id ? 'active' : ''}`} onClick={() => setSection(s.id)}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        <div className="portal-main">
          {section === 'lessons' && (
            <>
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#aaa', marginBottom: 10 }}>Your Grade</div>
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
                      <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{s}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: '1.05rem' }}>📺 {subject} — Grade {grade}</h3>
                <button className="btn btn-teal btn-sm" onClick={() => setSection('quiz')}>Take Quiz →</button>
              </div>

              {videoLoading && <Spinner label="Loading lessons…" />}
              {!videoLoading && videos.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📦</div>
                  <div style={{ fontWeight: 600 }}>No videos yet for Grade {grade} {subject}</div>
                  <div style={{ fontSize: '.85rem', marginTop: 6 }}>Your tutor will upload lessons soon!</div>
                </div>
              )}
              {!videoLoading && (
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

          {section === 'quiz' && <QuizSection profile={profile} />}
          {section === 'progress' && <ProgressSection profile={profile} />}
        </div>
      </div>
    </div>
  )
}