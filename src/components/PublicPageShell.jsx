// src/components/PublicPageShell.jsx
import { Link } from 'react-router-dom'

export default function PublicPageShell({ title, children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <header style={{
        background: 'white', borderBottom: '1px solid #f3f4f6',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 60,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32, background: '#6366f1', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, color: '#111827', fontSize: 16 }}>EduSpark</span>
        </Link>
        <Link to="/" style={{ fontSize: 14, color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}>
          ← Back to home
        </Link>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 28 }}>{title}</h1>
        <div style={{ background: 'white', borderRadius: 16, padding: '36px 32px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
