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

function getAllowedPortals(role) {
  if (role === 'admin') return ['learner', 'parent', 'admin']
  if (role === 'parent') return ['parent']
  return ['learner']
}

export default function App() {
  const { user, profile, loading } = useAuth()
  const [view, setView] = useState('home')

  // Redirect to correct portal after login
  useEffect(() => {
    if (user && profile) {
      if (view === 'auth' || view === 'home') {
        setView(profile.role)
      }
    }
  }, [user, profile])

  // Block access to portals the user is not allowed to see
  useEffect(() => {
    if (!profile) return
    const allowed = getAllowedPortals(profile.role)
    if (['learner', 'parent', 'admin'].includes(view) && !allowed.includes(view)) {
      setView(profile.role)
    }
  }, [view, profile])

  function handleEnter(role) {
    if (user && profile) {
      const allowed = getAllowedPortals(profile.role)
      setView(allowed.includes(role) ? role : profile.role)
    } else {
      setView('auth')
    }
  }

  async function handleSignOut() {
    await signOut()
    setView('home')
  }

  const allowedPortals = profile ? getAllowedPortals(profile.role) : []
  const showPortalNav = ['learner', 'parent', 'admin'].includes(view) && profile && allowedPortals.length > 1

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

        {showPortalNav && (
          <div className="nav-tabs">
            {allowedPortals.map(r => (
              <button key={r} className={`nav-tab ${view === r ? 'active' : ''}`} onClick={() => setView(r)}>
                {PORTAL_LABELS[r]}
              </button>
            ))}
          </div>
        )}

        <div className="nav-right">
          {profile && (
            <span className="nav-badge" style={{
              background: view === 'admin' ? '#6b4fa0' : view === 'parent' ? 'var(--rose)' : 'var(--teal)'
            }}>
              {profile.name.split(' ')[0]}
            </span>
          )}
          {user ? (
            <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign Out</button>
          ) : (
            <button className="btn btn-gold btn-sm" onClick={() => setView('auth')}>Sign In</button>
          )}
        </div>
      </nav>

      {view === 'home'    && <Landing onEnter={handleEnter} />}
      {view === 'auth'    && <AuthPage />}
      {view === 'learner' && profile && (profile.role === 'learner' || profile.role === 'admin') && <LearnerPortal profile={profile} />}
      {view === 'parent'  && profile && (profile.role === 'parent'  || profile.role === 'admin') && <ParentPortal profile={profile} />}
      {view === 'admin'   && profile && profile.role === 'admin' && <AdminDashboard profile={profile} />}
    </div>
  )
}