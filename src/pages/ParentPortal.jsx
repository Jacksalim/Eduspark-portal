import { useState, useEffect } from 'react'
import { fetchChildrenForParent, fetchProgress, fetchQuizResults, findLearnerByEmail, linkChildToParent, unlinkChild } from '../lib/supabase'
import { SUBJECTS, Spinner, ProgressBar, StatCard, useToast } from '../components/ui'
import { generateProgressReport } from '../lib/pdfReport'

// ── Link Child Section ────────────────────────────────────────────────────────
function LinkChildSection({ profile, onLinked }) {
  const [email, setEmail] = useState('')
  const [found, setFound] = useState(null)
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState(false)
  const [searchError, setSearchError] = useState('')
  const { show, ToastEl } = useToast()

  async function handleSearch(e) {
    e.preventDefault()
    if (!email.trim()) return
    setSearching(true)
    setFound(null)
    setSearchError('')
    try {
      const learner = await findLearnerByEmail(email)
      setFound(learner)
    } catch {
      setSearchError('No learner account found with that email address.')
    } finally {
      setSearching(false)
    }
  }

  async function handleLink() {
    if (!found || !profile?.id) return
    setLinking(true)
    try {
      await linkChildToParent(found.id, profile.id)
      show(`${found.name} has been linked to your account!`)
      setEmail('')
      setFound(null)
      setTimeout(onLinked, 1200)
    } catch (err) {
      show('Could not link account: ' + err.message, 'error')
    } finally {
      setLinking(false)
    }
  }

  return (
    <div className="card card-pad" style={{ marginBottom: 24 }}>
      {ToastEl}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span style={{ fontSize: '1.4rem' }}>🔗</span>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem' }}>Link a Child's Account</h4>
          <p style={{ margin: 0, fontSize: '.82rem', color: '#888', marginTop: 2 }}>
            Enter your child's registered email address to link their account.
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input
          className="form-control"
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setFound(null); setSearchError('') }}
          placeholder="child@email.com"
          style={{ flex: 1, minWidth: 220 }}
          required
        />
        <button className="btn btn-teal" type="submit" disabled={searching || !email.trim()}>
          {searching ? '⏳ Searching…' : '🔍 Find Account'}
        </button>
      </form>

      {searchError && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--rose-light)', color: 'var(--rose)', borderRadius: 8, fontSize: '.87rem', fontWeight: 500 }}>
          ❌ {searchError}
        </div>
      )}

      {found && (
        <div style={{ marginTop: 14, padding: '14px 18px', background: 'var(--teal-light, #e8f4f4)', border: '1px solid var(--teal)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>
              {found.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{found.name}</div>
              <div style={{ fontSize: '.8rem', color: '#555', marginTop: 2 }}>
                {found.grade ? `Grade ${found.grade}` : 'Grade not set'} · {found.email}
              </div>
            </div>
          </div>
          <button className="btn btn-teal btn-sm" onClick={handleLink} disabled={linking}>
            {linking ? '⏳ Linking…' : '✅ Link This Child'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Parent Portal ────────────────────────────────────────────────────────
export default function ParentPortal({ profile }) {
  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [progress, setProgress] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLink, setShowLink] = useState(false)
  const isDemo = !profile?.id
  const { show, ToastEl } = useToast()

  function loadChildren() {
    if (!profile?.id) { setLoading(false); return }
    fetchChildrenForParent(profile.id)
      .then(data => {
        setChildren(data)
        if (data.length > 0) {
          setSelectedChild(prev => prev ? (data.find(c => c.id === prev.id) || data[0]) : data[0])
        } else {
          setSelectedChild(null)
        }
        setShowLink(data.length === 0)
      })
      .catch(() => {
        const demo = { id: 'demo', name: 'Your Child', grade: '7', email: 'child@email.com', created_at: new Date().toISOString() }
        setChildren([demo])
        setSelectedChild(demo)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadChildren() }, [profile?.id])

  useEffect(() => {
    if (!selectedChild?.id || selectedChild.id === 'demo') {
      setProgress([
        { subject: 'Mathematics', percent: 72 },
        { subject: 'English', percent: 88 },
        { subject: 'Business Studies', percent: 55 },
        { subject: 'Natural Sciences', percent: 40 },
      ])
      setQuizzes([
        { id: 1, subject: 'Mathematics', grade: '7', score: 4, total: 5, percent: 80, created_at: new Date().toISOString() },
        { id: 2, subject: 'English', grade: '7', score: 5, total: 5, percent: 100, created_at: new Date(Date.now() - 86400000).toISOString() },
        { id: 3, subject: 'Business Studies', grade: '10', score: 3, total: 5, percent: 60, created_at: new Date(Date.now() - 172800000).toISOString() },
      ])
      return
    }
    Promise.all([fetchProgress(selectedChild.id), fetchQuizResults(selectedChild.id)])
      .then(([p, q]) => { setProgress(p); setQuizzes(q) })
      .catch(() => {})
  }, [selectedChild?.id])

  async function handleUnlink(child) {
    if (!confirm(`Remove ${child.name} from your account?`)) return
    try {
      await unlinkChild(child.id)
      show(`${child.name} unlinked`)
      loadChildren()
    } catch (err) {
      show('Could not unlink: ' + err.message, 'error')
    }
  }

  async function handleExport() {
    if (!selectedChild) return
    await generateProgressReport({ child: selectedChild, progress, quizzes })
    show('PDF report downloaded!')
  }

  if (loading) return <Spinner />

  const avgScore = quizzes.length ? Math.round(quizzes.reduce((a, q) => a + q.percent, 0) / quizzes.length) : 0
  const overallProgress = progress.length ? Math.round(progress.reduce((a, p) => a + p.percent, 0) / progress.length) : 0

  const subjectColors = {
    'Mathematics': 'var(--teal)', 'English': '#2d7a2d',
    'Business Studies': 'var(--purple)', 'Natural Sciences': '#b87a00'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {ToastEl}
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, var(--rose) 0%, #8b2d2d 100%)', color: '#fff', padding: '24px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem' }}>Parent Dashboard 👨‍👩‍👧</h2>
          <p style={{ opacity: .72, fontSize: '.88rem', marginTop: 3 }}>
            {selectedChild ? `Tracking: ${selectedChild.name} · Grade ${selectedChild.grade}` : 'No children linked yet'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {selectedChild && (
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(201,168,76,.25)', color: '#f0d9a0', border: '1px solid rgba(201,168,76,.4)' }}
              onClick={handleExport}>
              ⬇ Export PDF
            </button>
          )}
          {!isDemo && (
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,.18)', color: '#fff', border: '1px solid rgba(255,255,255,.3)' }}
              onClick={() => setShowLink(v => !v)}>
              {showLink ? '✕ Cancel' : '＋ Link Child'}
            </button>
          )}
          <span className="nav-badge" style={{ background: 'rgba(255,255,255,.2)' }}>Parent</span>
        </div>
      </div>

      <div style={{ padding: '32px 36px', maxWidth: 900 }}>
        {/* Link child panel */}
        {showLink && !isDemo && (
          <LinkChildSection profile={profile} onLinked={() => { loadChildren(); setShowLink(false) }} />
        )}

        {/* Child tabs */}
        {children.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            {children.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => setSelectedChild(c)}
                  className={`grade-pill ${selectedChild?.id === c.id ? 'active' : ''}`}
                  style={{ borderColor: selectedChild?.id === c.id ? 'var(--rose)' : undefined }}>
                  {c.name}
                </button>
                {!isDemo && c.id !== 'demo' && (
                  <button
                    title={`Unlink ${c.name}`}
                    onClick={() => handleUnlink(c)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '.85rem', padding: '2px 4px', lineHeight: 1 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--rose)'}
                    onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No children, not showing link form */}
        {children.length === 0 && !showLink && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👨‍👩‍👧</div>
            <div style={{ fontWeight: 600, color: '#555', marginBottom: 8 }}>No children linked to your account</div>
            {isDemo ? (
              <div style={{ fontSize: '.88rem' }}>Sign in to link your child's account and track their progress.</div>
            ) : (
              <button className="btn btn-teal" onClick={() => setShowLink(true)} style={{ marginTop: 8 }}>
                🔗 Link a Child Now
              </button>
            )}
          </div>
        )}

        {selectedChild && (
          <>
            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              <StatCard num={`${overallProgress}%`} label="Overall Progress" sub="Across all subjects" color="var(--rose)" />
              <StatCard num={quizzes.length} label="Quizzes Taken" sub="All subjects" color="var(--teal)" />
              <StatCard num={`${avgScore}%`} label="Average Score" sub="Quiz average" color="var(--gold)" />
              <StatCard num={progress.length} label="Subjects Active" sub="Being tracked" color="var(--purple)" />
            </div>

            {/* Progress by subject */}
            {progress.length > 0 && (
              <div className="card card-pad" style={{ marginBottom: 20 }}>
                <h4 style={{ marginBottom: 18 }}>📚 Progress by Subject</h4>
                {progress.map(p => (
                  <div key={p.subject} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                      <span style={{ fontWeight: 600, fontSize: '.9rem' }}>{SUBJECTS[p.subject]?.icon} {p.subject}</span>
                      <span style={{ fontWeight: 700, fontSize: '.87rem', color: subjectColors[p.subject] || 'var(--teal)' }}>{p.percent}%</span>
                    </div>
                    <ProgressBar value={p.percent} color={subjectColors[p.subject] || 'var(--teal)'} />
                  </div>
                ))}
              </div>
            )}

            {/* Quiz results */}
            {quizzes.length > 0 && (
              <div className="card card-pad">
                <h4 style={{ marginBottom: 16 }}>📝 Recent Quiz Results</h4>
                <div className="data-table-wrap" style={{ boxShadow: 'none', border: '1px solid var(--mist)' }}>
                  <table className="data-table">
                    <thead><tr><th>Subject</th><th>Grade</th><th>Score</th><th>Result</th><th>Date</th></tr></thead>
                    <tbody>
                      {quizzes.slice(0, 10).map(q => (
                        <tr key={q.id}>
                          <td><b>{q.subject}</b></td>
                          <td>Grade {q.grade}</td>
                          <td>{q.score}/{q.total}</td>
                          <td><span className={`pill ${q.percent >= 70 ? 'pill-green' : q.percent >= 50 ? 'pill-amber' : 'pill-red'}`}>{q.percent}%</span></td>
                          <td style={{ color: '#aaa', fontSize: '.8rem' }}>{new Date(q.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tip */}
            <div style={{ marginTop: 20, padding: '16px 20px', background: '#fff8e8', border: '1px solid var(--gold-light, #f0d9a0)', borderRadius: 12, fontSize: '.87rem', color: '#996600' }}>
              💡 <b>Tip:</b> Progress scores update automatically after each quiz. Encourage {selectedChild.name.split(' ')[0]} to take quizzes regularly to keep the progress tracker up to date!
            </div>
          </>
        )}
      </div>
    </div>
  )
}
