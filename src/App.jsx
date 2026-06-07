import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { signOut } from './lib/supabase'
import Landing from './pages/Landing'
import AuthPage from './pages/AuthPage'
import LearnerPortal from './pages/LearnerPortal'
import ParentPortal from './pages/ParentPortal'
import AdminDashboard from './pages/AdminDashboard'
import PasswordResetPage from './pages/PasswordResetPage'

function getAllowedPortals(role) {
  if (role === 'admin')  return ['learner', 'parent', 'admin']
  if (role === 'parent') return ['parent']
  return ['learner']
}

const PORTAL_LABELS = {
  learner: 'Learner Portal',
  parent:  'Parent Portal',
  admin:   'Tutor Dashboard',
}

const PORTAL_COLORS = {
  learner: 'var(--teal)',
  parent:  'var(--rose)',
  admin:   '#6b4fa0',
}

export default function App() {
  const { user, profile, loading, profileError, isPasswordRecovery, justConfirmed, setJustConfirmed } = useAuth()
  const [view, setView] = useState('home')
  const [showConfirmedBanner, setShowConfirmedBanner] = useState(false)

  // Auto-redirect when session/profile loads
  useEffect(() => {
    if (loading) return
    if (user && profile) {
      if (view === 'home' || view === 'auth') {
        setView(profile.role)
      }
    } else if (!user) {
      if (['learner', 'parent', 'admin'].includes(view)) {
        setView('home')
      }
    }
  }, [user, profile, loading])

  // Block access to portals the user's role doesn't allow
  useEffect(() => {
    if (!profile) return
    const allowed = getAllowedPortals(profile.role)
    if (['learner', 'parent', 'admin'].includes(view) && !allowed.includes(view)) {
      setView(profile.role)
    }
  }, [view, profile])

  // Show welcome banner when email just confirmed
  useEffect(() => {
    if (justConfirmed && profile) {
      setShowConfirmedBanner(true)
      setJustConfirmed(false)
      setTimeout(() => setShowConfirmedBanner(false), 5000)
    }
  }, [justConfirmed, profile])

  function handleGetStarted() {
    if (user && profile) setView(profile.role)
    else setView('auth')
  }

  function handleSignIn() {
    if (user && profile) setView(profile.role)
    else setView('auth')
  }

  async function handleSignOut() {
    await signOut()
    setView('home')
  }

  // ── Password recovery — show before everything else ──────────────────────
  if (isPasswordRecovery) {
    return (
      <div className="app">
        <nav className="nav">
          <div className="nav-logo" style={{ cursor: 'default' }}>
            Edu<span>Spark</span>
          </div>
        </nav>
        <PasswordResetPage />
      </div>
    )
  }

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cream)', gap: 20 }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', fontWeight: 900, color: '#c9a84c' }}>
          Edu<span style={{ color: 'var(--ink)' }}>Spark</span>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e8edf3', borderTopColor: 'var(--teal)', animation: 'spin .75s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ color: '#aaa', fontSize: '.85rem' }}>Loading your dashboard…</span>
      </div>
    )
  }

  // ── Incomplete profile error ───────────────────────────────────────────────
  if (user && profileError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--cream)', gap: 20, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.6rem' }}>Account Setup Incomplete</h2>
        <p style={{ color: '#666', maxWidth: 400, lineHeight: 1.75 }}>
          Your account exists but your profile could not be found. Please contact support at{' '}
          <a href="mailto:eduspark.portal@gmail.com" style={{ color: 'var(--teal)' }}>eduspark.portal@gmail.com</a>
        </p>
        <button className="btn btn-ghost" onClick={handleSignOut}>Sign Out</button>
      </div>
    )
  }

  const allowedPortals = profile ? getAllowedPortals(profile.role) : []
  const showPortalNav  = ['learner', 'parent', 'admin'].includes(view) && profile && allowedPortals.length > 1
  const activeColor    = PORTAL_COLORS[view] || 'var(--teal)'

  return (
    <div className="app">

      {/* ── Email confirmed banner ────────────────────────────────────────── */}
      {showConfirmedBanner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 600,
          background: 'linear-gradient(90deg, #1a6b6b, #155858)',
          color: '#fff', padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          fontSize: '.92rem', fontWeight: 500, boxShadow: '0 2px 12px rgba(0,0,0,.2)',
          animation: 'slideDown .3s ease',
        }}>
          <style>{`@keyframes slideDown { from { transform: translateY(-100%); opacity:0; } to { transform: translateY(0); opacity:1; } }`}</style>
          <span style={{ fontSize: '1.1rem' }}>🎉</span>
          <span>Email confirmed — welcome to EduSpark, <strong>{profile?.name?.split(' ')[0]}</strong>!</span>
          <button onClick={() => setShowConfirmedBanner(false)}
            style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '.8rem', marginLeft: 8 }}>
            ✕
          </button>
        </div>
      )}

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav className="nav" style={{ marginTop: showConfirmedBanner ? 48 : 0, transition: 'margin-top .3s' }}>
        <div className="nav-logo"
          onClick={() => user && profile ? setView(profile.role) : setView('home')}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && (user && profile ? setView(profile.role) : setView('home'))}>
          Edu<span>Spark</span>
        </div>

        {/* Landing scroll links — only when not logged in on home page */}
        {view === 'home' && !user && (
          <div className="nav-tabs">
            {[['home','Home'],['features','Features'],['about','About'],['contact','Contact']].map(([id, label]) => (
              <button key={id} className="nav-tab"
                onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Portal tabs — only when logged in */}
        {showPortalNav && (
          <div className="nav-tabs">
            {allowedPortals.map(r => (
              <button key={r} className={`nav-tab ${view === r ? 'active' : ''}`} onClick={() => setView(r)}>
                {PORTAL_LABELS[r]}
              </button>
            ))}
          </div>
        )}

        {/* Right side */}
        <div className="nav-right">
          {profile && (
            <span className="nav-badge" style={{ background: activeColor }}>
              {profile.name.split(' ')[0]}
            </span>
          )}
          {user ? (
            <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign Out</button>
          ) : view === 'auth' ? (
            <button className="btn btn-ghost btn-sm" onClick={() => setView('home')}>← Back</button>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" onClick={handleSignIn}>Sign In</button>
              <button className="btn btn-gold btn-sm" onClick={handleGetStarted}>Get Started</button>
            </>
          )}
        </div>
      </nav>

      {/* ── PAGES ────────────────────────────────────────────────────────── */}
      {view === 'home' && !user && (
        <Landing onGetStarted={handleGetStarted} onSignIn={handleSignIn} />
      )}
      {view === 'auth' && !user && <AuthPage />}
      {view === 'learner' && profile && (profile.role === 'learner' || profile.role === 'admin') && (
        <LearnerPortal profile={profile} />
      )}
      {view === 'parent' && profile && (profile.role === 'parent' || profile.role === 'admin') && (
        <ParentPortal profile={profile} />
      )}
      {view === 'admin' && profile && profile.role === 'admin' && (
        <AdminDashboard profile={profile} />
      )}
    </div>
  )
}
