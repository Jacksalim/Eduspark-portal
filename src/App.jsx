import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { signOut } from './lib/supabase'
import Landing from './pages/Landing'
import AuthPage from './pages/AuthPage'
import LearnerPortal from './pages/LearnerPortal'
import ParentPortal from './pages/ParentPortal'
import AdminDashboard from './pages/AdminDashboard'

const PORTAL_LABELS = {
  learner: 'Learner Portal',
  parent: 'Parent Portal',
  admin: 'Tutor Dashboard',
}

export default function App() {
  const { user, profile, loading } = useAuth()
  const [view, setView] = useState('home') // home | auth | learner | parent | admin
  const [demoRole, setDemoRole] = useState(null)

  function handleEnter(role) {
    if (user && profile) {
      // Already logged in — go straight to that portal
      setView(role)
    } else {
      // Not logged in — show auth page, then redirect to this role's portal
      setDemoRole(role)
      setView('auth')
    }
  }

  async function handleSignOut() {
    await signOut()
    setView('home')
    setDemoRole(null)
  }

  // After logging in, redirect to intended portal
  useEffect(() => {
    if (user && profile && view === 'auth') {
      setView(profile.role)
    }
  }, [user, profile, view])

  const activePortal = user && profile ? profile.role : null
  const currentView = view

  // Demo profile for unauthenticated preview
  const demoProfile = demoRole ? {
    id: null, name: demoRole === 'admin' ? 'Demo Tutor' : demoRole === 'parent' ? 'Demo Parent' : 'Demo Learner',
    role: demoRole, grade: '7', email: 'demo@eduspark.co.za'
  } : null

  const effectiveProfile = profile || demoProfile

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e8edf3', borderTopColor: 'var(--teal)', animation: 'spin .75s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ color: '#aaa', fontSize: '.88rem' }}>Loading EduSpark…</span>
      </div>
    )
  }

  const showPortalNav = ['learner','parent','admin'].includes(currentView) && effectiveProfile

  return (
    <div className="app">
      {/* ── Nav ── */}
      <nav className="nav">
        <div className="nav-logo" onClick={() => setView('home')} role="button" tabIndex={0} onKeyDown={e => e.key==='Enter' && setView('home')}>
          Edu<span>Spark</span>
        </div>

        {showPortalNav && (
          <div className="nav-tabs">
            {(['learner','parent','admin']).map(r => (
              <button key={r} className={`nav-tab ${currentView === r ? 'active' : ''}`} onClick={() => setView(r)}>
                {PORTAL_LABELS[r]}
              </button>
            ))}
          </div>
        )}

        <div className="nav-right">
          {effectiveProfile && (
            <span className="nav-badge" style={{ background: currentView === 'admin' ? '#6b4fa0' : currentView === 'parent' ? 'var(--rose)' : 'var(--teal)' }}>
              {effectiveProfile.name.split(' ')[0]}
            </span>
          )}
          {user ? (
            <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign Out</button>
          ) : effectiveProfile ? (
            <button className="btn btn-ghost btn-sm" onClick={() => { setView('home'); setDemoRole(null) }}>← Home</button>
          ) : (
            <button className="btn btn-gold btn-sm" onClick={() => setView('auth')}>Sign In</button>
          )}
        </div>
      </nav>

      {/* ── Pages ── */}
      {currentView === 'home'   && <Landing onEnter={handleEnter} />}
      {currentView === 'auth'   && <AuthPage />}
      {currentView === 'learner' && effectiveProfile && <LearnerPortal profile={effectiveProfile} />}
      {currentView === 'parent'  && effectiveProfile && <ParentPortal profile={effectiveProfile} />}
      {currentView === 'admin'   && effectiveProfile && <AdminDashboard profile={effectiveProfile} />}
    </div>
  )
}
