import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updatePassword, signOut } from '../lib/supabase'

export default function PasswordResetPage() {
  const navigate              = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      await updatePassword(password)
      setDone(true)
      setTimeout(async () => {
        await signOut()
        navigate('/login', { replace: true })
      }, 3000)
    } catch (err) {
      setError('❌ ' + (err.message || 'Could not update password. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, background: '#6366f1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>EduSpark</span>
          </div>
          <p style={{ color: '#6b7280', marginTop: 6, fontSize: '.92rem' }}>Set your new password</p>
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: '36px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: '1.3rem', marginBottom: 10, color: '#111827' }}>Password updated!</h2>
              <p style={{ color: '#6b7280', fontSize: '.9rem', lineHeight: 1.7 }}>
                Your password has been changed successfully.<br />
                Signing you out so you can log in with your new password…
              </p>
            </div>
          ) : (
            <>
              <p style={{ color: '#6b7280', fontSize: '.88rem', lineHeight: 1.65, marginBottom: 24 }}>
                Choose a strong password of at least 6 characters.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    autoFocus
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14, border: '1.5px solid #e5e7eb', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your new password"
                    required
                    minLength={6}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14, border: '1.5px solid #e5e7eb', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {confirm.length > 0 && (
                  <div style={{ fontSize: '.8rem', fontWeight: 600, marginTop: -6, color: password === confirm ? '#16a34a' : '#ef4444' }}>
                    {password === confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                )}

                {error && (
                  <div style={{ padding: '11px 14px', borderRadius: 8, fontSize: '.85rem', fontWeight: 500, background: '#fef2f2', color: '#b91c1c' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || password !== confirm || password.length < 6}
                  style={{
                    width: '100%', padding: '11px 0', borderRadius: 8, border: 'none',
                    background: (loading || password !== confirm || password.length < 6) ? '#a5b4fc' : '#6366f1',
                    color: 'white', fontSize: 15, fontWeight: 600,
                    cursor: (loading || password !== confirm || password.length < 6) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Updating…' : 'Set New Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
