// src/pages/admin/AdminMaterials.jsx
import { useState, useEffect } from 'react'
import {
  fetchStudyMaterials, createStudyMaterial, updateStudyMaterial, deleteStudyMaterial,
} from '../../lib/supabase'
import { SUBJECTS, GRADES, Spinner, useToast } from '../../components/ui'
import { topicsFor } from '../../lib/topics'

const TYPES = [
  { key: 'note',           label: '📝 Note' },
  { key: 'past_paper',     label: '📋 Past Paper' },
  { key: 'revision_guide', label: '📖 Revision Guide' },
]

export default function AdminMaterials({ profile }) {
  const [form, setForm] = useState({ type: 'note', subject: 'Mathematics', grade: '7', topic: '', title: '', year: '', content: '' })
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [filterType, setFilterType] = useState('All')
  const { show, ToastEl } = useToast()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function loadMaterials() {
    setLoading(true)
    fetchStudyMaterials({}).then(setMaterials).catch(() => setMaterials([])).finally(() => setLoading(false))
  }
  useEffect(loadMaterials, [])

  function resetForm() {
    setForm({ type: 'note', subject: 'Mathematics', grade: '7', topic: '', title: '', year: '', content: '' })
    setEditingId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) { show('Title and content are required', 'error'); return }
    if (form.type === 'note' && !form.topic) { show('Topic is required for Notes', 'error'); return }

    setSaving(true)
    try {
      if (editingId) {
        await updateStudyMaterial(editingId, form)
        show('Material updated ✅')
      } else {
        await createStudyMaterial({ ...form, createdBy: profile?.id })
        show('Material added ✅')
      }
      resetForm()
      loadMaterials()
    } catch (err) {
      show('Save failed: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(m) {
    setForm({ type: m.type, subject: m.subject, grade: m.grade, topic: m.topic || '', title: m.title, year: m.year || '', content: m.content })
    setEditingId(m.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(id) {
    if (!confirm('Delete this material? This cannot be undone.')) return
    try { await deleteStudyMaterial(id); show('Deleted'); loadMaterials() }
    catch (err) { show('Delete failed: ' + err.message, 'error') }
  }

  const filtered = filterType === 'All' ? materials : materials.filter(m => m.type === filterType)

  return (
    <div>
      {ToastEl}
      <div className="section-header">
        <h2>📚 Study Materials</h2>
        <p>Manage Notes (by topic) and Revision Materials (past papers / guides).</p>
      </div>

      <div className="card card-pad" style={{ marginBottom: 28 }}>
        <h4 style={{ fontSize: '1rem', marginBottom: 20 }}>{editingId ? 'Edit Material' : 'Add New Material'}</h4>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select className="form-control" value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Subject</label>
              <select className="form-control" value={form.subject} onChange={e => { set('subject', e.target.value); set('topic', '') }}>
                {Object.keys(SUBJECTS).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Grade</label>
              <select className="form-control" value={form.grade} onChange={e => set('grade', e.target.value)}>
                {GRADES.map(g => <option key={g} value={g}>{g === 'R' ? 'Grade R' : `Grade ${g}`}</option>)}
              </select>
            </div>
            {form.type === 'note' ? (
              <div className="form-group">
                <label>Topic *</label>
                <select className="form-control" value={form.topic} onChange={e => set('topic', e.target.value)}>
                  <option value="">Select a topic…</option>
                  {topicsFor(form.subject).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label>Exam Year (optional)</label>
                <input className="form-control" value={form.year} onChange={e => set('year', e.target.value)} placeholder="e.g. 2024" />
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Title *</label>
            <input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Fractions — Key Concepts" required />
          </div>
          <div className="form-group">
            <label>Content *</label>
            <textarea className="form-control" value={form.content} onChange={e => set('content', e.target.value)}
              placeholder="Write the note or past paper content here (plain text / markdown)…"
              rows={8} required style={{ resize: 'vertical', fontFamily: "'DM Sans',sans-serif" }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-teal" type="submit" disabled={saving}>
              {saving ? '⏳ Saving…' : editingId ? '💾 Update Material' : '➕ Add Material'}
            </button>
            {editingId && <button className="btn btn-ghost" type="button" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <h4 style={{ margin: 0 }}>All Materials ({filtered.length})</h4>
        <select className="form-control" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 200 }}>
          <option value="All">All Types</option>
          {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Title</th><th>Type</th><th>Subject</th><th>Grade</th><th>Topic / Year</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>No materials yet.</td></tr>
              )}
              {filtered.map(m => (
                <tr key={m.id}>
                  <td><b>{m.title}</b></td>
                  <td>{TYPES.find(t => t.key === m.type)?.label || m.type}</td>
                  <td>{m.subject}</td>
                  <td>Grade {m.grade}</td>
                  <td style={{ color: '#888' }}>{m.topic || m.year || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(m)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
