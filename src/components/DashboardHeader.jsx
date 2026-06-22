// src/components/DashboardHeader.jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signOut } from '../lib/supabase'

const ROLE_COLORS = { admin: '#7c3aed', tutor: '#0891b2', parent: '#059669', student: '#6366f1' }

export default function DashboardHeader({ role, profile }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const dashboardPath = { admin: '/admin', tutor: '/tutor', parent: '/parent', student: '/student' }[role] || '/student'

  return (
    <header style={{
      background: 'white', borderBottom: '1px solid #f3f4f6',
      padding: '0 24px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', height: 60, position: 'relative', zIndex: 50,
    }}>
      <Link to={dashboardPath} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
        <div style={{
          width: 32, height: 32, background: '#6366f1', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span style={{ fontWeight: 700, color: '#111827' }}>EduSpark</span>
        <span style={{
          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
          textTransform: 'capitalize', color: 'white',
          background: ROLE_COLORS[role] ?? '#6366f1',
        }}>
          {role}
        </span>
      </Link>

      {/* Dropdown menu trigger */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
            background: menuOpen ? '#f3f4f6' : 'transparent', border: '1px solid #e5e7eb',
            borderRadius: 8, cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 14, color: '#374151', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.full_name || profile?.name || profile?.email}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{
            transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
          }}>
            <path d="M6 9l6 6 6-6" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 220,
            background: 'white', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            border: '1px solid #f3f4f6', overflow: 'hidden', padding: '6px 0',
          }}>
            <MenuSectionLabel>Account</MenuSectionLabel>
            <MenuItem icon="✏️" label="Edit my details" onClick={() => { setMenuOpen(false); navigate('/edit-profile') }} />
            <MenuDivider />
            <MenuSectionLabel>EduSpark</MenuSectionLabel>
            <MenuItem icon="ℹ️" label="About Us" onClick={() => { setMenuOpen(false); navigate('/about') }} />
            <MenuItem icon="🧩" label="Our Services" onClick={() => { setMenuOpen(false); navigate('/services') }} />
            <MenuItem icon="📰" label="Blog" onClick={() => { setMenuOpen(false); navigate('/blog') }} />
            <MenuItem icon="📄" label="Terms & Conditions" onClick={() => { setMenuOpen(false); navigate('/terms-and-conditions') }} />
            <MenuItem icon="🔒" label="Privacy Policy" onClick={() => { setMenuOpen(false); navigate('/privacy-policy') }} />
            <MenuDivider />
            <MenuItem icon="🚪" label="Sign out" danger onClick={handleSignOut} />
          </div>
        )}
      </div>
    </header>
  )
}

function MenuSectionLabel({ children }) {
  return (
    <div style={{
      padding: '6px 16px 4px', fontSize: 10.5, fontWeight: 700, color: '#9ca3af',
      textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
      {children}
    </div>
  )
}

function MenuDivider() {
  return <div style={{ height: 1, background: '#f3f4f6', margin: '6px 0' }} />
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 13.5, color: danger ? '#dc2626' : '#374151', textAlign: 'left',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? '#fef2f2' : '#f9fafb'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      {label}
    </button>
  )
}
