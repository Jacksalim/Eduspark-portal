// src/components/SidebarProfileDropdown.jsx
import { useState } from 'react'

const QUOTES = [
  { text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
]

// Replaces the big top "dash-hero" banner — the same info (greeting, grade,
// quote, streak, badge count) now lives in a collapsible sidebar panel.
export default function SidebarProfileDropdown({ profile, streak = 0, badgesEarned = 0, badgesTotal = 0 }) {
  const [open, setOpen] = useState(false)
  const quote = QUOTES[new Date().getDay() % QUOTES.length]
  const firstName = profile?.name?.split(' ')[0] || 'Learner'

  return (
    <div style={{ margin: '8px 4px 0', borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,.04)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0a1f1f', flexShrink: 0 }}>
          {firstName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: '.875rem' }}>{firstName}</div>
          <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '.72rem', marginTop: 1 }}>Grade {profile?.grade || '—'}</div>
        </div>
        <span style={{ color: 'rgba(255,255,255,.4)', fontSize: '.8rem', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
      </button>

      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          {streak > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, background: 'rgba(201,168,76,.12)', borderRadius: 8, padding: '8px 10px' }}>
              <span style={{ fontSize: '1.1rem' }}>🔥</span>
              <span style={{ color: '#f0d9a0', fontSize: '.8rem', fontWeight: 600 }}>{streak}-day learning streak</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: '8px 10px' }}>
            <span style={{ fontSize: '1.1rem' }}>🏅</span>
            <span style={{ color: '#fff', fontSize: '.8rem', fontWeight: 600 }}>{badgesEarned}/{badgesTotal} badges earned</span>
          </div>
          <div style={{ fontSize: '.74rem', color: 'rgba(255,255,255,.45)', fontStyle: 'italic', lineHeight: 1.6 }}>
            "{quote.text}"<br />— {quote.author}
          </div>
        </div>
      )}
    </div>
  )
}
