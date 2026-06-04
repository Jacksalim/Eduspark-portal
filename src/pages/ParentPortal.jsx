import { useState, useEffect } from 'react'
import { fetchChildrenForParent, fetchProgress, fetchQuizResults } from '../lib/supabase'
import { SUBJECTS, Spinner, ProgressBar, StatCard } from '../components/ui'

export default function ParentPortal({ profile }) {
  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [progress, setProgress] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) { setLoading(false); return }
    fetchChildrenForParent(profile.id)
      .then(data => {
        setChildren(data)
        if (data.length > 0) setSelectedChild(data[0])
      })
      .catch(() => {
        // Demo: show placeholder child
        const demo = { id: 'demo', name: 'Your Child', grade: '7', email: 'child@email.com', created_at: new Date().toISOString() }
        setChildren([demo])
        setSelectedChild(demo)
      })
      .finally(() => setLoading(false))
  }, [profile?.id])

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

  if (loading) return <Spinner />

  const avgScore = quizzes.length ? Math.round(quizzes.reduce((a, q) => a + q.percent, 0) / quizzes.length) : 0
  const overallProgress = progress.length ? Math.round(progress.reduce((a, p) => a + p.percent, 0) / progress.length) : 0

  const subjectColors = {
    'Mathematics': 'var(--teal)', 'English': '#2d7a2d',
    'Business Studies': 'var(--purple)', 'Natural Sciences': '#b87a00'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, var(--rose) 0%, #8b2d2d 100%)', color: '#fff', padding: '24px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem' }}>Parent Dashboard 👨‍👩‍👧</h2>
          <p style={{ opacity: .72, fontSize: '.88rem', marginTop: 3 }}>
            {selectedChild ? `Tracking: ${selectedChild.name} · Grade ${selectedChild.grade}` : 'No children linked yet'}
          </p>
        </div>
        <span className="nav-badge" style={{ background: 'rgba(255,255,255,.2)' }}>Parent</span>
      </div>

      <div style={{ padding: '32px 36px', maxWidth: 900 }}>
        {/* Child selector if multiple */}
        {children.length > 1 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            {children.map(c => (
              <button key={c.id} onClick={() => setSelectedChild(c)}
                className={`grade-pill ${selectedChild?.id === c.id ? 'active' : ''}`}
                style={{ borderColor: selectedChild?.id === c.id ? 'var(--rose)' : undefined }}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* No children linked */}
        {children.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👨‍👩‍👧</div>
            <div style={{ fontWeight: 600 }}>No children linked to your account</div>
            <div style={{ fontSize: '.88rem', marginTop: 6 }}>Ask your tutor to link your child's account to yours.</div>
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

            {/* Tip for parent */}
            <div style={{ marginTop: 20, padding: '16px 20px', background: '#fff8e8', border: '1px solid var(--gold-light, #f0d9a0)', borderRadius: 12, fontSize: '.87rem', color: '#996600' }}>
              💡 <b>Tip:</b> Progress scores update automatically after each quiz. Encourage {selectedChild.name.split(' ')[0]} to take quizzes regularly to keep the progress tracker up to date!
            </div>
          </>
        )}
      </div>
    </div>
  )
}
