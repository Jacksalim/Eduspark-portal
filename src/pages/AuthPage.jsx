import { useState } from 'react'
import { signIn, signUp, supabase } from '../lib/supabase'
import { GRADES } from '../components/ui'

export default function AuthPage() {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'learner', grade: '7' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const showMsg = (text, type = 'error') => setMessage({ text, type })

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage({ text: '', type: '' })
    setLoading(true)

    try {
      if (mode === 'signup') {
        await signUp(form)
        showMsg('✅ Account created! Check your email to confirm, then sign in.', 'success')
        setMode('signin')

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
          <div style={{ display: 'flex', background: 'var(--mist)', borderRadius: 10, padding: 4, marginBottom: 28 }}>
            {[['signin', 'Sign In'], ['signup', 'Create Account']].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setMessage({ text: '', type: '' }) }}
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
              <input className="form-control" type="email" value={form.email}
                onChange={e => set('email', e.target.value)} placeholder="you@email.com" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input className="form-control" type="password" value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'} required minLength={6} />
            </div>

            {message.text && (
              <div style={{ padding: '11px 14px', borderRadius: 8, marginBottom: 16, fontSize: '.85rem', fontWeight: 500, background: mc.bg, color: mc.color }}>
                {message.text}
              </div>
            )}

            <button className="btn btn-teal btn-full" type="submit" disabled={loading}>
              {loading ? '⏳ Please wait…' : mode === 'signup' ? 'Create Account →' : 'Sign In →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, color: '#999', fontSize: '.82rem' }}>
          Demo: skip login by clicking the portal cards on the home page.
        </p>
      </div>
    </div>
  )
}