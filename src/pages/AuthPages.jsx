// src/pages/LoginPage.jsx
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { signIn } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { refreshProfile } = useAuth()
  const from      = location.state?.from?.pathname ?? null

  const [form,    setForm]    = useState({ email: '', password: '' })
  const [error,   setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(form)
    if (error) { setError(error.message); setLoading(false); return }

    // Reload profile from DB to get the real role (not stale JWT metadata)
    const profile = await refreshProfile()
    setLoading(false)

    const dashboards = {
      admin:   '/admin',
      tutor:   '/tutor',
      parent:  '/parent',
      student: '/student',
    }
    const role = profile?.role ?? 'student'
    navigate(from ?? dashboards[role] ?? '/student', { replace: true })
  }

  return (
    <AuthShell title="Sign in to EduSpark">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <ErrorBanner message={error} />}

        <Field label="Email" name="email" type="email" value={form.email}
          onChange={handleChange} required autoComplete="email" />

        <Field label="Password" name="password" type="password" value={form.password}
          onChange={handleChange} required autoComplete="current-password" />

        <div style={{ textAlign: 'right', marginTop: -8 }}>
          <Link to="/forgot-password" style={linkStyle}>Forgot password?</Link>
        </div>

        <SubmitButton loading={loading}>Sign in</SubmitButton>
      </form>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#6b7280' }}>
        No account?{' '}
        <Link to="/register" style={linkStyle}>Create one</Link>
        {' · '}
        <Link to="/register?role=parent" style={linkStyle}>Register as parent</Link>
      </p>
    </AuthShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

// src/pages/RegisterPage.jsx
import { useSearchParams } from 'react-router-dom'
import { signUp } from '../lib/supabase'

export function RegisterPage() {
  const [searchParams]  = useSearchParams()
  const defaultRole     = searchParams.get('role') === 'parent' ? 'parent' : 'student'
  const navigate        = useNavigate()

  const [role, setRole] = useState(defaultRole)
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
    relationship: 'parent', // for parent registrations
  })
  const [error,   setError]   = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const validate = () => {
    if (!form.fullName.trim()) return 'Full name is required'
    if (!form.email.trim())    return 'Email is required'
    if (form.password.length < 8) return 'Password must be at least 8 characters'
    if (form.password !== form.confirmPassword) return 'Passwords do not match'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setError(null)
    setLoading(true)

    const { error } = await signUp({
      email: form.email,
      password: form.password,
      fullName: form.fullName,
      role,
    })
    setLoading(false)

    if (error) { setError(error.message); return }
    setSuccess(true)
  }

  if (success) {
    return (
      <AuthShell title="Check your email">
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
          <p style={{ color: '#374151', marginBottom: 8 }}>
            We sent a confirmation link to <strong>{form.email}</strong>.
          </p>
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            Click the link to activate your account, then{' '}
            <Link to="/login" style={linkStyle}>sign in</Link>.
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={role === 'parent' ? 'Register as Parent' : 'Create your account'}>
      {/* Role toggle — only student/parent allowed */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['student', 'parent'].map(r => (
          <button key={r} type="button"
            onClick={() => setRole(r)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8, border: '1.5px solid',
              borderColor: role === r ? '#6366f1' : '#e5e7eb',
              background: role === r ? '#eef2ff' : 'white',
              color: role === r ? '#4338ca' : '#6b7280',
              fontWeight: role === r ? 600 : 400,
              cursor: 'pointer', fontSize: 14, textTransform: 'capitalize',
            }}>
            {r}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <ErrorBanner message={error} />}

        <Field label="Full name" name="fullName" value={form.fullName}
          onChange={handleChange} required />
        <Field label="Email" name="email" type="email" value={form.email}
          onChange={handleChange} required />
        <Field label="Phone (optional)" name="phone" type="tel" value={form.phone}
          onChange={handleChange} />
        {role === 'parent' && (
          <div>
            <label style={labelStyle}>Relationship to student</label>
            <select name="relationship" value={form.relationship}
              onChange={handleChange} style={inputStyle}>
              <option>Parent</option>
              <option>Guardian</option>
              <option>Grandparent</option>
              <option>Other</option>
            </select>
          </div>
        )}
        <Field label="Password" name="password" type="password" value={form.password}
          onChange={handleChange} required />
        <Field label="Confirm password" name="confirmPassword" type="password"
          value={form.confirmPassword} onChange={handleChange} required />

        <SubmitButton loading={loading}>Create account</SubmitButton>
      </form>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#6b7280' }}>
        Already have an account? <Link to="/login" style={linkStyle}>Sign in</Link>
      </p>
    </AuthShell>
  )
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

const linkStyle = { color: '#6366f1', textDecoration: 'none', fontWeight: 500 }
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500,
  color: '#374151', marginBottom: 5 }
const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14,
  border: '1.5px solid #e5e7eb', outline: 'none', boxSizing: 'border-box',
  color: '#111827', background: 'white',
}

function Field({ label, name, type = 'text', value, onChange, required, autoComplete }) {
  return (
    <div>
      <label htmlFor={name} style={labelStyle}>{label}</label>
      <input id={name} name={name} type={type} value={value} onChange={onChange}
        required={required} autoComplete={autoComplete}
        style={inputStyle}
        onFocus={e => e.target.style.borderColor = '#6366f1'}
        onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
    </div>
  )
}

function ErrorBanner({ message }) {
  return (
    <div style={{
      background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
      padding: '10px 14px', color: '#b91c1c', fontSize: 14,
    }}>
      {message}
    </div>
  )
}

function SubmitButton({ loading, children }) {
  return (
    <button type="submit" disabled={loading} style={{
      width: '100%', padding: '11px 0', borderRadius: 8, border: 'none',
      background: loading ? '#a5b4fc' : '#6366f1', color: 'white',
      fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
      marginTop: 4, transition: 'background 0.2s',
    }}>
      {loading ? 'Please wait…' : children}
    </button>
  )
}

function AuthShell({ title, children }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f9fafb', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 420, background: 'white', borderRadius: 16,
        padding: '36px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8
          }}>
            <div style={{
              width: 32, height: 32, background: '#6366f1', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>EduSpark</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
