import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signIn, signUp, resetPassword, supabase } from '../lib/supabase'
import { GRADES } from '../components/ui'

// ── Password strength ──────────────────────────────────────────────────────────
function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)               score += 25
  if (pw.length >= 12)              score += 10
  if (/[A-Z]/.test(pw))            score += 20
  if (/[0-9]/.test(pw))            score += 20
  if (/[^A-Za-z0-9]/.test(pw))    score += 25
  score = Math.min(score, 100)
  if (score < 30) return { score, label: 'Very Weak',  color: '#ef4444' }
  if (score < 55) return { score, label: 'Weak',       color: '#f97316' }
  if (score < 75) return { score, label: 'Good',       color: '#eab308' }
  return             { score, label: 'Strong',         color: '#22c55e' }
}

// ── EyeIcon ────────────────────────────────────────────────────────────────────
function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

// ── Left brand panel ───────────────────────────────────────────────────────────
function BrandPanel() {
  return (
    <div style={{ position: 'relative', background: 'linear-gradient(150deg, #050c0c 0%, #0a1f1f 50%, #0e3333 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(40px,6vw,72px)', overflow: 'hidden', minHeight: '100vh' }}>

      {/* Background blobs */}
      {[
        { w: 380, h: 380, top: -100, right: -80, c: 'rgba(26,107,107,.3)', dur: 16 },
        { w: 280, h: 280, bottom: -60, left: -60, c: 'rgba(201,168,76,.12)', dur: 20 },
      ].map((b, i) => (
        <motion.div key={i}
          style={{ position: 'absolute', width: b.w, height: b.h, borderRadius: '50%', background: `radial-gradient(circle, ${b.c} 0%, transparent 70%)`, filter: 'blur(50px)', top: b.top, right: b.right, bottom: b.bottom, left: b.left, pointerEvents: 'none' }}
          animate={{ scale: [1, 1.15, 0.9, 1], x: [0, 30, -15, 0], y: [0, -20, 12, 0] }}
          transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, color: '#c9a84c', marginBottom: 8 }}>
            Edu<span style={{ color: '#fff' }}>Spark</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,.45)', fontSize: '.8rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 52 }}>Online Tutoring Portal · Kenya</p>
        </motion.div>

        {/* Tagline */}
        <motion.h2 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}
          style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', color: '#fff', lineHeight: 1.2, marginBottom: 20, letterSpacing: '-0.5px' }}>
          Empower your<br />
          <span style={{ background: 'linear-gradient(90deg, #c9a84c, #f5e09a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            learning journey.
          </span>
        </motion.h2>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }}
          style={{ color: 'rgba(255,255,255,.52)', fontSize: '.95rem', lineHeight: 1.8, marginBottom: 52, maxWidth: 380 }}>
          Join thousands of learners, parents, and tutors across Kenya using AI-powered education every day.
        </motion.p>

        {/* Feature highlights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {[
            { icon: '🤖', title: 'AI Quiz Generation', desc: 'Unique questions every time' },
            { icon: '📊', title: 'Progress Tracking',   desc: 'Real-time visual analytics' },
            { icon: '👨‍👩‍👧', title: 'Parent Monitoring', desc: 'Stay informed, always' },
          ].map((f, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.12, duration: 0.5 }}
              style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                {f.icon}
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '.9rem' }}>{f.title}</div>
                <div style={{ color: 'rgba(255,255,255,.42)', fontSize: '.8rem' }}>{f.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Testimonial quote */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          style={{ marginTop: 56, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: '20px 22px' }}>
          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: '.88rem', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 14 }}>
            "EduSpark turned my daughter from a reluctant learner to someone who actually asks to do quizzes."
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 700, color: '#fff' }}>DK</div>
            <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '.78rem' }}>David K. — Parent · Mombasa</div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ── Input ──────────────────────────────────────────────────────────────────────
function Input({ label, type = 'text', value, onChange, placeholder, required, minLength, autoFocus, rightEl, hint }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: '.82rem', color: '#444', marginBottom: 7, letterSpacing: '0.2px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          autoFocus={autoFocus}
          style={{ width: '100%', padding: rightEl ? '12px 44px 12px 16px' : '12px 16px', borderRadius: 12, border: '1.5px solid #e5e9f0', fontSize: '.92rem', fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#1a2332', background: '#fafbfd', transition: 'border-color .2s', boxSizing: 'border-box' }}
          onFocus={e  => e.target.style.borderColor = '#1a6b6b'}
          onBlur={e   => e.target.style.borderColor = '#e5e9f0'}
        />
        {rightEl && (
          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
            {rightEl}
          </div>
        )}
      </div>
      {hint && <div style={{ fontSize: '.76rem', color: '#aaa', marginTop: 5 }}>{hint}</div>}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode]       = useState('signin')   // signin | signup | forgot
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState({ text: '', type: '' })

  // form fields
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [name,     setName]     = useState('')
  const [role,     setRole]     = useState('learner')
  const [grade,    setGrade]    = useState('7')
  const [showPw,   setShowPw]   = useState(false)
  const [showCPw,  setShowCPw]  = useState(false)
  const [remember, setRemember] = useState(false)

  const strength = passwordStrength(password)
  const showMsg  = (text, type = 'error') => setMsg({ text, type })
  // switchTo clears message; switchToKeepMsg preserves it (used after signup success)
  const switchTo        = m => { setMode(m); setMsg({ text: '', type: '' }) }
  const switchToKeepMsg = m => setMode(m)

  async function handleSubmit(e) {
    e.preventDefault()
    setMsg({ text: '', type: '' })
    setLoading(true)

    try {
      // ── Forgot password ───────────────────────────────────────────────
      if (mode === 'forgot') {
        if (!email.trim()) { showMsg('Please enter your email address.'); return }
        await resetPassword(email.trim())
        showMsg('📧 Reset link sent! Check your inbox and follow the link.', 'success')
        return
      }

      // ── Sign up ───────────────────────────────────────────────────────
      if (mode === 'signup') {
        if (!name.trim())         { showMsg('Please enter your full name.'); return }
        if (!email.trim())        { showMsg('Please enter your email address.'); return }
        if (password.length < 6)  { showMsg('Password must be at least 6 characters.'); return }
        if (password !== confirm)  { showMsg('Passwords do not match — please re-enter.'); return }
        await signUp({ email: email.trim(), password, name: name.trim(), role, grade: role === 'learner' ? grade : null })
        // Switch to sign-in but KEEP the success message visible
        showMsg('✅ Account created! Check your email to confirm, then sign in.', 'success')
        switchToKeepMsg('signin')
        return
      }

      // ── Sign in ───────────────────────────────────────────────────────
      showMsg('Signing you in…', 'info')
      try {
        await signIn({ email: email.trim(), password })
        showMsg('✅ Signed in! Loading your dashboard…', 'success')
        // useAuth's onAuthStateChange fires → loads profile → App.jsx redirects automatically
      } catch (signInErr) {
        const msg = signInErr.message || ''
        if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
          showMsg('❌ Wrong email or password. Please try again.')
        } else if (msg.includes('Email not confirmed')) {
          showMsg('📧 Please confirm your email first — check your inbox (including spam).')
        } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
          showMsg('❌ Cannot connect to the server. Check your internet connection.')
        } else {
          showMsg('❌ ' + msg || 'Sign in failed. Please try again.')
        }
      }
    } catch (err) {
      // Catches signup / forgot errors thrown from supabase helpers
      const msg = err.message || ''
      if (msg.includes('already registered') || msg.includes('User already registered')) {
        showMsg('❌ An account with this email already exists. Try signing in instead.')
      } else if (msg.includes('fetch') || msg.includes('Failed to fetch')) {
        showMsg('❌ Cannot connect to the server. Check your internet connection.')
      } else {
        showMsg('❌ ' + (msg || 'Something went wrong. Please try again.'))
      }
    } finally {
      setLoading(false)
    }
  }

  const msgStyle = {
    error:   { bg: '#fff0f0', color: '#c0392b', border: '#fbc9c9' },
    success: { bg: '#f0fbf5', color: '#1e7a4a', border: '#a8e6c3' },
    info:    { bg: '#f0f6ff', color: '#1a5fbf', border: '#bdd6ff' },
  }[msg.type] || { bg: '#fff0f0', color: '#c0392b', border: '#fbc9c9' }

  const ROLES = [
    { key: 'learner', icon: '🎓', label: 'Learner',        desc: 'I want to learn' },
    { key: 'parent',  icon: '👨‍👩‍👧', label: 'Parent',         desc: 'Monitor my child' },
    { key: 'admin',   icon: '🖥️', label: 'Tutor / Admin',  desc: 'Manage learners' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fafbfd' }}>

      {/* ── Left brand panel (desktop only) ──────────────────────────── */}
      <div className="auth-left" style={{ flex: '0 0 44%', maxWidth: 520 }}>
        <BrandPanel />
      </div>

      {/* ── Right form panel ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(32px,5vw,60px) clamp(20px,5vw,56px)', overflowY: 'auto', minHeight: '100vh' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* Mobile-only logo */}
          <div className="auth-mobile-logo" style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', fontWeight: 900, color: '#c9a84c', marginBottom: 6 }}>
              Edu<span style={{ color: '#0a1f1f' }}>Spark</span>
            </div>
            <p style={{ color: '#aaa', fontSize: '.82rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Online Tutoring Portal</p>
          </div>

          {/* Mode tabs (signin / signup) */}
          {mode !== 'forgot' && (
            <div style={{ display: 'flex', background: '#f0f3f7', borderRadius: 14, padding: 5, marginBottom: 32, gap: 4 }}>
              {[['signin','Sign In'],['signup','Create Account']].map(([m, l]) => (
                <button key={m} onClick={() => switchTo(m)}
                  style={{ flex: 1, padding: '11px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: '.87rem', transition: 'all .18s',
                    background: mode === m ? '#fff' : 'transparent',
                    color:      mode === m ? '#1a2332' : '#aaa',
                    boxShadow:  mode === m ? '0 2px 10px rgba(0,0,0,.08)' : 'none' }}>
                  {l}
                </button>
              ))}
            </div>
          )}

          {/* Forgot header */}
          {mode === 'forgot' && (
            <div style={{ marginBottom: 28 }}>
              <button onClick={() => switchTo('signin')}
                style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: '.85rem', fontWeight: 600, padding: 0, fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
                ← Back to Sign In
              </button>
              <h2 style={{ fontSize: '1.4rem', fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>Reset your password</h2>
              <p style={{ color: '#888', fontSize: '.88rem', lineHeight: 1.7 }}>
                Enter your email and we'll send you a link to set a new password.
              </p>
            </div>
          )}

          {/* ── Form content with animation ─────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.form key={mode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28 }}
              onSubmit={handleSubmit}
              style={{ width: '100%' }}>

              {/* ── Sign-up extra fields ── */}
              {mode === 'signup' && (
                <>
                  <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required autoFocus />

                  {/* Role selector */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '.82rem', color: '#444', marginBottom: 9, letterSpacing: '0.2px' }}>I am a…</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {ROLES.map(r => (
                        <button key={r.key} type="button" onClick={() => setRole(r.key)}
                          style={{ padding: '12px 8px', borderRadius: 12, border: '2px solid', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", textAlign: 'center', transition: 'all .18s',
                            borderColor: role === r.key ? '#1a6b6b' : '#e5e9f0',
                            background:  role === r.key ? '#e6f4f4' : '#fafbfd',
                            color:       role === r.key ? '#1a6b6b' : '#888' }}>
                          <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{r.icon}</div>
                          <div style={{ fontWeight: 700, fontSize: '.76rem' }}>{r.label}</div>
                          <div style={{ fontSize: '.68rem', color: role === r.key ? '#2d8a8a' : '#bbb', marginTop: 2 }}>{r.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grade (learner only) */}
                  {role === 'learner' && (
                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '.82rem', color: '#444', marginBottom: 7 }}>Grade</label>
                      <select value={grade} onChange={e => setGrade(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #e5e9f0', fontSize: '.92rem', fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#1a2332', background: '#fafbfd', cursor: 'pointer' }}
                        onFocus={e => e.target.style.borderColor = '#1a6b6b'}
                        onBlur={e  => e.target.style.borderColor = '#e5e9f0'}>
                        {GRADES.map(g => <option key={g} value={g}>{g === 'R' ? 'Grade R' : `Grade ${g}`}</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* ── Email ── */}
              <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required autoFocus={mode === 'signin' || mode === 'forgot'} />

              {/* ── Password fields ── */}
              {mode !== 'forgot' && (
                <>
                  <Input label={mode === 'signin' ? 'Password' : 'Password'}
                    type={showPw ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'}
                    required minLength={6}
                    rightEl={
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: 2, display: 'flex', alignItems: 'center' }}>
                        <EyeIcon open={showPw} />
                      </button>
                    }
                  />

                  {/* Password strength bar (signup only) */}
                  {mode === 'signup' && password.length > 0 && (
                    <div style={{ marginTop: -10, marginBottom: 18 }}>
                      <div style={{ height: 4, background: '#eee', borderRadius: 4, overflow: 'hidden', marginBottom: 5 }}>
                        <motion.div
                          animate={{ width: `${strength.score}%` }}
                          transition={{ duration: 0.3 }}
                          style={{ height: '100%', background: strength.color, borderRadius: 4 }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '.73rem', color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                        <span style={{ fontSize: '.73rem', color: '#ccc' }}>Use 12+ chars, uppercase, numbers & symbols</span>
                      </div>
                    </div>
                  )}

                  {/* Confirm password (signup only) */}
                  {mode === 'signup' && (
                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '.82rem', color: '#444', marginBottom: 7 }}>Confirm Password</label>
                      <div style={{ position: 'relative' }}>
                        <input type={showCPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                          placeholder="Repeat password" required minLength={6}
                          style={{ width: '100%', padding: '12px 44px 12px 16px', borderRadius: 12, border: '1.5px solid', fontSize: '.92rem', fontFamily: "'DM Sans',sans-serif", outline: 'none', color: '#1a2332', background: '#fafbfd', transition: 'border-color .2s', boxSizing: 'border-box',
                            borderColor: confirm.length > 0 ? (confirm === password ? '#22c55e' : '#ef4444') : '#e5e9f0' }}
                          onFocus={e => { if (!confirm.length) e.target.style.borderColor = '#1a6b6b' }}
                          onBlur={e  => { if (!confirm.length) e.target.style.borderColor = '#e5e9f0' }} />
                        <button type="button" onClick={() => setShowCPw(!showCPw)}
                          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: 2, display: 'flex', alignItems: 'center' }}>
                          <EyeIcon open={showCPw} />
                        </button>
                      </div>
                      {confirm.length > 0 && (
                        <div style={{ fontSize: '.76rem', marginTop: 5, fontWeight: 600, color: confirm === password ? '#22c55e' : '#ef4444' }}>
                          {confirm === password ? '✓ Passwords match' : '✗ Passwords do not match'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Remember me + Forgot (sign-in only) */}
                  {mode === 'signin' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: -4 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.84rem', color: '#666' }}>
                        <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                          style={{ accentColor: '#1a6b6b', width: 15, height: 15, cursor: 'pointer' }} />
                        Remember me
                      </label>
                      <button type="button" onClick={() => switchTo('forgot')}
                        style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: '.84rem', fontWeight: 600, padding: 0, fontFamily: "'DM Sans',sans-serif" }}>
                        Forgot password?
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ── Message banner ── */}
              {msg.text && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 18, fontSize: '.85rem', fontWeight: 500, background: msgStyle.bg, color: msgStyle.color, border: `1px solid ${msgStyle.border}`, lineHeight: 1.5 }}>
                  {msg.text}
                </motion.div>
              )}

              {/* ── Submit button ── */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { scale: 1.02, boxShadow: '0 6px 24px rgba(26,107,107,.35)' } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: '1rem', transition: 'opacity .2s',
                  background: loading ? '#a0c8c8' : 'linear-gradient(135deg, #1a6b6b, #145555)',
                  color: '#fff', opacity: loading ? 0.8 : 1 }}>
                {loading ? '⏳ Please wait…'
                  : mode === 'signup' ? 'Create Account →'
                  : mode === 'forgot'  ? 'Send Reset Link →'
                  : 'Sign In →'}
              </motion.button>

              {/* ── Sign up/in toggle ── */}
              {mode === 'signin' && (
                <p style={{ textAlign: 'center', marginTop: 20, color: '#888', fontSize: '.88rem' }}>
                  Don't have an account?{' '}
                  <button type="button" onClick={() => switchTo('signup')}
                    style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontWeight: 700, fontFamily: "'DM Sans',sans-serif", fontSize: '.88rem', padding: 0 }}>
                    Create one free →
                  </button>
                </p>
              )}
              {mode === 'signup' && (
                <p style={{ textAlign: 'center', marginTop: 20, color: '#888', fontSize: '.88rem' }}>
                  Already have an account?{' '}
                  <button type="button" onClick={() => switchTo('signin')}
                    style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontWeight: 700, fontFamily: "'DM Sans',sans-serif", fontSize: '.88rem', padding: 0 }}>
                    Sign in →
                  </button>
                </p>
              )}

              <p style={{ textAlign: 'center', marginTop: 24, color: '#c8c8c8', fontSize: '.75rem', lineHeight: 1.65 }}>
                By continuing you agree to EduSpark's Terms of Service and Privacy Policy.
              </p>

            </motion.form>
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .auth-left { display: none !important; }
          .auth-mobile-logo { display: block !important; }
        }
        @media (min-width: 821px) {
          .auth-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  )
}
