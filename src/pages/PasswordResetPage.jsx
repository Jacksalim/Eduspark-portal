import { useState } from 'react'
import { updatePassword, signOut } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function PasswordResetPage() {
  const { setIsPasswordRecovery } = useAuth()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState('')

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
        setIsPasswordRecovery(false)
      }, 3000)
    } catch (err) {
      setError('❌ ' + (err.message || 'Could not update password. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'var(--cream)', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: '2.4rem', marginBottom: 10 }}>🔐</div>
          <h1 style={{ fontSize: '2rem', color: 'var(--ink)' }}>EduSpark</h1>
          <p style={{ color: '#888', marginTop: 6, fontSize: '.92rem' }}>Set your new password</p>
        </div>

        <div className="card card-pad" style={{ padding: 36 }}>

          {done ? (
            /* ── Success state ── */
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: '1.3rem', marginBottom: 10 }}>Password updated!</h2>
              <p style={{ color: '#777', fontSize: '.9rem', lineHeight: 1.7 }}>
                Your password has been changed successfully.<br />
                Signing you out so you can log in with your new password…
              </p>
              <div style={{ marginTop: 20 }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </div>
            </div>
          ) : (
            /* ── Form ── */
            <>
              <p style={{ color: '#666', fontSize: '.88rem', lineHeight: 1.65, marginBottom: 24 }}>
                Choose a strong password of at least 6 characters.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    className="form-control"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    className="form-control"
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your new password"
                    required
                    minLength={6}
                  />
                </div>

                {/* Password match indicator */}
                {confirm.length > 0 && (
                  <div style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: 14, marginTop: -8,
                    color: password === confirm ? '#256625' : 'var(--rose)' }}>
                    {password === confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                )}

                {error && (
                  <div style={{ padding: '11px 14px', borderRadius: 8, marginBottom: 16, fontSize: '.85rem', fontWeight: 500, background: 'var(--rose-light)', color: 'var(--rose)' }}>
                    {error}
                  </div>
                )}

                <button className="btn btn-teal btn-full" type="submit" disabled={loading || password !== confirm || password.length < 6}>
                  {loading ? '⏳ Updating…' : 'Set New Password →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
