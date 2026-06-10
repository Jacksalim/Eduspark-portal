import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchVideos, fetchWatchedIds, markVideoWatched, saveQuizResult, fetchQuizResults, fetchProgress } from '../lib/supabase'
import { SUBJECTS, GRADES, Spinner, ProgressBar, StatCard, useToast } from '../components/ui'

// ── AI Quiz Generation ────────────────────────────────────────────────────────
// Gemini primary → Anthropic fallback via /api/quiz serverless function
async function generateQuiz(grade, subject) {
  const res = await fetch('/api/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grade, subject })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Server error ' + res.status)
  if (!data.questions || data.questions.length === 0) throw new Error('No questions returned from AI')

  // Normalise new format { question, options, correctAnswer, explanation }
  // into legacy format  { q, options, answer, explanation } used by the quiz UI
  const questions = data.questions.map(function(q) {
    if (q.q !== undefined) return q
    var answerIndex = q.options.indexOf(q.correctAnswer)
    return {
      q: q.question,
      options: q.options,
      answer: answerIndex >= 0 ? answerIndex : 0,
      explanation: q.explanation || ''
    }
  })

  return { questions: questions, provider: data.provider || 'unknown' }
}

// ── Fallback questions ────────────────────────────────────────────────────────
function fallbackQuestions(subject, grade) {
  return [
    { q: 'Which is a key concept in Grade ' + grade + ' ' + subject + '?', options: ['Foundation', 'Application', 'Analysis', 'Evaluation'], answer: 0, explanation: 'Placeholder — check API keys in Vercel environment variables.' },
    { q: 'What is 7 x 8?', options: ['54', '56', '48', '64'], answer: 1, explanation: '7 x 8 = 56' },
    { q: 'What is 15% of 200?', options: ['30', '25', '35', '20'], answer: 0, explanation: '15/100 x 200 = 30' },
    { q: 'Simplify: 4/8', options: ['1/3', '1/2', '2/3', '3/4'], answer: 1, explanation: '4 divided by 4 is 1, 8 divided by 4 is 2, so 1/2' },
    { q: 'Solve: x + 5 = 12', options: ['6', '7', '8', '17'], answer: 1, explanation: 'x = 12 - 5 = 7' },
  ]
}

// ── Video Modal ───────────────────────────────────────────────────────────────
function VideoModal({ video, userId, onClose, onWatched }) {
  const watchedRef = useRef(false)

  function getEmbedUrl(url) {
    if (!url) return ''
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/)
    if (ytMatch) return 'https://www.youtube.com/embed/' + ytMatch[1] + '?autoplay=1'
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) return 'https://player.vimeo.com/video/' + vimeoMatch[1] + '?autoplay=1'
    return url
  }

  useEffect(() => {
    if (video && userId && !watchedRef.current) {
      watchedRef.current = true
      markVideoWatched(video.id, userId).then(() => onWatched()).catch(() => {})
    }
  }, [video, userId, onWatched])

  if (!video) return null
  const embedUrl = getEmbedUrl(video.url)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={{ background: '#000', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 860, boxShadow: 'var(--shadow-lg)' }}
        onClick={function(e) { e.stopPropagation() }}>
        {embedUrl ? (
          <iframe src={embedUrl} width="100%" height="460"
            style={{ display: 'block', border: 'none' }}
            allow="autoplay; fullscreen" allowFullScreen title={video.title} />
        ) : (
          <div style={{ padding: 40, color: '#fff', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎬</div>
            <p>Watch at: <a href={video.url} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>{video.url}</a></p>
          </div>
        )}
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '.95rem' }}>{video.title}</div>
            <div style={{ color: '#888', fontSize: '.8rem', marginTop: 2 }}>{video.subject} · Grade {video.grade}{video.topic ? ' · ' + video.topic : ''}</div>
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
  const [done, setDone] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [history, setHistory] = useState([])
  const { show, ToastEl } = useToast()
  const answersRef = useRef([])

  useEffect(() => {
    if (profile?.id) fetchQuizResults(profile.id).then(setHistory).catch(() => {})
  }, [profile?.id])

  async function start() {
    setLoading(true)
    setQuiz(null)
    setQIdx(0)
    setSelected(null)
    setAnswered(false)
    setDone(false)
    setFinalScore(0)
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

  function answer(i) {
    if (answered) return
    setSelected(i)
    setAnswered(true)
    answersRef.current = [...answersRef.current, { selected: i, correct: quiz[qIdx].answer }]
  }

  async function next() {
    const isLastQuestion = qIdx + 1 >= quiz.length

    if (isLastQuestion) {
      const correctCount = answersRef.current.filter(function(a) { return a.selected === a.correct }).length
      setFinalScore(correctCount)
      setDone(true)

      if (profile?.id) {
        try {
          await saveQuizResult({
            userId: profile.id,
            subject: subject,
            grade: grade,
            score: correctCount,
            total: quiz.length
          })
          const h = await fetchQuizResults(profile.id)
          setHistory(h)
          show('Quiz result saved!')
        } catch (e) {
          console.warn('Could not save quiz result:', e.message)
        }
      }
    } else {
      setQIdx(function(i) { return i + 1 })
      setSelected(null)
      setAnswered(false)
    }
  }

  const currentScore = answersRef.current.filter(function(a) { return a.selected === a.correct }).length

  return (
    <div>
      {ToastEl}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24, alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '.78rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Grade</label>
          <select className="form-control" value={grade} onChange={function(e) { setGrade(e.target.value) }} style={{ width: 130 }}>
            {GRADES.map(function(g) { return <option key={g} value={g}>{g === 'R' ? 'Grade R' : 'Grade ' + g}</option> })}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '.78rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Subject</label>
          <select className="form-control" value={subject} onChange={function(e) { setSubject(e.target.value) }} style={{ width: 200 }}>
            {Object.keys(SUBJECTS).map(function(s) { return <option key={s}>{s}</option> })}
          </select>
        </div>
        <button className="btn btn-teal" onClick={start} disabled={loading}>
          {loading ? '⏳ Generating…' : '🤖 Generate AI Quiz'}
        </button>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontWeight: 600 }}>Generating Grade {grade} {subject} quiz…</div>
          <div style={{ color: '#aaa', fontSize: '.85rem', marginTop: 6 }}>AI is crafting curriculum-aligned questions</div>
        </div>
      )}

      {!loading && quiz && !done && (
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>{subject} · Grade {grade}</h3>
              <div style={{ color: '#888', fontSize: '.8rem', marginTop: 3 }}>Question {qIdx + 1} of {quiz.length}</div>
            </div>
            <span className="pill pill-green">{currentScore} correct</span>
          </div>

          <div style={{ marginBottom: 20 }}>
            <ProgressBar value={(qIdx / quiz.length) * 100} />
          </div>

          <div style={{ fontSize: '1.02rem', fontWeight: 600, lineHeight: 1.6, marginBottom: 20 }}>
            {quiz[qIdx].q}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quiz[qIdx].options.map(function(opt, i) {
              let cls = 'option-btn'
              if (answered) {
                if (i === quiz[qIdx].answer) cls += ' correct'
                else if (i === selected) cls += ' wrong'
              } else if (selected === i) {
                cls