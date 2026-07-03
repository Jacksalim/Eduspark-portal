// src/pages/learner/NotesSection.jsx
// Notes arranged per topic with end-of-topic assessment quiz (70% pass gate).
import { useState, useEffect, useCallback } from 'react'
import { fetchStudyMaterials, recordTopicProgress, fetchTopicProgress } from '../../lib/supabase'
import { SUBJECTS, Spinner } from '../../components/ui'
import { topicsFor } from '../../lib/topics'

// ── Topic Assessment Quiz ─────────────────────────────────────────────────────
function TopicAssessment({ grade, subject, topic, onPass, onClose }) {
  const [quiz,    setQuiz]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [qIdx,    setQIdx]    = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [score,   setScore]   = useState(0)
  const [done,    setDone]    = useState(false)
  const [saving,  setSaving]  = useState(false)

  const loadQuiz = useCallback(() => {
    setLoading(true); setError(null); setQuiz(null)
    setQIdx(0); setSelected(null); setAnswered(false); setScore(0); setDone(false)
    fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grade, subject, topic, count: 5, difficulty: 'mixed' }),
    })
      .then(r => { if (!r.ok) throw new Error('Could not load quiz'); return r.json() })
      .then(data => setQuiz(data.questions || data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [grade, subject, topic])

  useEffect(() => { loadQuiz() }, [loadQuiz])

  const answer = (opt) => {
    if (answered || !quiz) return
    setSelected(opt)
    setAnswered(true)
    if (opt === quiz[qIdx].correctAnswer) setScore(s => s + 1)
  }

  const next = async () => {
    const isLast = qIdx + 1 >= quiz.length
    if (!isLast) { setQIdx(i => i + 1); setSelected(null); setAnswered(false); return }
    const finalScore = score + (selected === quiz[qIdx].correctAnswer ? 0 : 0) + score - score +
      (selected === quiz[qIdx].correctAnswer ? 1 : 0)
    // recalc properly
    const actualFinal = score + (selected === quiz[qIdx].correctAnswer ? 1 : 0)
    const pct = Math.round((actualFinal / quiz.length) * 100)
    setDone(true)
    if (pct >= 70 && onPass) {
      setSaving(true)
      try { await onPass(pct) } catch {}
      setSaving(false)
    }
  }

  const currentScore = score + (answered && selected === quiz?.[qIdx]?.correctAnswer ? 0 : 0)

  if (loading) return <div style={{ padding: '32px 20px', textAlign: 'center' }}><Spinner label="Preparing assessment…" /></div>
  if (error)   return (
    <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
      <p style={{ marginBottom: 12 }}>Could not load assessment — check your internet connection.</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button onClick={loadQuiz} style={primaryBtn}>Try Again</button>
        <button onClick={onClose}  style={ghostBtn}>Close</button>
      </div>
    </div>
  )

  if (done) {
    const finalPct = Math.round((score / quiz.length) * 100)
    const passed = finalPct >= 70
    return (
      <div style={{ padding: '28px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '3.2rem', marginBottom: 12 }}>{passed ? '🎉' : '📖'}</div>
        <div style={{ fontSize: '2.4rem', fontWeight: 800, color: passed ? '#059669' : '#d97706', marginBottom: 6 }}>
          {score}/{quiz.length} &nbsp;·&nbsp; {finalPct}%
        </div>
        <p style={{ color: '#374151', marginBottom: 20, fontSize: '.92rem', lineHeight: 1.6 }}>
          {passed
            ? '✅ Excellent! Topic completed — the next topic is now unlocked.'
            : `You need 70% to proceed. You scored ${finalPct}%. Review the notes above and try again!`}
        </p>
        {saving && <p style={{ color: '#6366f1', fontSize: '.85rem', marginBottom: 12 }}>Saving your progress…</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {!passed && <button onClick={loadQuiz} style={primaryBtn}>Try Again</button>}
          <button onClick={onClose} style={ghostBtn}>{passed ? 'Continue' : 'Back to Notes'}</button>
        </div>
      </div>
    )
  }

  const q = quiz[qIdx]
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: '.78rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Question {qIdx + 1} / {quiz.length}
        </span>
        <span style={{ fontSize: '.78rem', color: '#6366f1', fontWeight: 600 }}>{score} correct so far</span>
      </div>
      <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, marginBottom: 18, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#0d9488', borderRadius: 2, width: `${(qIdx / quiz.length) * 100}%`, transition: 'width .3s' }} />
      </div>
      <div style={{ fontSize: '.97rem', fontWeight: 600, lineHeight: 1.65, marginBottom: 18, color: '#111827' }}>{q.question}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(q.options || []).map((opt, i) => {
          const isCorrect  = opt === q.correctAnswer
          const isSelected = opt === selected
          let bg = 'white', border = '1.5px solid #e5e7eb', color = '#374151'
          if (answered) {
            if (isCorrect)       { bg = '#dcfce7'; border = '1.5px solid #22c55e'; color = '#15803d' }
            else if (isSelected) { bg = '#fee2e2'; border = '1.5px solid #f87171'; color = '#dc2626' }
          } else if (isSelected) { bg = '#eef2ff'; border = '1.5px solid #6366f1'; color = '#4338ca' }
          return (
            <button key={i} disabled={answered} onClick={() => answer(opt)}
              style={{ padding: '11px 14px', borderRadius: 8, border, background: bg, color, fontSize: '.87rem', fontWeight: 500, cursor: answered ? 'default' : 'pointer', textAlign: 'left', transition: 'all .15s' }}>
              <span style={{ fontWeight: 700, marginRight: 8, opacity: .5 }}>{['A','B','C','D'][i]}.</span>{opt}
            </button>
          )
        })}
      </div>
      {answered && (
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, fontSize: '.85rem', lineHeight: 1.6,
          background: selected === q.correctAnswer ? '#dcfce7' : '#fee2e2',
          color:      selected === q.correctAnswer ? '#15803d' : '#dc2626' }}>
          💡 {q.explanation}
        </div>
      )}
      {answered && (
        <button onClick={next} style={{ ...primaryBtn, marginTop: 16, width: '100%' }}>
          {qIdx + 1 < quiz.length ? 'Next Question →' : 'See My Score'}
        </button>
      )}
    </div>
  )
}

// ── Main Notes Section ────────────────────────────────────────────────────────
export default function NotesSection({ profile }) {
  const [subject,    setSubject]    = useState('Mathematics')
  const grade = profile?.grade || '7'
  const [notes,      setNotes]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [openTopic,  setOpenTopic]  = useState(null)
  const [assessing,  setAssessing]  = useState(null)
  const [completed,  setCompleted]  = useState(new Set())

  useEffect(() => {
    setLoading(true); setOpenTopic(null); setAssessing(null)
    fetchStudyMaterials({ type: 'note', subject, grade })
      .then(setNotes).catch(() => setNotes([]))
      .finally(() => setLoading(false))
  }, [subject, grade])

  useEffect(() => {
    if (!profile?.id) return
    fetchTopicProgress(profile.id, grade)
      .then(tp => setCompleted(new Set(tp.filter(t => t.covered && t.subject === subject).map(t => t.topic))))
      .catch(() => {})
  }, [profile?.id, grade, subject])

  const topics = topicsFor(subject)
  const notesByTopic = (t) => notes.filter(n => n.topic === t)

  const handlePass = useCallback(async (topic, pct) => {
    if (!profile?.id) return
    await recordTopicProgress({ userId: profile.id, subject, grade, topic, percent: pct })
    setCompleted(prev => new Set([...prev, topic]))
  }, [profile?.id, subject, grade])

  // Topic N is unlocked when topic N-1 has been passed (or it's the first topic)
  const isUnlocked = (idx) => idx === 0 || completed.has(topics[idx - 1])

  return (
    <div>
      <div className="section-header">
        <h2>📝 Notes</h2>
        <p>Grade {grade === 'R' ? 'R' : grade} notes by topic. Pass each topic assessment (≥70%) to unlock the next topic.</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="form-control" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: 200 }}>
          {Object.keys(SUBJECTS).map(s => <option key={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: '.8rem', color: '#888', background: '#f3f4f6', padding: '4px 10px', borderRadius: 20 }}>
          {completed.size} / {topics.length} topics completed
        </span>
      </div>

      {loading ? <Spinner label="Loading notes…" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {topics.map((topic, idx) => {
            const items    = notesByTopic(topic)
            const isOpen   = openTopic === topic
            const done     = completed.has(topic)
            const unlocked = isUnlocked(idx)

            return (
              <div key={topic} className="card" style={{ overflow: 'hidden', opacity: unlocked ? 1 : .55, transition: 'opacity .2s' }}>
                {/* Topic header row */}
                <button
                  onClick={() => unlocked && setOpenTopic(isOpen ? null : topic)}
                  style={{ width: '100%', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: done ? 'rgba(5,150,105,.04)' : 'none', border: 'none', cursor: unlocked ? 'pointer' : 'not-allowed', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1rem' }}>{done ? '✅' : unlocked ? '📖' : '🔒'}</span>
                    <span style={{ fontWeight: 700, fontSize: '.92rem' }}>{topic}</span>
                    <span className={`pill ${items.length ? 'pill-green' : 'pill-amber'}`}>
                      {items.length ? `${items.length} note${items.length > 1 ? 's' : ''}` : 'No notes yet'}
                    </span>
                    {done && <span style={{ fontSize: '.7rem', padding: '2px 8px', borderRadius: 20, background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>Passed ✓</span>}
                    {!unlocked && <span style={{ fontSize: '.74rem', color: '#9ca3af' }}>Complete "{topics[idx - 1]}" first</span>}
                  </div>
                  <span style={{ color: 'var(--teal)', fontSize: '1.2rem', flexShrink: 0 }}>{isOpen ? '−' : '+'}</span>
                </button>

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--mist)' }}>
                    {/* Notes content */}
                    <div style={{ padding: '18px 20px' }}>
                      {items.length === 0 ? (
                        <p style={{ color: '#aaa', fontSize: '.85rem' }}>No notes uploaded for this topic yet — check back soon.</p>
                      ) : items.map(n => (
                        <div key={n.id} style={{ marginBottom: 22 }}>
                          <h4 style={{ fontSize: '.95rem', marginBottom: 8, color: '#111827' }}>{n.title}</h4>
                          <div style={{ fontSize: '.87rem', color: '#444', lineHeight: 1.85, whiteSpace: 'pre-wrap', background: '#fafafa', padding: '14px 16px', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                            {n.content}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Assessment strip */}
                    <div style={{ borderTop: '1px solid #f3f4f6', background: done ? '#f0fdf4' : '#fafafa' }}>
                      {assessing === topic ? (
                        <TopicAssessment
                          grade={grade} subject={subject} topic={topic}
                          onPass={(pct) => handlePass(topic, pct)}
                          onClose={() => setAssessing(null)}
                        />
                      ) : (
                        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '.87rem', color: '#374151' }}>
                              {done ? '✅ Assessment Passed' : '📝 Topic Assessment'}
                            </div>
                            <div style={{ fontSize: '.78rem', color: '#6b7280', marginTop: 2 }}>
                              {done ? 'Well done — this topic is complete.' : 'Score 70% or higher to unlock the next topic.'}
                            </div>
                          </div>
                          <button
                            onClick={() => setAssessing(topic)}
                            style={done ? ghostBtn : primaryBtn}>
                            {done ? 'Retake Assessment' : 'Start Assessment →'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const primaryBtn = { padding: '8px 18px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, fontSize: '.84rem', fontWeight: 600, cursor: 'pointer' }
const ghostBtn   = { padding: '8px 18px', background: 'white', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '.84rem', fontWeight: 500, cursor: 'pointer' }
