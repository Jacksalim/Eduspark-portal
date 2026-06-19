// src/pages/admin/AdminPromotions.jsx
import { useState, useEffect } from 'react'
import {
  fetchAllLearners, computePromotionEligibility, recordPromotionDecision, fetchPromotionHistory,
} from '../../lib/supabase'
import { Spinner, useToast } from '../../components/ui'

function currentAcademicYearLabel() {
  const now = new Date()
  const y = now.getFullYear()
  // CBC academic year roughly Jan–Dec in Kenya; admin can override the label if needed.
  return `${y}`
}

export default function AdminPromotions({ profile }) {
  const [learners, setLearners] = useState([])
  const [loading, setLoading] = useState(true)
  const [evaluations, setEvaluations] = useState({}) // userId -> eligibility data
  const [evaluating, setEvaluating] = useState(false)
  const [academicYear, setAcademicYear] = useState(currentAcademicYearLabel())
  const [processing, setProcessing] = useState({}) // userId -> bool
  const [historyFor, setHistoryFor] = useState(null)
  const [history, setHistory] = useState([])
  const { show, ToastEl } = useToast()

  useEffect(() => {
    fetchAllLearners().then(setLearners).catch(() => setLearners([])).finally(() => setLoading(false))
  }, [])

  async function runEvaluation() {
    setEvaluating(true)
    const results = {}
    for (const learner of learners) {
      try {
        results[learner.id] = await computePromotionEligibility(learner.id, learner.grade)
      } catch {
        results[learner.id] = { quizAverage: 0, topicsCoveredPercent: 0, eligible: false, quizCount: 0, topicCount: 0 }
      }
    }
    setEvaluations(results)
    setEvaluating(false)
    show(`Evaluated ${learners.length} learner${learners.length !== 1 ? 's' : ''} for ${academicYear}`)
  }

  async function decide(learner, decision) {
    const evalData = evaluations[learner.id]
    if (!evalData) { show('Run the evaluation first', 'error'); return }
    setProcessing(p => ({ ...p, [learner.id]: true }))
    try {
      await recordPromotionDecision({
        userId: learner.id,
        fromGrade: learner.grade,
        academicYear,
        quizAverage: evalData.quizAverage,
        topicsCoveredPercent: evalData.topicsCoveredPercent,
        decision,
        decidedBy: profile?.id,
      })
      show(`${learner.name} ${decision === 'promoted' ? 'promoted to next grade' : 'set to repeat current grade'} ✅`)
      setLearners(await fetchAllLearners())
      setEvaluations(e => { const n = { ...e }; delete n[learner.id]; return n })
    } catch (err) {
      show('Failed: ' + err.message, 'error')
    } finally {
      setProcessing(p => ({ ...p, [learner.id]: false }))
    }
  }

  async function viewHistory(learner) {
    setHistoryFor(learner)
    try { setHistory(await fetchPromotionHistory(learner.id)) } catch { setHistory([]) }
  }

  if (loading) return <Spinner />

  return (
    <div>
      {ToastEl}
      <div className="section-header">
        <h2>🎓 Grade Promotions</h2>
        <p>Manually run end-of-year promotion checks. Threshold: quiz average ≥ 65% AND topics covered ≥ 65%.</p>
      </div>

      <div className="card card-pad" style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Academic Year Label</label>
          <input className="form-control" value={academicYear} onChange={e => setAcademicYear(e.target.value)} style={{ width: 160 }} />
        </div>
        <button className="btn btn-teal" onClick={runEvaluation} disabled={evaluating}>
          {evaluating ? '⏳ Evaluating…' : `▶ Run Evaluation (${learners.length} learners)`}
        </button>
        <span style={{ fontSize: '.8rem', color: '#999' }}>
          Promoting moves a learner to the next grade. Repeating keeps them in their current grade for another year.
        </span>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Learner</th><th>Grade</th><th>Quiz Avg</th><th>Topics Covered</th><th>Recommendation</th><th>Action</th></tr>
          </thead>
          <tbody>
            {learners.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>No learners found.</td></tr>
            )}
            {learners.map(l => {
              const ev = evaluations[l.id]
              return (
                <tr key={l.id}>
                  <td><b>{l.name}</b><div style={{ fontSize: '.76rem', color: '#999' }}>{l.email}</div></td>
                  <td>Grade {l.grade}</td>
                  <td>{ev ? `${ev.quizAverage}% (${ev.quizCount} quizzes)` : '—'}</td>
                  <td>{ev ? `${ev.topicsCoveredPercent}% (${ev.topicCount} topics)` : '—'}</td>
                  <td>
                    {ev ? (
                      <span className={`pill ${ev.eligible ? 'pill-green' : 'pill-amber'}`}>
                        {ev.eligible ? '✓ Promote' : '↻ Repeat'}
                      </span>
                    ) : <span style={{ color: '#ccc', fontSize: '.8rem' }}>Run evaluation</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-teal btn-sm" disabled={!ev || processing[l.id]} onClick={() => decide(l, 'promoted')}>Promote</button>
                      <button className="btn btn-ghost btn-sm" disabled={!ev || processing[l.id]} onClick={() => decide(l, 'repeated')}>Repeat</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => viewHistory(l)}>History</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {historyFor && (
        <div className="modal-overlay" onClick={() => setHistoryFor(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Promotion History — {historyFor.name}</h3>
            {history.length === 0 ? (
              <p style={{ color: '#999', fontSize: '.88rem' }}>No promotion decisions recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map(h => (
                  <div key={h.id} style={{ padding: '10px 14px', background: 'var(--cream)', borderRadius: 8, fontSize: '.85rem' }}>
                    <b>Grade {h.from_grade} → Grade {h.to_grade}</b> ({h.academic_year})<br />
                    <span style={{ color: '#888' }}>
                      {h.decision === 'promoted' ? '✅ Promoted' : '↻ Repeated grade'} · Quiz avg {h.quiz_average}% · Topics {h.topics_covered_percent}%
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-ghost btn-full" style={{ marginTop: 18 }} onClick={() => setHistoryFor(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
