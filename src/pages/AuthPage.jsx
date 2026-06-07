import { useState } from 'react'
import { signIn, signUp, resetPassword, supabase } from '../lib/supabase'
import { GRADES } from '../components/ui'

export default function AuthPage() {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'learner', grade: '7' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const showMsg = (text, type = 'error') => setMessage({ text, type })
  const switchMode = (m) => { setMode(m); setMessage({ text: '', type: '' }) }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage({ text: '', type: '' })
    setLoading(true)

    try {
      if (mode === 'forgot') {
        if (!form.email) { showMsg('Please enter your email address.'); return }
        await resetPassword(form.email)
        showMsg('📧 Reset link sent! Check your inbox and follow the link to set a new password.', 'success')
        return
      }

      if (mode === 'signup') {
        await signUp(form)
        showMsg('✅ Account created! Check your email to confirm, then sign in.', 'success')
        switchMode('signin')

      } else {
        showMsg('Signing you in…', 'info')
        const { data, error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        })

        if (error) {
          if (error.message.includes('Invalid login')) {
            showMsg('❌ Wrong email or password. Please try again.')
          } else if (error.message.includes('Email not confirmed')) {
            showMsg('📧 Please confirm your email first — check your inbox.')
          } else if (error.message.includes('fetch')) {
            showMsg('❌ Cannot connect to server. Check your internet connection.')
          } else {
            showMsg('❌ ' + error.message)
          }
          return
        }

        if (data?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

          if (profileError || !profile) {
            await supabase.from('profiles').insert({
              id: data.user.id,
              email: data.user.email,
              name: data.user.user_metadata?.name || data.user.email.split('@')[0],
              role: data.user.user_metadata?.role || 'learner',
              grade: data.user.user_metadata?.grade || null,
            })
          }

          showMsg('✅ Signed in! Loading your dashboard…', 'success')
        }
      }
    } catch (err) {
      showMsg('❌ ' + (err.message || 'Something went wrong. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const msgColors = {
    error:   { bg: 'var(--rose-light)', color: 'var(--rose)' },
    success: { bg: '#e6f5e6', color: '#256625' },
    info:    { bg: '#e0eeff', color: '#1a5fbf' },
  }
  const mc = msgColors[message.type] || msgColors.error

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'var(--cream)' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: '2.4rem', marginBottom: 10 }}>🎓</div>
          <h1 style={{ fontSize: '2rem', color: 'var(--ink)' }}>EduSpark</h1>
          <p style={{ color: '#888', marginTop: 6, fontSize: '.92rem' }}>Your online tutoring portal</p>
        </div>

        <div className="card card-pad" style={{ padding: 36 }}>

          {/* ── Mode tabs (hidden on forgot screen) ── */}
          {mode !== 'forgot' && (
            <div style={{ display: 'flex', background: 'var(--mist)', borderRadius: 10, padding: 4, marginBottom: 28 }}>
              {[['signin', 'Sign In'], ['signup', 'Create Account']].map(([m, l]) => (
                <button key={m} onClick={() => switchMode(m)}
                  style={{
                    flex: 1, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: '.875rem', transition: 'all .15s',
                    background: mode === m ? '#fff' : 'transparent',
                    color: mode === m ? 'var(--ink)' : '#999',
                    boxShadow: mode === m ? 'var(--shadow)' : 'none'
                  }}>
                  {l}
                </button>
              ))}
            </div>
          )}

          {/* ── Forgot password header ── */}
          {mode === 'forgot' && (
            <div style={{ marginBottom: 24 }}>
              <button onClick={() => switchMode('signin')}
                style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: '.875rem', fontWeight: 600, padding: 0, fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                ← Back to Sign In
              </button>
              <h2 style={{ fontSize: '1.3rem', marginBottom: 6 }}>Reset your password</h2>
              <p style={{ color: '#888', fontSize: '.875rem', lineHeight: 1.6 }}>
                Enter your email address and we'll send you a link to set a new password.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* ── Sign up extra fields ── */}
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

            {/* ── Email ── */}
            <div className="form-group">
              <label>Email Address</label>
              <input className="form-control" type="email" value={form.email}
                onChange={e => set('email', e.target.value)} placeholder="you@email.com" required />
            </div>

            {/* ── Password (hidden on forgot screen) ── */}
            {mode !== 'forgot' && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ margin: 0 }}>Password</label>
                  {mode === 'signin' && (
                    <button type="button" onClick={() => switchMode('forgot')}
                      style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600, padding: 0, fontFamily: "'DM Sans',sans-serif" }}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <input className="form-control" type="password" value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'} required minLength={6} />
              </div>
            )}

            {/* ── Message banner ── */}
            {message.text && (
              <div style={{ padding: '11px 14px', borderRadius: 8, marginBottom: 16, fontSize: '.85rem', fontWeight: 500, background: mc.bg, color: mc.color }}>
                {message.text}
              </div>
            )}

            <button className="btn btn-teal btn-full" type="submit" disabled={loading}>
              {loading ? '⏳ Please wait…'
                : mode === 'signup' ? 'Create Account →'
                : mode === 'forgot'  ? 'Send Reset Link →'
                : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
