// src/pages/learner/RevisionSection.jsx
import { useState, useEffect } from 'react'
import { fetchStudyMaterials } from '../../lib/supabase'
import { SUBJECTS, GRADES, Spinner } from '../../components/ui'

export default function RevisionSection({ profile }) {
  const [subject, setSubject] = useState('Mathematics')
  const [grade, setGrade]     = useState(profile?.grade || '7')
  const [type, setType]       = useState('past_paper')
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId]   = useState(null)

  useEffect(() => {
    setLoading(true)
    fetchStudyMaterials({ type, subject, grade })
      .then(setMaterials)
      .catch(() => setMaterials([]))
      .finally(() => setLoading(false))
  }, [subject, grade, type])

  return (
    <div>
      <div className="section-header">
        <h2>📄 Revision Materials</h2>
        <p>Past papers and revision guides to help you prepare for exams.</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[['past_paper', '📋 Past Papers'], ['revision_guide', '📖 Revision Guides']].map(([k, l]) => (
          <button key={k} className={`btn btn-sm ${type === k ? 'btn-teal' : 'btn-ghost'}`} onClick={() => setType(k)}>{l}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select className="form-control" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: 200 }}>
          {Object.keys(SUBJECTS).map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-control" value={grade} onChange={e => setGrade(e.target.value)} style={{ width: 130 }}>
          {GRADES.map(g => <option key={g} value={g}>{g === 'R' ? 'Grade R' : `Grade ${g}`}</option>)}
        </select>
      </div>

      {loading ? <Spinner label="Loading materials…" /> : materials.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ccc' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📦</div>
          <div style={{ fontWeight: 600, color: '#888' }}>No {type === 'past_paper' ? 'past papers' : 'revision guides'} yet for Grade {grade} {subject}</div>
          <div style={{ fontSize: '.85rem', marginTop: 6 }}>Your tutor will upload materials soon!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {materials.map(m => {
            const isOpen = openId === m.id
            return (
              <div key={m.id} className="card" style={{ overflow: 'hidden' }}>
                <button
                  onClick={() => setOpenId(isOpen ? null : m.id)}
                  style={{ width: '100%', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.92rem' }}>{m.title}</div>
                    {m.year && <div style={{ fontSize: '.78rem', color: '#999', marginTop: 2 }}>Exam Year: {m.year}</div>}
                  </div>
                  <span style={{ color: 'var(--teal)', fontSize: '1.2rem' }}>{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 20px 18px', borderTop: '1px solid var(--mist)' }}>
                    <div style={{ fontSize: '.87rem', color: '#444', lineHeight: 1.8, whiteSpace: 'pre-wrap', paddingTop: 14 }}>{m.content}</div>
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
