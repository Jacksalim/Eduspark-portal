// src/pages/dashboards/TutorDashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import DashboardHeader from '../../components/DashboardHeader'
import { SUBJECTS } from '../../components/ui'
import { topicsFor } from '../../lib/topics'

const GRADES_LIST = ['R','1','2','3','4','5','6','7','8','9','10','11','12']

export default function TutorDashboard() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('overview')

  const tabs = [
    { id: 'overview', label: '🏠 Overview' },
    { id: 'notes',    label: '📝 Manage Notes' },
    { id: 'videos',   label: '▶️ Manage Videos' },
    { id: 'progress', label: '📊 Learner Progress' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <DashboardHeader role="tutor" profile={profile} />
      <main style={{ padding: '28px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Tutor Dashboard</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: 14 }}>Welcome back, {profile?.full_name?.split(' ')[0] || 'Tutor'}</p>
        </div>
        <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid #f3f4f6', marginBottom: 28, overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 16px', fontSize: 14, fontWeight: 500, border: 'none', background: 'none',
              cursor: 'pointer', whiteSpace: 'nowrap',
              borderBottom: tab === t.id ? '2px solid #0891b2' : '2px solid transparent',
              color: tab === t.id ? '#0891b2' : '#6b7280',
            }}>{t.label}</button>
          ))}
        </nav>
        {tab === 'overview' && <TutorOverview profile={profile} />}
        {tab === 'notes'    && <ManageNotes   profile={profile} />}
        {tab === 'videos'   && <ManageVideos  profile={profile} />}
        {tab === 'progress' && <LearnerProgress />}
      </main>
    </div>
  )
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function TutorOverview({ profile }) {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    Promise.all([
      supabase.from('study_materials').select('id', { count: 'exact' }).eq('type', 'note'),
      supabase.from('videos').select('id', { count: 'exact' }),
      supabase.from('profiles').select('id', { count: 'exact' }).in('role', ['student', 'learner']),
      supabase.from('quiz_results').select('percent').limit(200),
    ]).then(([notes, vids, learners, quizzes]) => {
      const pcts = (quizzes.data || []).map(q => q.percent)
      setStats({
        notes:    notes.count ?? 0,
        videos:   vids.count ?? 0,
        learners: learners.count ?? 0,
        avgScore: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0,
      })
    })
  }, [profile?.id])

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Notes',      value: stats?.notes,    color: '#6366f1', bg: '#eef2ff' },
          { label: 'Total Videos',     value: stats?.videos,   color: '#0891b2', bg: '#ecfeff' },
          { label: 'Total Learners',   value: stats?.learners, color: '#059669', bg: '#f0fdf4' },
          { label: 'Avg Quiz Score',   value: stats ? `${stats.avgScore}%` : '—', color: '#d97706', bg: '#fffbeb' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: '20px 16px' }}>
            <p style={{ fontSize: 28, fontWeight: 700, color: c.color, margin: '0 0 4px' }}>{stats ? c.value : '—'}</p>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{c.label}</p>
          </div>
        ))}
      </div>
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '16px 20px' }}>
        <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#92400e', fontSize: 14 }}>📌 Quick Guide</p>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#78350f', fontSize: 13, lineHeight: 2 }}>
          <li><strong>Manage Notes</strong> — Upload study notes per subject, grade and topic. Learners see them in the Notes section.</li>
          <li><strong>Manage Videos</strong> — Add YouTube or Vimeo links. Learners watch them in Video Lessons.</li>
          <li><strong>Learner Progress</strong> — View quiz scores and progress for every learner on the platform.</li>
        </ul>
      </div>
    </div>
  )
}

// ─── Manage Notes ─────────────────────────────────────────────────────────────
function ManageNotes({ profile }) {
  const [materials, setMaterials] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [form,  setForm]  = useState({ title: '', subject: 'Mathematics', grade: '7', topic: '', content: '' })
  const [editing, setEditing] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [filterSubject, setFilterSubject] = useState('all')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('study_materials').select('*').eq('type', 'note').order('subject').order('grade').order('created_at', { ascending: false })
    setMaterials(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) return
    setSaving(true)
    if (editing) {
      await supabase.from('study_materials').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing)
    } else {
      await supabase.from('study_materials').insert({ ...form, type: 'note', created_by: profile?.id })
    }
    setSaving(false); setEditing(null)
    setForm({ title: '', subject: 'Mathematics', grade: '7', topic: '', content: '' })
    load()
  }

  const del = async (id) => {
    if (!confirm('Delete this note?')) return
    await supabase.from('study_materials').delete().eq('id', id)
    setMaterials(m => m.filter(x => x.id !== id))
  }

  const startEdit = (m) => {
    setEditing(m.id)
    setForm({ title: m.title, subject: m.subject, grade: m.grade, topic: m.topic || '', content: m.content })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const displayed = filterSubject === 'all' ? materials : materials.filter(m => m.subject === filterSubject)

  return (
    <div>
      <div style={card}>
        <h3 style={h3}>{editing ? '✏️ Edit Note' : '➕ Add New Note'}</h3>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <FormField label="Subject">
              <select style={inp} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value, topic: '' }))}>
                {Object.keys(SUBJECTS).map(s => <option key={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Grade">
              <select style={inp} value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
                {GRADES_LIST.map(g => <option key={g}>{g}</option>)}
              </select>
            </FormField>
            <FormField label="Topic">
              <select style={inp} value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}>
                <option value="">— General —</option>
                {topicsFor(form.subject).map(t => <option key={t}>{t}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Title *">
            <input style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Introduction to Fractions" required />
          </FormField>
          <FormField label="Content *">
            <textarea style={{ ...inp, minHeight: 160, resize: 'vertical', fontFamily: 'inherit' }} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Write the note content here…" required />
          </FormField>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} style={tealBtn}>{saving ? 'Saving…' : editing ? 'Update Note' : 'Save Note'}</button>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm({ title: '', subject: 'Mathematics', grade: '7', topic: '', content: '' }) }} style={ghostBtn}>Cancel</button>}
          </div>
        </form>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <select style={{ ...inp, width: 'auto' }} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="all">All subjects</option>
          {Object.keys(SUBJECTS).map(s => <option key={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 13, color: '#6b7280' }}>{displayed.length} note{displayed.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? <p style={grey}>Loading…</p> : displayed.length === 0 ? (
        <p style={grey}>No notes yet. Add your first note above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayed.map(m => (
            <div key={m.id} style={row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 2 }}>{m.title}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{m.subject} · Grade {m.grade}{m.topic ? ` · ${m.topic}` : ''}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{m.content}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => startEdit(m)} style={editBtn}>Edit</button>
                <button onClick={() => del(m.id)}    style={delBtn}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Manage Videos ────────────────────────────────────────────────────────────
function ManageVideos({ profile }) {
  const [videos,  setVideos]  = useState([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState({ title: '', subject: 'Mathematics', grade: '7', topic: '', url: '', description: '' })
  const [editing, setEditing] = useState(null)
  const [saving,  setSaving]  = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('videos').select('*').order('created_at', { ascending: false })
    setVideos(data ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.url.trim()) return
    setSaving(true)
    if (editing) {
      await supabase.from('videos').update({ ...form }).eq('id', editing)
    } else {
      await supabase.from('videos').insert({ ...form, uploaded_by: profile?.id, is_published: true })
    }
    setSaving(false); setEditing(null)
    setForm({ title: '', subject: 'Mathematics', grade: '7', topic: '', url: '', description: '' })
    load()
  }

  const del = async (id) => {
    if (!confirm('Delete this video?')) return
    await supabase.from('videos').delete().eq('id', id)
    setVideos(v => v.filter(x => x.id !== id))
  }

  const startEdit = (v) => {
    setEditing(v.id); setForm({ title: v.title, subject: v.subject, grade: v.grade, topic: v.topic || '', url: v.url, description: v.description || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <div style={card}>
        <h3 style={h3}>{editing ? '✏️ Edit Video' : '➕ Add New Video'}</h3>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <FormField label="Subject">
              <select style={inp} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value, topic: '' }))}>
                {Object.keys(SUBJECTS).map(s => <option key={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Grade">
              <select style={inp} value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
                {GRADES_LIST.map(g => <option key={g}>{g}</option>)}
              </select>
            </FormField>
            <FormField label="Topic">
              <select style={inp} value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}>
                <option value="">— General —</option>
                {topicsFor(form.subject).map(t => <option key={t}>{t}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Title *">
            <input style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Introduction to Algebra" required />
          </FormField>
          <FormField label="Video URL * (YouTube or Vimeo)">
            <input style={inp} type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://youtube.com/watch?v=…" required />
          </FormField>
          <FormField label="Description (optional)">
            <textarea style={{ ...inp, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description…" />
          </FormField>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} style={tealBtn}>{saving ? 'Saving…' : editing ? 'Update Video' : 'Add Video'}</button>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm({ title: '', subject: 'Mathematics', grade: '7', topic: '', url: '', description: '' }) }} style={ghostBtn}>Cancel</button>}
          </div>
        </form>
      </div>

      {loading ? <p style={grey}>Loading…</p> : videos.length === 0 ? (
        <p style={grey}>No videos yet. Add your first video above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {videos.map(v => (
            <div key={v.id} style={row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 2 }}>{v.title}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{v.subject} · Grade {v.grade}{v.topic ? ` · ${v.topic}` : ''}</div>
                <a href={v.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#0891b2', display: 'block', marginTop: 2 }}>{v.url.slice(0, 70)}{v.url.length > 70 ? '…' : ''}</a>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => startEdit(v)} style={editBtn}>Edit</button>
                <button onClick={() => del(v.id)}    style={delBtn}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Learner Progress ─────────────────────────────────────────────────────────
function LearnerProgress() {
  const [learners,  setLearners]  = useState([])
  const [results,   setResults]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('id, full_name, email, grade, role').in('role', ['student', 'learner']).order('full_name'),
      supabase.from('quiz_results').select('*').order('created_at', { ascending: false }).limit(500),
    ]).then(([p, q]) => { setLearners(p.data ?? []); setResults(q.data ?? []); setLoading(false) })
  }, [])

  const filtered = learners.filter(l =>
    l.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (selectedId) {
    const sel = learners.find(l => l.id === selectedId)
    const selResults = results.filter(r => r.user_id === selectedId)
    const avg = selResults.length ? Math.round(selResults.reduce((a, r) => a + r.percent, 0) / selResults.length) : 0
    return (
      <div>
        <button onClick={() => setSelectedId(null)} style={backBtn}>← Back to learners</button>
        <h2 style={h2}>{sel?.full_name}</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>{sel?.email} · Grade {sel?.grade || '—'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Quizzes taken', value: selResults.length,                                                         color: '#6366f1' },
            { label: 'Average score',  value: selResults.length ? `${avg}%` : '—',                                     color: '#0891b2' },
            { label: 'Best score',     value: selResults.length ? `${Math.max(...selResults.map(r => r.percent))}%` : '—', color: '#059669' },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', border: '1px solid #f3f4f6', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {selResults.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead><tr>{['Subject','Grade','Score','Result','Date'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '10px 12px', background: '#f9fafb', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>{h}</th>
            ))}</tr></thead>
            <tbody>{selResults.slice(0, 30).map(r => (
              <tr key={r.id}>
                <td style={td}><b>{r.subject}</b></td>
                <td style={td}>Grade {r.grade}</td>
                <td style={td}>{r.score}/{r.total}</td>
                <td style={td}><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: r.percent >= 70 ? '#dcfce7' : r.percent >= 50 ? '#fef9c3' : '#fee2e2', color: r.percent >= 70 ? '#15803d' : r.percent >= 50 ? '#713f12' : '#dc2626' }}>{r.percent}%</span></td>
                <td style={{ ...td, color: '#9ca3af' }}>{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <p style={grey}>No quiz results yet.</p>}
      </div>
    )
  }

  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search learners by name or email…" style={{ ...inp, marginBottom: 16 }} />
      {loading ? <p style={grey}>Loading…</p> : filtered.length === 0 ? (
        <p style={grey}>No learners found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(l => {
            const lRes = results.filter(r => r.user_id === l.id)
            const lAvg = lRes.length ? Math.round(lRes.reduce((a, r) => a + r.percent, 0) / lRes.length) : null
            return (
              <div key={l.id} onClick={() => setSelectedId(l.id)}
                style={{ ...row, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{l.full_name || '—'}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>{l.email} · Grade {l.grade || '—'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{lRes.length} quiz{lRes.length !== 1 ? 'zes' : ''}</div>
                    {lAvg !== null && <div style={{ fontSize: 12, fontWeight: 600, color: lAvg >= 70 ? '#059669' : lAvg >= 50 ? '#d97706' : '#dc2626' }}>avg {lAvg}%</div>}
                  </div>
                  <span style={{ color: '#9ca3af' }}>→</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Shared components & styles ───────────────────────────────────────────────
function FormField({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const card    = { background: 'white', border: '1px solid #f3f4f6', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }
const row     = { background: 'white', border: '1px solid #f3f4f6', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, transition: 'background .15s' }
const h2      = { fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 4px' }
const h3      = { fontSize: 16, fontWeight: 700, margin: '0 0 16px' }
const inp     = { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1.5px solid #e5e7eb', outline: 'none', boxSizing: 'border-box', color: '#111827', background: 'white' }
const tealBtn = { padding: '9px 18px', background: '#0891b2', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const ghostBtn = { padding: '9px 18px', background: 'white', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }
const editBtn = { padding: '5px 12px', background: '#ecfeff', color: '#0369a1', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }
const delBtn  = { padding: '5px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }
const td      = { padding: '10px 12px', borderBottom: '1px solid #f9fafb', color: '#374151', verticalAlign: 'middle' }
const grey    = { color: '#9ca3af', fontSize: 14, margin: 0 }
const backBtn = { background: 'none', border: 'none', color: '#0891b2', fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 20, fontWeight: 500 }
