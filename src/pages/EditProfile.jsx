// src/pages/EditProfile.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { updatePassword } from '../lib/supabase'

export default function EditProfile() {
  const { profile, refreshProfile, role } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name: profile?.full_name || profile?.name || '',
    phone:     profile?.phone || '',
    avatar_url: profile?.avatar_url || '',
  })
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [saving,   setSaving]   = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [msg,      setMsg]      = useState(null)
  const [pwMsg,    setPwMsg]    = useState(null)
  const [tab,      setTab]      = useState('details')

  const dashboardPath = { admin: '/admin', tutor: '/tutor', parent: '/parent', student: '/student' }[role] || '/student'

  const handleChange  = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const handlePwChange = (e) => setPwForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const saveDetails = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim()) { setMsg({ type: 'error', text: 'Full name is required' }); return }
    setSaving(true); setMsg(null)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: form.full_name.trim(), phone: form.phone.trim(), avatar_url: form.avatar_url.trim() })
      .eq('id', profile.id)
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      await refreshProfile()
      setMsg({ type: 'success', text: 'Profile updated successfully!' })
    }
    setSaving(false)
  }

  const savePassword = async (e) => {
    e.preventDefault()
    if (pwForm.newPw.length < 8)             { setPwMsg({ type: 'error', text: 'Password must be at least 8 characters' }); return }
    if (pwForm.newPw !== pwForm.confirm)      { setPwMsg({ type: 'error', text: 'Passwords do not match' }); return }
    setSavingPw(true); setPwMsg(null)
    const { error } = await updatePassword(pwForm.newPw)
    if (error) {
      setPwMsg({ type: 'error', text: error.message })
    } else {
      setPwMsg({ type: 'success', text: 'Password changed successfully!' })
      setPwForm({ current: '', newPw: '', confirm: '' })
    }
    setSavingPw(false)
  }

  const initials = (form.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <header style={{
        background: 'white', borderBottom: '1px solid #f3f4f6',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(dashboardPath)} style={{
            background: 'none', border: 'none', color: '#6366f1', fontSize: 14,
            fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            ← Back to dashboard
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, background: '#6366f1', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, color: '#111827' }}>EduSpark</span>
        </div>
      </header>

      <main style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px' }}>
        {/* Avatar + name hero */}
        <div style={{
          background: 'white', borderRadius: 16, padding: '32px 24px',
          textAlign: 'center', marginBottom: 20,
          boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 12px',
            background: form.avatar_url ? 'transparent' : '#eef2ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700, color: '#6366f1', overflow: 'hidden',
            border: '3px solid #e0e7ff',
          }}>
            {form.avatar_url
              ? <img src={form.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display='none' }} />
              : initials
            }
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
            {form.full_name || 'Your Profile'}
          </h1>
          <span style={{
            padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            textTransform: 'capitalize', color: 'white',
            background: { admin: '#7c3aed', tutor: '#0891b2', parent: '#059669', student: '#6366f1' }[role] || '#6366f1',
          }}>
            {role}
          </span>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 8, marginBottom: 0 }}>
            {profile?.email}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'white', borderRadius: 12, padding: 4, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          {[['details', '👤 My details'], ['password', '🔒 Change password']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', fontSize: 14,
              fontWeight: tab === id ? 600 : 400, cursor: 'pointer',
              background: tab === id ? '#6366f1' : 'transparent',
              color: tab === id ? 'white' : '#6b7280',
              transition: 'all 0.2s',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Details tab */}
        {tab === 'details' && (
          <div style={{ background: 'white', borderRadius: 16, padding: '28px 24px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Personal details</h2>

            {msg && <MsgBanner type={msg.type} text={msg.text} />}

            <form onSubmit={saveDetails} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FormField label="Full name *" name="full_name" value={form.full_name} onChange={handleChange} required />
              <FormField label="Email address" value={profile?.email || ''} disabled
                hint="Email cannot be changed here. Contact support if needed." />
              <FormField label="Phone number" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+254 7XX XXX XXX" />
              <FormField label="Profile picture URL (optional)" name="avatar_url" type="url"
                value={form.avatar_url} onChange={handleChange} placeholder="https://..." />

              <div style={{ paddingTop: 4 }}>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 12px' }}>
                  Role: <strong style={{ textTransform: 'capitalize' }}>{role}</strong> · Role changes must be requested through the admin.
                </p>
                <button type="submit" disabled={saving} style={{
                  padding: '11px 28px', background: saving ? '#a5b4fc' : '#6366f1',
                  color: 'white', border: 'none', borderRadius: 8, fontSize: 15,
                  fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                }}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Password tab */}
        {tab === 'password' && (
          <div style={{ background: 'white', borderRadius: 16, padding: '28px 24px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Change password</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>
              Choose a strong password of at least 8 characters.
            </p>

            {pwMsg && <MsgBanner type={pwMsg.type} text={pwMsg.text} />}

            <form onSubmit={savePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FormField label="New password" name="newPw" type="password" value={pwForm.newPw} onChange={handlePwChange} required />
              <FormField label="Confirm new password" name="confirm" type="password" value={pwForm.confirm} onChange={handlePwChange} required />
              <button type="submit" disabled={savingPw} style={{
                padding: '11px 28px', background: savingPw ? '#a5b4fc' : '#6366f1',
                color: 'white', border: 'none', borderRadius: 8, fontSize: 15,
                fontWeight: 600, cursor: savingPw ? 'not-allowed' : 'pointer', alignSelf: 'flex-start',
              }}>
                {savingPw ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FormField({ label, name, type = 'text', value, onChange, required, disabled, hint, placeholder }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>{label}</label>
      <input name={name} type={type} value={value} onChange={onChange} required={required}
        disabled={disabled} placeholder={placeholder}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
          border: '1.5px solid #e5e7eb', outline: 'none',
          background: disabled ? '#f9fafb' : 'white', color: disabled ? '#9ca3af' : '#111827',
        }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = '#6366f1' }}
        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
      />
      {hint && <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>{hint}</p>}
    </div>
  )
}

function MsgBanner({ type, text }) {
  const styles = {
    success: { background: '#f0fdf4', border: '1px solid #86efac', color: '#166534' },
    error:   { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' },
  }
  return (
    <div style={{ ...styles[type], borderRadius: 8, padding: '10px 14px', fontSize: 14, marginBottom: 16 }}>
      {type === 'success' ? '✅ ' : '❌ '}{text}
    </div>
  )
}
