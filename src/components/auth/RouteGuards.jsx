// src/components/auth/RouteGuards.jsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

// ─── Loading spinner ──────────────────────────────────────────────────────────
function AuthLoading() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', flexDirection: 'column', gap: '12px'
    }}>
      <div style={{
        width: 36, height: 36, border: '3px solid #e5e7eb',
        borderTopColor: '#6366f1', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: '#6b7280', fontSize: 14 }}>Verifying access…</p>
    </div>
  )
}

// ─── Base: require authenticated ─────────────────────────────────────────────
export function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthLoading />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

// ─── Require a specific role ──────────────────────────────────────────────────
export function RequireRole({ roles, children }) {
  const { isAuthenticated, role, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthLoading />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />

  const allowed = Array.isArray(roles) ? roles : [roles]
  if (!allowed.includes(role)) {
    return <Navigate to="/access-denied" state={{ requiredRole: roles, userRole: role }} replace />
  }
  return children
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────
export function RequireStudent({ children }) {
  return <RequireRole roles={['student', 'tutor', 'admin']}>{children}</RequireRole>
}

export function RequireParent({ children }) {
  return <RequireRole roles={['parent', 'admin']}>{children}</RequireRole>
}

export function RequireTutor({ children }) {
  return <RequireRole roles={['tutor', 'admin']}>{children}</RequireRole>
}

export function RequireAdmin({ children }) {
  return <RequireRole roles={['admin']}>{children}</RequireRole>
}

// ─── Redirect logged-in users away from auth pages ────────────────────────────
export function RedirectIfAuth({ children }) {
  const { isAuthenticated, role, loading } = useAuth()

  if (loading) return <AuthLoading />
  if (isAuthenticated) {
    const dashboards = {
      admin:   '/admin',
      tutor:   '/tutor',
      parent:  '/parent',
      student: '/student',
    }
    return <Navigate to={dashboards[role] ?? '/student'} replace />
  }
  return children
}
