// src/pages/learner/NotesSection.jsx
import { useState, useEffect } from 'react'
import { fetchStudyMaterials } from '../../lib/supabase'
import { SUBJECTS, GRADES, Spinner } from '../../components/ui'
import { topicsFor } from '../../lib/topics'

export default function NotesSection({ profile }) {
  const [subject, setSubject] = useState('Mathematics')
  const [grade, setGrade]     = useState(profile?.grade || '7')
  const [notes, setNotes]     = useState([])
  const [loading, setLoading] = useState(true)
  const [openTopic, setOpenTopic] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetchStudyMaterials({ type: 'note', subject, grade })
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false))
  }, [subject, grade])

  const topics = topicsFor(subject)
  const notesByTopic = topic => notes.filter(n => n.topic === topic)

  return (
    <div>
      <div className="section-header">
        <h2>📝 Notes</h2>
        <p>Study notes arranged topic by topic, aligned with the CBC curriculum.</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select className="form-control" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: 200 }}>
          {Object.keys(SUBJECTS).map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-control" value={grade} onChange={e => setGrade(e.target.value)} style={{ width: 130 }}>
          {GRADES.map(g => <option key={g} value={g}>{g === 'R' ? 'Grade R' : `Grade ${g}`}</option>)}
        </select>
      </div>

      {loading ? <Spinner label="Loading notes…" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {topics.map(topic => {
            const items = notesByTopic(topic)
            const isOpen = openTopic === topic
            return (
              <div key={topic} className="card" style={{ overflow: 'hidden' }}>
                <button
                  onClick={() => setOpenTopic(isOpen ? null : topic)}
                  style={{ width: '100%', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: '.92rem' }}>{topic}</span>
                    <span className={`pill ${items.length ? 'pill-green' : 'pill-amber'}`}>
                      {items.length ? `${items.length} note${items.length > 1 ? 's' : ''}` : 'No notes yet'}
                    </span>
                  </div>
                  <span style={{ color: 'var(--teal)', fontSize: '1.2rem' }}>{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 20px 18px', borderTop: '1px solid var(--mist)' }}>
                    {items.length === 0 ? (
                      <p style={{ color: '#aaa', fontSize: '.85rem', paddingTop: 14 }}>No notes uploaded for this topic yet — check back soon.</p>
                    ) : items.map(n => (
                      <div key={n.id} style={{ paddingTop: 14 }}>
                        <h4 style={{ fontSize: '.95rem', marginBottom: 8 }}>{n.title}</h4>
                        <div style={{ fontSize: '.87rem', color: '#444', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{n.content}</div>
                      </div>
                    ))}
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
