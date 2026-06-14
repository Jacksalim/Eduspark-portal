// src/pages/dashboards/StudentDashboard.jsx
// Integrates with your existing EduSpark student UI — add the parent link approval widget
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function StudentDashboard() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const [pendingLinks, setPendingLinks] = useState([])

  useEffect(() => {
    // Check for pending parent link requests
    supabase
      .from('parent_student_links')
      .select('*, parent:profiles!parent_student_links_parent_id_fkey(full_name, email)')
      .eq('student_id', user.id)
      .eq('status', 'pending')
      .then(({ data }) => setPendingLinks(data ?? []))
  }, [user.id])

  const approveLink = async (linkId) => {
    await supabase.rpc('approve_parent_link', {
      link_id: linkId,
      approver_id: user.id,
    })
    setPendingLinks(l => l.filter(x => x.id !== linkId))
  }

  const rejectLink = async (linkId) => {
    await supabase
      .from('parent_student_links')
      .update({ status: 'rejected' })
      .eq('id', linkId)
    setPendingLinks(l => l.filter(x => x.id !== linkId))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <header style={{
        background: 'white', borderBottom: '1px solid #f3f4f6',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: '#6366f1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ fontWeight: 700, color: '#111827' }}>EduSpark</span>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: 'white', background: '#6366f1' }}>
            Student
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, color: '#6b7280' }}>{profile?.full_name}</span>
          <button onClick={async () => {
            const { signOut } = await import('../../lib/supabase')
            await signOut(); navigate('/login')
          }} style={{ padding: '6px 14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </header>

      <main style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
        {/* Parent link approval alerts */}
        {pendingLinks.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {pendingLinks.map(link => (
              <div key={link.id} style={{
                background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
                padding: '16px 20px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 12, marginBottom: 8,
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: '#92400e', fontSize: 14 }}>
                    Parent monitoring request
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: '#92400e', opacity: 0.8 }}>
                    <strong>{link.parent?.full_name}</strong> ({link.parent?.email}) wants to monitor your learning progress.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => approveLink(link.id)} style={{
                    padding: '6px 14px', background: '#059669', color: 'white',
                    border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  }}>
                    Approve
                  </button>
                  <button onClick={() => rejectLink(link.id)} style={{
                    padding: '6px 14px', background: '#f3f4f6', color: '#374151',
                    border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  }}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Apply for tutor banner */}
        <div style={{
          background: 'white', border: '1px solid #f3f4f6', borderRadius: 12,
          padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>
              Want to teach on EduSpark?
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
              Apply to become a tutor and earn from sharing your knowledge.
            </p>
          </div>
          <button onClick={() => navigate('/apply-as-tutor')} style={{
            padding: '9px 18px', background: '#6366f1', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Apply now
          </button>
        </div>

        {/* NOTE: Mount your existing EduSpark student UI components here.
            This file augments your current dashboard with the auth features:
            - Parent link approval alerts (above)
            - Tutor application CTA (above)

            Example:
            <SubjectGrid />
            <RecentVideos />
            <ProgressTracker />
            <QuizHistory />
        */}
        <div style={{
          background: 'white', border: '1px solid #f3f4f6', borderRadius: 12,
          padding: '40px 24px', textAlign: 'center',
        }}>
          <p style={{ color: '#9ca3af', fontSize: 14 }}>
            Your existing student dashboard content goes here.<br />
            This file is the auth wrapper — mount your existing components inside the{' '}
            <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>main</code> element.
          </p>
        </div>
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// src/App.jsx — Main router with all route guards applied
// ─────────────────────────────────────────────────────────────────────────────

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import {
  RequireAuth, RequireAdmin, RequireTutor, RequireParent, RequireStudent, RedirectIfAuth
} from './components/auth/RouteGuards'

// Pages
import LoginPage             from './pages/AuthPages'
import { RegisterPage }      from './pages/AuthPages'
import { ForgotPasswordPage } from './pages/AccessDeniedPage'
import AccessDeniedPage      from './pages/AccessDeniedPage'
import TutorApplicationPage  from './pages/TutorApplicationPage'
import AdminDashboard        from './pages/dashboards/AdminDashboard'
import ParentDashboard       from './pages/dashboards/ParentDashboard'
import StudentDashboard      from './pages/dashboards/StudentDashboard'

// Lazy-load tutor dashboard (import when you create it)
// const TutorDashboard = lazy(() => import('./pages/dashboards/TutorDashboard'))

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public auth routes (redirect if already logged in) ── */}
          <Route path="/login" element={
            <RedirectIfAuth><LoginPage /></RedirectIfAuth>
          }/>
          <Route path="/register" element={
            <RedirectIfAuth><RegisterPage /></RedirectIfAuth>
          }/>
          <Route path="/forgot-password" element={
            <RedirectIfAuth><ForgotPasswordPage /></RedirectIfAuth>
          }/>

          {/* ── Shared protected ── */}
          <Route path="/access-denied" element={
            <RequireAuth><AccessDeniedPage /></RequireAuth>
          }/>

          {/* ── Student dashboard ── */}
          <Route path="/student/*" element={
            <RequireStudent><StudentDashboard /></RequireStudent>
          }/>

          {/* ── Tutor application (any logged-in user) ── */}
          <Route path="/apply-as-tutor" element={
            <RequireAuth><TutorApplicationPage /></RequireAuth>
          }/>

          {/* ── Tutor dashboard ── */}
          <Route path="/tutor/*" element={
            <RequireTutor>
              {/* <TutorDashboard /> */}
              <div style={{ padding: 32 }}>
                <h2>Tutor Dashboard</h2>
                <p>Mount your TutorDashboard component here.</p>
              </div>
            </RequireTutor>
          }/>

          {/* ── Parent dashboard ── */}
          <Route path="/parent/*" element={
            <RequireParent><ParentDashboard /></RequireParent>
          }/>

          {/* ── Admin dashboard — strictly admin only ── */}
          <Route path="/admin/*" element={
            <RequireAdmin><AdminDashboard /></RequireAdmin>
          }/>

          {/* ── Default redirect ── */}
          <Route path="/" element={<Navigate to="/student" replace />}/>
          <Route path="*" element={<Navigate to="/student" replace />}/>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
