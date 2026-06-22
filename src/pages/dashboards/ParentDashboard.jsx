// src/pages/dashboards/ParentDashboard.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import DashboardHeader from '../../components/DashboardHeader'

export default function ParentDashboard() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const [activeTab,    setActiveTab]    = useState('children')
  const [children,     setChildren]     = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    async function loadChildren() {
      const { data } = await supabase
        .from('parent_student_links')
        .select('*, student:profiles!parent_student_links_student_id_fkey(id, full_name, email, avatar_url)')
        .eq('parent_id', user.id)
        .eq('status', 'approved')

      setChildren(data ?? [])
      setLoading(false)
    }
    loadChildren()
  }, [user.id])

  const tabs = [
    { id: 'children',  label: 'My children' },
    { id: 'link',      label: 'Link a child' },
    { id: 'requests',  label: 'Pending requests' },
    { id: 'settings',  label: 'Account settings' },
  ]

  return (
    <DashboardShell role="parent" profile={profile}>
      <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid #f3f4f6', marginBottom: 28 }}>
        {tabs.map(t => (
          <TabBtn key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </TabBtn>
        ))}
      </nav>

      {activeTab === 'children' && (
        <div>
          <h2 style={h2Style}>My children</h2>
          {loading ? (
            <p style={{ color: '#9ca3af' }}>Loading…</p>
          ) : children.length === 0 ? (
            <EmptyState
              icon="👨‍👩‍👧"
              message="No linked children yet"
              action="Link a child"
              onAction={() => setActiveTab('link')}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {children.map(link => (
                <ChildCard key={link.id} student={link.student}
                  onView={() => setSelectedChild(link.student)} />
              ))}
            </div>
          )}

          {selectedChild && (
            <ChildDetailModal child={selectedChild} onClose={() => setSelectedChild(null)} />
          )}
        </div>
      )}

      {activeTab === 'link' && <LinkChildPanel userId={user.id} />}
      {activeTab === 'requests' && <PendingRequestsPanel userId={user.id} />}
      {activeTab === 'settings' && <AccountSettings profile={profile} />}
    </DashboardShell>
  )
}

// ─── Child card ───────────────────────────────────────────────────────────────

function ChildCard({ student, onView }) {
  const initials = student.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{
      border: '1px solid #f3f4f6', borderRadius: 12, padding: 20, background: 'white',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, background: '#eef2ff', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: '#6366f1',
        }}>
          {initials || '?'}
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>{student.full_name}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{student.email}</p>
        </div>
      </div>
      <button onClick={onView} style={{
        width: '100%', padding: '8px 0', background: '#eef2ff', color: '#4338ca',
        border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
      }}>
        View progress
      </button>
    </div>
  )
}

// ─── Child detail modal (progress view) ──────────────────────────────────────

function ChildDetailModal({ child, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'white', borderRadius: 16, width: '100%', maxWidth: 560,
        padding: '28px 24px', maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{child.full_name}'s progress</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af'
          }}>×</button>
        </div>

        <p style={{ color: '#6b7280', fontSize: 14 }}>
          Progress tracking is available once your child starts using the platform. Check back after they complete their first lesson or quiz.
        </p>

        {/* Placeholder stats — replace with real Supabase queries to lesson/quiz tables */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          {[
            { label: 'Lessons completed', value: '—' },
            { label: 'Quizzes taken',     value: '—' },
            { label: 'Avg. quiz score',   value: '—' },
            { label: 'Study streak',      value: '—' },
          ].map(s => (
            <div key={s.label} style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#111827' }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Link child panel ─────────────────────────────────────────────────────────

function LinkChildPanel({ userId }) {
  const [studentEmail, setStudentEmail] = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [success,      setSuccess]      = useState(false)

  const handleLink = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Find student by email
    const { data: student, error: findError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('email', studentEmail.trim().toLowerCase())
      .single()

    if (findError || !student) {
      setError('No student found with that email address.')
      setLoading(false)
      return
    }

    if (student.role !== 'student') {
      setError('That account is not a student account.')
      setLoading(false)
      return
    }

    // Create link request
    const { error: insertError } = await supabase
      .from('parent_student_links')
      .insert({ parent_id: userId, student_id: student.id, status: 'pending' })

    setLoading(false)

    if (insertError) {
      if (insertError.code === '23505') {
        setError('You already have a pending or approved link with this student.')
      } else {
        setError(insertError.message)
      }
      return
    }

    // Notify student
    await supabase.from('notifications').insert({
      user_id: student.id,
      type: 'parent_link_request',
      title: 'Parent monitoring request',
      body: 'A parent has requested to monitor your learning progress. Check your dashboard to approve or decline.',
    })

    setSuccess(true)
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📨</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
          Request sent!
        </h3>
        <p style={{ color: '#6b7280', fontSize: 14 }}>
          The student will receive a notification and can approve or decline your request.
        </p>
        <button onClick={() => { setSuccess(false); setStudentEmail('') }} style={{
          marginTop: 16, padding: '10px 24px', background: '#eef2ff',
          color: '#4338ca', border: 'none', borderRadius: 8, fontSize: 14,
          fontWeight: 600, cursor: 'pointer',
        }}>
          Link another child
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 style={h2Style}>Link a child</h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
        Enter your child's registered email to send them a monitoring request.
        They'll need to approve before you can see their progress.
      </p>

      {error && <ErrorBanner message={error} />}

      <form onSubmit={handleLink} style={{ maxWidth: 420 }}>
        <label style={labelStyle}>Child's email address</label>
        <input type="email" value={studentEmail}
          onChange={e => setStudentEmail(e.target.value)}
          required placeholder="student@example.com"
          style={{ ...inputStyle, marginBottom: 16 }} />

        <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Searching…' : 'Send link request'}
        </button>
      </form>
    </div>
  )
}

// ─── Pending requests panel ───────────────────────────────────────────────────

function PendingRequestsPanel({ userId }) {
  const [requests, setRequests] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase
      .from('parent_student_links')
      .select('*, student:profiles!parent_student_links_student_id_fkey(full_name, email)')
      .eq('parent_id', userId)
      .eq('status', 'pending')
      .then(({ data }) => { setRequests(data ?? []); setLoading(false) })
  }, [userId])

  return (
    <div>
      <h2 style={h2Style}>Pending link requests</h2>
      {loading ? <p style={{ color: '#9ca3af' }}>Loading…</p> :
        requests.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 14 }}>No pending requests.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {requests.map(r => (
              <div key={r.id} style={{
                padding: '14px 16px', border: '1px solid #f3f4f6', borderRadius: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>{r.student?.full_name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{r.student?.email}</p>
                </div>
                <span style={{
                  padding: '4px 12px', background: '#fffbeb', color: '#92400e',
                  borderRadius: 20, fontSize: 11, fontWeight: 600,
                }}>
                  Awaiting approval
                </span>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}

// ─── Account settings ─────────────────────────────────────────────────────────

function AccountSettings({ profile }) {
  const { refreshProfile } = useAuth()
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { updateProfile } = await import('../../lib/supabase')
    await updateProfile(profile.id, form)
    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 style={h2Style}>Account settings</h2>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Full name</label>
          <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Phone</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input value={profile?.email ?? ''} disabled
            style={{ ...inputStyle, background: '#f9fafb', color: '#9ca3af' }} />
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Email cannot be changed here.</p>
        </div>
        <button type="submit" disabled={saving} style={{ ...btnStyle, alignSelf: 'flex-start' }}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function EmptyState({ icon, message, action, onAction }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>{message}</p>
      {action && (
        <button onClick={onAction} style={btnStyle}>{action}</button>
      )}
    </div>
  )
}

function ErrorBanner({ message }) {
  return (
    <div style={{
      background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
      padding: '10px 14px', color: '#b91c1c', fontSize: 14, marginBottom: 16,
    }}>
      {message}
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', fontSize: 14, fontWeight: 500, border: 'none',
      background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
      borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
      color: active ? '#4338ca' : '#6b7280',
    }}>
      {children}
    </button>
  )
}

const h2Style    = { fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 20px' }
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14, border: '1.5px solid #e5e7eb', outline: 'none', boxSizing: 'border-box' }
const btnStyle   = { padding: '10px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }

function DashboardShell({ role, profile, children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <DashboardHeader role={role} profile={profile} />
      <main style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>{children}</main>
    </div>
  )
}
