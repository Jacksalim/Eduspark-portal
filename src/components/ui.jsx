import { useEffect, useState } from 'react'

export function Toast({ msg, type = 'success', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className={`toast ${type === 'error' ? 'toast-error' : ''}`}>
      {type === 'error' ? '❌' : '✅'} {msg}
    </div>
  )
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <span style={{ color: '#888', fontSize: '.88rem' }}>{label}</span>
    </div>
  )
}

export function ProgressBar({ value, color = 'var(--teal)', height = 8 }) {
  return (
    <div className="prog-bar" style={{ height }}>
      <div className="prog-fill" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
    </div>
  )
}

export function StatCard({ num, label, sub, color = 'var(--teal)' }) {
  return (
    <div className="stat-card">
      <div className="stat-num" style={{ color }}>{num}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub" style={{ color }}>{sub}</div>}
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState(null)
  const show = (msg, type = 'success') => setToast({ msg, type })
  const hide = () => setToast(null)
  const ToastEl = toast ? <Toast msg={toast.msg} type={toast.type} onDone={hide} /> : null
  return { show, ToastEl }
}

export const SUBJECTS = {
  'Mathematics':        { icon: '📐', color: '#1a6b6b' },
  'Business Studies':   { icon: '💼', color: '#6b4fa0' },
  'English':            { icon: '📖', color: '#c0544a' },
  'Natural Sciences':   { icon: '🔬', color: '#2d7a2d' },
  'Geography':          { icon: '🌍', color: '#b87a00' },
  'History':            { icon: '🏛️', color: '#5c3a1e' },
  'Life Orientation':   { icon: '🌱', color: '#1a6b6b' },
  'Technology':         { icon: '💻', color: '#1a5fbf' },
  'Accounting':         { icon: '📊', color: '#6b4fa0' },
  'Physical Sciences':  { icon: '⚗️', color: '#2d7a2d' },
}

export const GRADES = ['R','1','2','3','4','5','6','7','8','9','10','11','12']
