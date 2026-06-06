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
        <div className="form-group" style={{ margin: