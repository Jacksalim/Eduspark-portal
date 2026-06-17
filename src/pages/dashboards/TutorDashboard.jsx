// src/pages/dashboards/TutorDashboard.jsx
// Placeholder — replace with full tutor dashboard when built
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { signOut } from '../../lib/supabase'

export default function TutorDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <header style={{
        background: 'white', borderBottom: '1px solid #f3f4f6',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#0891b2', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ fontWeight: 700, color: '#111827' }}>EduSpark</span>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: 'white', background: '#0891b2' }}>Tutor</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, color: '#6b7280' }}>{profile?.full_name}</span>
          <button onClick={async () => { await signOut(); navigate('/login') }}
            style={{ padding: '6px 14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </header>
      <main style={{ padding: '48px 24px', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Tutor Dashboard</h2>
        <p style={{ color: '#6b7280' }}>Your tutor dashboard is being built. Check back soon!</p>
        <button onClick={() => navigate('/apply-as-tutor')}
          style={{ marginTop: 20, padding: '10px 24px', background: '#0891b2', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          View Application Status
        </button>
      </main>
    </div>
  )
}
