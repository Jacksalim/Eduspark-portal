// src/pages/AccessDeniedPage.jsx
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../lib/supabase'

export default function AccessDeniedPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { role }  = useAuth()

  const dashboards = {
    admin:   ['/admin',   'Admin Dashboard'],
    tutor:   ['/tutor',   'Tutor Dashboard'],
    parent:  ['/parent',  'Parent Dashboard'],
    student: ['/student', 'Student Dashboard'],
  }

  const [dashPath, dashLabel] = dashboards[role] ?? ['/student', 'Dashboard']

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f9fafb', padding: 24,
    }}>
      <div style={{
        maxWidth: 480, width: '100%', background: 'white', borderRadius: 16,
        padding: '48px 36px', textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
      }}>
        <div style={{
          width: 72, height: 72, background: '#fef2f2', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
            <path d="M15 9l-6 6M9 9l6 6" stroke="#ef4444" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
          Access denied
        </h1>

        <p style={{ color: '#6b7280', fontSize: 15, marginBottom: 6, lineHeight: 1.6 }}>
          You don't have permission to view this page.
        </p>

        {role && (
          <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 28 }}>
            Your current role: <strong style={{ color: '#6b7280', textTransform: 'capitalize' }}>{role}</strong>
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => navigate(dashPath)} style={{
            padding: '11px 24px', background: '#6366f1', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
            cursor: 'pointer',
          }}>
            Go to my {dashLabel}
          </button>

          <button onClick={() => navigate(-1)} style={{
            padding: '11px 24px', background: '#f3f4f6', color: '#374151',
            border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer',
          }}>
            Go back
          </button>

          <button onClick={async () => { await signOut(); navigate('/login') }} style={{
            padding: '11px 24px', background: 'transparent', color: '#9ca3af',
            border: 'none', fontSize: 13, cursor: 'pointer',
          }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

// src/pages/ForgotPasswordPage.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { resetPassword } from '../lib/supabase'

export function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div style={shellStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✉️</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
              Check your inbox
            </h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
              If <strong>{email}</strong> has an account, you'll receive a reset link shortly.
            </p>
            <Link to="/login" style={{
              display: 'inline-block', padding: '10px 24px', background: '#6366f1',
              color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600,
            }}>
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={shellStyle}>
      <div style={cardStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 6, textAlign: 'center' }}>
          Reset your password
        </h2>
        <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
          Enter your email and we'll send you a reset link.
        </p>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
            padding: '10px 14px', color: '#b91c1c', fontSize: 14, marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
              Email address
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="you@example.com"
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14,
                border: '1.5px solid #e5e7eb', outline: 'none', boxSizing: 'border-box',
              }} />
          </div>

          <button type="submit" disabled={loading} style={{
            padding: '11px 0', background: loading ? '#a5b4fc' : '#6366f1', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#6b7280' }}>
          <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

const shellStyle = {
  minHeight: '100vh', display: 'flex', alignItems: 'center',
  justifyContent: 'center', background: '#f9fafb', padding: 16,
}

const cardStyle = {
  width: '100%', maxWidth: 420, background: 'white', borderRadius: 16,
  padding: '36px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
}
