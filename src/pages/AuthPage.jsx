import { useState } from 'react'
import { signIn, signUp } from '../lib/supabase'
import { GRADES } from '../components/ui'

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('signin') // signin | signup
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'learner', grade: '7' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        await signUp(form)
        setError('✅ Check your email to confirm your account, then sign in.')
        setMode('signin')
      } else {
        await signIn({ email: form.email, password: form.password })
        // onAuth will be triggered by AuthProvider session listener
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'var(--cream)' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: '2.4rem', marginBottom: 10 }}>🎓</div>
          <h1 style={{ fontSize: '2rem', color: 'var(--ink)' }}>EduSpark</h1>
          <p style={{ color: '#888', marginTop: 6, fontSize: '.92rem' }}>Your online tutoring portal</p>
        </div>

        {/* Card */}
        <div className="card card-pad" style={{ padding: 36 }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', background: 'var(--mist)', borderRadius: 10, padding: 4, marginBottom: 28 }}>
            {[['signin', 'Sign In'], ['signup', 'Create Account']].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: '.875rem', transition: 'all .15s',
                  background: mode === m ? '#fff' : 'transparent', color: mode === m ? 'var(--ink)' : '#999',
                  boxShadow: mode === m ? 'var(--shadow)' : 'none' }}>
                {l}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <>
                <div className="form-group">
                  <label>Full Name</label>
                  <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your full name" required />
                </div>
                <div className="form-group">
                  <label>I am a…</label>
                  <select className="form-control" value={form.role} onChange={e => set('role', e.target.value)}>
                    <option value="learner">Learner</option>
                    <option value="parent">Parent / Guardian</option>
                    <option value="admin">Tutor / Admin</option>
                  </select>
                </div>
                {form.role === 'learner' && (
                  <div className="form-group">
                    <label>Grade</label>
                    <select className="form-control" value={form.grade} onChange={e => set('grade', e.target.value)}>
                      {GRADES.map(g => <option key={g} value={g}>{g === 'R' ? 'Grade R' : `Grade ${g}`}</option>)}
                    </select>
                  </div>
                )}
              </>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <input className="form-control" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input className="form-control" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'} required minLength={6} />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '.85rem', fontWeight: 500,
                background: error.startsWith('✅') ? '#e6f5e6' : 'var(--rose-light)',
                color: error.startsWith('✅') ? '#256625' : 'var(--rose)' }}>
                {error}
              </div>
            )}

            <button className="btn btn-teal btn-full" type="submit" disabled={loading}>
              {loading ? '⏳ Please wait…' : mode === 'signup' ? 'Create Account →' : 'Sign In →'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
