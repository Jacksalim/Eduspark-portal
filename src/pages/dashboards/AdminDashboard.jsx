// src/pages/dashboards/AdminDashboard.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import AdminMaterials from '../admin/AdminMaterials'
import AdminPromotions from '../admin/AdminPromotions'
import DashboardHeader from '../../components/DashboardHeader'

export default function AdminDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview',      label: 'Overview' },
    { id: 'applications',  label: 'Tutor applications' },
    { id: 'parent-links',  label: 'Parent links' },
    { id: 'users',         label: 'Users' },
    { id: 'materials',     label: 'Study materials' },
    { id: 'promotions',    label: 'Grade promotions' },
    { id: 'audit',         label: 'Audit log' },
  ]

  return (
    <DashboardShell role="admin" profile={profile}>
      <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid #f3f4f6',
        marginBottom: 28, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '8px 16px', fontSize: 14, fontWeight: 500, border: 'none',
            background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            borderBottom: activeTab === t.id ? '2px solid #6366f1' : '2px solid transparent',
            color: activeTab === t.id ? '#4338ca' : '#6b7280',
          }}>
            {t.label}
          </button>
        ))}
      </nav>

      {activeTab === 'overview'     && <AdminOverview />}
      {activeTab === 'applications' && <TutorApplicationsPanel />}
      {activeTab === 'parent-links' && <ParentLinksPanel />}
      {activeTab === 'users'        && <UsersPanel />}
      {activeTab === 'materials'    && <AdminMaterials profile={profile} />}
      {activeTab === 'promotions'   && <AdminPromotions profile={profile} />}
      {activeTab === 'audit'        && <AuditLogPanel />}
    </DashboardShell>
  )
}

// ─── Overview stats ───────────────────────────────────────────────────────────

function AdminOverview() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function load() {
      const [students, tutors, parents, apps] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'tutor'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'parent'),
        supabase.from('tutor_applications').select('id', { count: 'exact' }).eq('status', 'pending'),
      ])
      setStats({
        students: students.count ?? 0,
        tutors:   tutors.count   ?? 0,
        parents:  parents.count  ?? 0,
        pending:  apps.count     ?? 0,
      })
    }
    load()
  }, [])

  const cards = [
    { label: 'Students',          value: stats?.students, color: '#6366f1', bg: '#eef2ff' },
    { label: 'Tutors',            value: stats?.tutors,   color: '#0891b2', bg: '#ecfeff' },
    { label: 'Parents',           value: stats?.parents,  color: '#059669', bg: '#f0fdf4' },
    { label: 'Pending apps',      value: stats?.pending,  color: '#d97706', bg: '#fffbeb' },
  ]

  return (
    <div>
      <h2 style={h2Style}>Platform overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        {cards.map(c => (
          <div key={c.label} style={{
            background: c.bg, borderRadius: 12, padding: '20px 16px',
          }}>
            <p style={{ fontSize: 28, fontWeight: 700, color: c.color, margin: '0 0 4px' }}>
              {stats ? c.value : '—'}
            </p>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tutor applications review panel ─────────────────────────────────────────

function TutorApplicationsPanel() {
  const { user } = useAuth()
  const [apps,    setApps]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('pending')
  const [search,  setSearch]  = useState('')
  const [selected, setSelected] = useState(null)
  const [notes,   setNotes]   = useState('')
  const [acting,  setActing]  = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('tutor_applications')
        .select('*, profiles!tutor_applications_user_id_fkey(full_name, email, avatar_url)')
        .order('created_at', { ascending: false })

      if (filter !== 'all') query = query.eq('status', filter)

      const { data } = await query
      setApps(data ?? [])
      setLoading(false)
    }
    load()
  }, [filter])

  const filtered = apps.filter(a =>
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  )

  const handleAction = async (action) => {
    if (!selected) return
    setActing(true)
    const fn = action === 'approve' ? 'approve_tutor_application' : 'reject_tutor_application'
    const { error } = await supabase.rpc(fn, {
      application_id: selected.id,
      admin_id: user.id,
      notes: notes || null,
    })
    setActing(false)
    if (error) { alert('Error: ' + error.message); return }
    setSelected(null)
    setNotes('')
    // Reload
    setFilter(f => f) // trigger re-fetch
  }

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={backBtnStyle}>
          ← Back to applications
        </button>

        <h2 style={h2Style}>{selected.full_name}</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>{selected.email}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <InfoBlock label="Status">
            <StatusBadge status={selected.status} />
          </InfoBlock>
          <InfoBlock label="Submitted">{new Date(selected.created_at).toLocaleDateString()}</InfoBlock>
          <InfoBlock label="National ID">{selected.national_id}</InfoBlock>
          <InfoBlock label="Phone">{selected.phone || '—'}</InfoBlock>
          <InfoBlock label="Experience">{selected.years_experience} year(s)</InfoBlock>
          <InfoBlock label="Subjects">{(selected.subjects || []).join(', ') || '—'}</InfoBlock>
        </div>

        <InfoBlock label="Qualifications">{selected.qualifications}</InfoBlock>
        <InfoBlock label="Certifications">{selected.certifications || '—'}</InfoBlock>
        <InfoBlock label="References">{selected.references || '—'}</InfoBlock>
        <InfoBlock label="Motivation statement" style={{ marginTop: 12 }}>
          {selected.motivation}
        </InfoBlock>

        {selected.cv_url && (
          <a href={selected.cv_url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-block', marginTop: 12, color: '#6366f1', fontSize: 14 }}>
            View CV / Resume ↗
          </a>
        )}

        {selected.status === 'pending' && (
          <div style={{ marginTop: 28, borderTop: '1px solid #f3f4f6', paddingTop: 24 }}>
            <label style={labelStyle}>Admin notes (optional, shown to applicant)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Add notes about your decision…"
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', marginBottom: 16 }} />

            <div style={{ display: 'flex', gap: 12 }}>
              <button disabled={acting} onClick={() => handleAction('approve')} style={{
                ...btnStyle, background: '#059669',
              }}>
                {acting ? 'Processing…' : '✓ Approve'}
              </button>
              <button disabled={acting} onClick={() => handleAction('reject')} style={{
                ...btnStyle, background: '#dc2626',
              }}>
                {acting ? 'Processing…' : '✗ Reject'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={inputStyle}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: 14 }}>No applications found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(app => (
            <div key={app.id} onClick={() => { setSelected(app); setNotes('') }}
              style={{
                padding: '14px 16px', border: '1px solid #f3f4f6', borderRadius: 10,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 12,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#111827' }}>
                  {app.full_name}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
                  {app.email} · {(app.subjects || []).slice(0, 2).join(', ')}
                  {(app.subjects || []).length > 2 ? ` +${app.subjects.length - 2}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusBadge status={app.status} />
                <span style={{ color: '#9ca3af', fontSize: 12 }}>
                  {new Date(app.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Parent links panel ───────────────────────────────────────────────────────

function ParentLinksPanel() {
  const { user } = useAuth()
  const [links, setLinks]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('parent_student_links')
      .select('*, parent:profiles!parent_student_links_parent_id_fkey(full_name, email), student:profiles!parent_student_links_student_id_fkey(full_name, email)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setLinks(data ?? []); setLoading(false) })
  }, [])

  const removeLink = async (id) => {
    if (!confirm('Remove this parent-student link?')) return
    await supabase.from('parent_student_links').delete().eq('id', id)
    setLinks(l => l.filter(x => x.id !== id))
  }

  return (
    <div>
      <h2 style={h2Style}>Parent-student links</h2>
      {loading ? <p style={{ color: '#9ca3af' }}>Loading…</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              {['Parent', 'Student', 'Status', 'Created', 'Action'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 12px',
                  background: '#f9fafb', fontSize: 12, fontWeight: 600, color: '#6b7280',
                  borderBottom: '1px solid #f3f4f6' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {links.map(l => (
              <tr key={l.id}>
                <td style={tdStyle}>{l.parent?.full_name ?? '—'}</td>
                <td style={tdStyle}>{l.student?.full_name ?? '—'}</td>
                <td style={tdStyle}><StatusBadge status={l.status} /></td>
                <td style={tdStyle}>{new Date(l.created_at).toLocaleDateString()}</td>
                <td style={tdStyle}>
                  <button onClick={() => removeLink(l.id)} style={{
                    padding: '4px 10px', fontSize: 12, color: '#dc2626',
                    background: '#fef2f2', border: 'none', borderRadius: 6, cursor: 'pointer',
                  }}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Users panel ──────────────────────────────────────────────────────────────

function UsersPanel() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setUsers(data ?? []); setLoading(false) })
  }, [])

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <h2 style={h2Style}>Users</h2>
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search users…" style={{ ...inputStyle, marginBottom: 16 }} />
      {loading ? <p style={{ color: '#9ca3af' }}>Loading…</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              {['Name', 'Email', 'Role', 'Joined'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 12px',
                  background: '#f9fafb', fontSize: 12, fontWeight: 600,
                  color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td style={tdStyle}>{u.full_name || '—'}</td>
                <td style={tdStyle}>{u.email}</td>
                <td style={tdStyle}><RoleBadge role={u.role} /></td>
                <td style={tdStyle}>{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Audit log panel ──────────────────────────────────────────────────────────

function AuditLogPanel() {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => { setLogs(data ?? []); setLoading(false) })
  }, [])

  return (
    <div>
      <h2 style={h2Style}>Audit log (last 100 events)</h2>
      {loading ? <p style={{ color: '#9ca3af' }}>Loading…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {logs.map(l => (
            <div key={l.id} style={{
              padding: '10px 14px', background: '#f9fafb', borderRadius: 8,
              fontSize: 13, display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <span style={{
                fontFamily: 'monospace', fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap'
              }}>
                {new Date(l.created_at).toLocaleString()}
              </span>
              <span style={{ fontWeight: 600, color: '#374151' }}>{l.action}</span>
              {l.target_type && (
                <span style={{ color: '#6b7280' }}>{l.target_type}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Shared utilities ─────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = {
    pending:  { color: '#92400e', bg: '#fef3c7' },
    approved: { color: '#065f46', bg: '#d1fae5' },
    rejected: { color: '#991b1b', bg: '#fee2e2' },
  }[status] ?? { color: '#374151', bg: '#f3f4f6' }

  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      textTransform: 'capitalize', color: cfg.color, background: cfg.bg,
    }}>
      {status}
    </span>
  )
}

function RoleBadge({ role }) {
  const colors = {
    admin: { color: '#5b21b6', bg: '#ede9fe' },
    tutor: { color: '#0369a1', bg: '#e0f2fe' },
    parent: { color: '#065f46', bg: '#d1fae5' },
    student: { color: '#374151', bg: '#f3f4f6' },
  }[role] ?? { color: '#374151', bg: '#f3f4f6' }

  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      textTransform: 'capitalize', color: colors.color, background: colors.bg,
    }}>
      {role}
    </span>
  )
}

function InfoBlock({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase',
        letterSpacing: '0.05em', margin: '0 0 4px' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 14, color: '#111827', whiteSpace: 'pre-wrap' }}>{children}</p>
    </div>
  )
}

const h2Style     = { fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 20px' }
const tdStyle     = { padding: '10px 12px', borderBottom: '1px solid #f9fafb', color: '#374151', verticalAlign: 'middle' }
const labelStyle  = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }
const inputStyle  = { width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14, border: '1.5px solid #e5e7eb', outline: 'none', boxSizing: 'border-box' }
const btnStyle    = { padding: '10px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const backBtnStyle = { background: 'none', border: 'none', color: '#6366f1', fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 20, fontWeight: 500 }

// ─── Dashboard shell ──────────────────────────────────────────────────────────

function DashboardShell({ role, profile, children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <DashboardHeader role={role} profile={profile} />

      <main style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
