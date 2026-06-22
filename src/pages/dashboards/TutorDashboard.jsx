// src/pages/dashboards/TutorDashboard.jsx
// Placeholder — replace with full tutor dashboard when built
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import DashboardHeader from '../../components/DashboardHeader'

export default function TutorDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <DashboardHeader role="tutor" profile={profile} />
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
