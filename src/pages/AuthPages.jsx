// src/pages/AuthPages.jsx
import { useState } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { signIn, signUp } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { TermsAndConditions, PrivacyPolicy } from './PrivacyPolicy'
import { GRADES } from '../components/ui.jsx'

// ─── Login Page ───────────────────────────────────────────────────────────────

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

    try {
      await signIn(form)
    } catch (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const profile = await refreshProfile()
    setLoading(false)

    const dashboards = { admin: '/admin', tutor: '/tutor', parent: '/parent', student: '/student' }
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

// ─── Register Page ────────────────────────────────────────────────────────────

export function RegisterPage() {
  const [searchParams] = useSearchParams()
  const defaultRole    = searchParams.get('role') === 'parent' ? 'parent' : 'student'
  const navigate       = useNavigate()

  const [role, setRole]           = useState(defaultRole)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showTerms,     setShowTerms]     = useState(false)
  const [showPrivacy,   setShowPrivacy]   = useState(false)
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '', relationship: 'Parent', grade: '',
  })
  const [error,   setError]   = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const validate = () => {
    if (!form.fullName.trim())        return 'Full name is required'
    if (!form.email.trim())           return 'Email is required'
    if (form.password.length < 8)     return 'Password must be at least 8 characters'
    if (form.password !== form.confirmPassword) return 'Passwords do not match'
    if (role === 'student' && !form.grade) return 'Please select your grade'
    if (!acceptedTerms)               return 'You must accept the Terms and Conditions to continue'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError(null); setLoading(true)
    try {
      await signUp({
        email: form.email,
        password: form.password,
        name: form.fullName,
        role,
        grade: role === 'student' ? form.grade : null,
      })
      setSuccess(true)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
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
      {showTerms   && <TermsAndConditions modal onClose={() => setShowTerms(false)} />}
      {showPrivacy && <PrivacyPolicy      modal onClose={() => setShowPrivacy(false)} />}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['student', 'parent'].map(r => (
          <button key={r} type="button" onClick={() => { setRole(r); if (r !== 'student') setForm(f => ({ ...f, grade: '' })) }} style={{
            flex: 1, padding: '10px 0', borderRadius: 8, border: '1.5px solid',
            borderColor: role === r ? '#6366f1' : '#e5e7eb',
            background: role === r ? '#eef2ff' : 'white',
            color: role === r ? '#4338ca' : '#6b7280',
            fontWeight: role === r ? 600 : 400,
            cursor: 'pointer', fontSize: 14, textTransform: 'capitalize',
          }}>{r}</button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <ErrorBanner message={error} />}

        <Field label="Full name" name="fullName" value={form.fullName} onChange={handleChange} required />
        <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
        <Field label="Phone (optional)" name="phone" type="tel" value={form.phone} onChange={handleChange} />

        {role === 'student' && (
          <div>
            <label style={labelStyle}>Choose your grade *</label>
            <select name="grade" value={form.grade} onChange={handleChange} required style={inputStyle}>
              <option value="" disabled>Select grade…</option>
              {GRADES.map(g => (
                <option key={g} value={g}>{g === 'R' ? 'Grade R (Reception)' : `Grade ${g}`}</option>
              ))}
            </select>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>
              You'll be reviewed for promotion to the next grade at the end of each academic year.
            </p>
          </div>
        )}

        {role === 'parent' && (
          <div>
            <label style={labelStyle}>Relationship to student</label>
            <select name="relationship" value={form.relationship} onChange={handleChange} style={inputStyle}>
              <option>Parent</option>
              <option>Guardian</option>
              <option>Grandparent</option>
              <option>Other</option>
            </select>
          </div>
        )}

        <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} required />
        <Field label="Confirm password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required />

        {/* Terms & Conditions checkbox */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 14px', background: '#f9fafb', borderRadius: 8,
          border: `1.5px solid ${acceptedTerms ? '#6366f1' : '#e5e7eb'}`,
          transition: 'border-color 0.2s',
        }}>
          <input
            type="checkbox" id="acceptTerms"
            checked={acceptedTerms}
            onChange={e => setAcceptedTerms(e.target.checked)}
            style={{ marginTop: 2, accentColor: '#6366f1', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
          />
          <label htmlFor="acceptTerms" style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, cursor: 'pointer' }}>
            I have read and agree to the{' '}
            <button type="button" onClick={() => setShowTerms(true)} style={inlineLinkBtn}>
              Terms and Conditions
            </button>
            {' '}and{' '}
            <button type="button" onClick={() => setShowPrivacy(true)} style={inlineLinkBtn}>
              Privacy Policy
            </button>
          </label>
        </div>

        <SubmitButton loading={loading}>Create account</SubmitButton>
      </form>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#6b7280' }}>
        Already have an account? <Link to="/login" style={linkStyle}>Sign in</Link>
      </p>
    </AuthShell>
  )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const linkStyle    = { color: '#6366f1', textDecoration: 'none', fontWeight: 500 }
const inlineLinkBtn = { background: 'none', border: 'none', color: '#6366f1', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0 }
const labelStyle   = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }
const inputStyle   = { width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14, border: '1.5px solid #e5e7eb', outline: 'none', boxSizing: 'border-box', color: '#111827', background: 'white' }

function Field({ label, name, type = 'text', value, onChange, required, autoComplete }) {
  return (
    <div>
      <label htmlFor={name} style={labelStyle}>{label}</label>
      <input id={name} name={name} type={type} value={value} onChange={onChange}
        required={required} autoComplete={autoComplete} style={inputStyle}
        onFocus={e => e.target.style.borderColor = '#6366f1'}
        onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
    </div>
  )
}

function ErrorBanner({ message }) {
  return (
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#b91c1c', fontSize: 14 }}>
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 16, padding: '36px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, background: '#6366f1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
