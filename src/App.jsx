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
  const [view, setView] = useState('home')
  const [demoRole, setDemoRole] = useState(null)

  // Watch for profile loading and redirect automatically
  useEffect(() => {
    if (user && profile) {
      if (view === 'auth' || view === 'home') {
        setView(profile.role)
      }
    }
  }, [user, profile])

  // Block access if user tries to visit a portal they don't have permission for
  useEffect(() => {
    if (!profile) return
    const allowed = getAllowedPortals(profile.role)
    if (['learner','parent','admin'].includes(view) && !allowed.includes(view)) {
      setView(profile.role) // redirect back to their own portal
    }
  }, [view, profile])

  function getAllowedPortals(role) {
    if (role === 'admin') return ['learner', 'parent', 'admin']
    if (role === 'parent') return ['parent']
    return ['learner']
  }

  function handleEnter(role) {
    if (user && profile) {
      const allowed = getAllowedPortals(profile.role)
      if (allowed.includes(role)) setView(role)
      else setView(profile.role)
    } else {
      setDemoRole(role)
      setView('auth')
    }
  }

  async function handleSignOut() {
    await signOut()
    setView('home')
    setDemoRole(null)
  }

  const demoProfile = demoRole ? {
    id: null,
    name: demoRole === 'admin' ? 'Demo Tutor' : demoRole === 'parent' ? 'Demo Parent' : 'Demo Learner',
    role: demoRole,
    grade: '7',
    email: 'demo@eduspark.co.za'
  } : null

  const effectiveProfile = profile || demoProfile
  const currentView = view
  const allowedPortals = effectiveProfile ? getAllowedPortals(effectiveProfile.role) : []
  const showPortalNav = ['learner','parent','admin'].includes(currentView) && effectiveProfile && allowedPortals.length > 1

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e8edf3', borderTopColor: 'var(--teal)', animation: 'spin .75s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ color: '#aaa', fontSize: '.88rem' }}>Loading EduSpark…</span>
      </div>
    )
  }

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-logo" onClick={() => setView('home')} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setView('home')}>
          Edu<span>Spark</span>
        </div>

        {/* Only show tabs the user is allowed to access */}
        {showPortalNav && (
          <div className="nav-tabs">
            {allowedPortals.map(r => (
              <button key={r} className={`nav-tab ${currentView === r ? 'active' : ''}`} onClick={() => setView(r)}>
                {PORTAL_LABELS[r]}
              </button>
            ))}
          </div>
        )}

        <div className="nav-right">
          {effectiveProfile && (
            <span className="nav-badge" style={{
              background: currentView === 'admin' ? '#6b4fa0' : currentView === 'parent' ? 'var(--rose)' : 'var(--teal)'
            }}>
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

      {/* Gate each portal behind a role check */}
      {currentView === 'home' && <Landing onEnter={handleEnter} />}
      {currentView === 'auth' && <AuthPage />}
      {currentView === 'learner' && effectiveProfile && (effectiveProfile.role === 'learner' || effectiveProfile.role === 'admin') && <LearnerPortal profile={effectiveProfile} />}
      {currentView === 'parent'  && effectiveProfile && (effectiveProfile.role === 'parent'  || effectiveProfile.role === 'admin') && <ParentPortal profile={effectiveProfile} />}
      {currentView === 'admin'   && effectiveProfile && effectiveProfile.role === 'admin' && <AdminDashboard profile={effectiveProfile} />}
    </div>
  )
}