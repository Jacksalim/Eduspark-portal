// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import {
  RequireAuth, RequireAdmin, RequireTutor, RequireParent, RequireStudent, RedirectIfAuth
} from './components/auth/RouteGuards'

// Auth pages
import LoginPage              from './pages/AuthPages'
import { RegisterPage }       from './pages/AuthPages'
import { ForgotPasswordPage } from './pages/AccessDeniedPage'
import AccessDeniedPage       from './pages/AccessDeniedPage'
import TutorApplicationPage   from './pages/TutorApplicationPage'

// Dashboards
import StudentDashboard from './pages/dashboards/StudentDashboard'
import ParentDashboard  from './pages/dashboards/ParentDashboard'
import AdminDashboard   from './pages/dashboards/AdminDashboard'
import TutorDashboard   from './pages/dashboards/TutorDashboard'

// Public pages
import Landing from './pages/Landing'
import EditProfile from './pages/EditProfile'
import { PrivacyPolicy, TermsAndConditions } from './pages/PrivacyPolicy'

// Landing needs onGetStarted / onSignIn props — wrap it so we can use useNavigate
function LandingPage() {
  const navigate = useNavigate()
  return (
    <Landing
      onGetStarted={() => navigate('/register')}
      onSignIn={() => navigate('/login')}
    />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public ── */}
          <Route path="/" element={<LandingPage />} />

          {/* ── Auth routes (redirect away if already logged in) ── */}
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
          <Route path="/apply-as-tutor" element={
            <RequireAuth><TutorApplicationPage /></RequireAuth>
          }/>
          <Route path="/edit-profile" element={
            <RequireAuth><EditProfile /></RequireAuth>
          }/>

          {/* ── Legal (public) ── */}
          <Route path="/privacy-policy"      element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />

          {/* ── Role dashboards ── */}
          <Route path="/student/*" element={
            <RequireStudent><StudentDashboard /></RequireStudent>
          }/>
          <Route path="/tutor/*" element={
            <RequireTutor><TutorDashboard /></RequireTutor>
          }/>
          <Route path="/parent/*" element={
            <RequireParent><ParentDashboard /></RequireParent>
          }/>
          <Route path="/admin/*" element={
            <RequireAdmin><AdminDashboard /></RequireAdmin>
          }/>

          {/* ── Catch-all ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
