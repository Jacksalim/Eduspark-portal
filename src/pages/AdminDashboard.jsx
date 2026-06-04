import { useState, useEffect } from 'react'
import { fetchAllLearners, uploadVideo, deleteVideo, fetchVideos, fetchVisits, fetchVisitStats } from '../lib/supabase'
import { SUBJECTS, GRADES, Spinner, ProgressBar, StatCard, useToast } from '../components/ui'

function fallbackLearners() {
  return [
    { id: '1', name: 'Amara Dlamini', grade: '7', email: 'amara@email.com', role: 'learner', created_at: '2024-03-01' },
    { id: '2', name: 'Sipho Ndlovu', grade: '9', email: 'sipho@email.com', role: 'learner', created_at: '2024-03-05' },
    { id: '3', name: 'Zoe Pietersen', grade: '5', email: 'zoe@email.com', role: 'learner', created_at: '2024-03-10' },
  ]
}

// ── Upload Video Section ──────────────────────────────────────────────────────
function UploadSection({ profile, onUploaded }) {
  const [form, setForm] = useState({ title: '', subject: 'Mathematics', grade: '7', topic: '', url: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [videos, setVideos] = useState([])
  const [videosLoading, setVideosLoading] = useState(true)
  const { show, ToastEl } = useToast()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    fetchVideos({}).then(setVideos).catch(() => {}).finally(() => setVideosLoading(false))
  }, [])

  async function handleUpload(e) {
    e.preventDefault()
    if (!form.title || !form.url) { show('Title and URL are required', 'error'); return }
    setLoading(true)
    try {
      const v = await uploadVideo({ ...form, uploadedBy: profile?.id })
      setVideos(vs => [v, ...vs])
      setForm({ title: '', subject: 'Mathematics', grade: '7', topic: '', url: '', description: '' })
      show('Video uploaded successfully!')
      onUploaded?.()
    } catch (err) {
      show('Upload failed: ' + err.message, 'error')
    }
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this video?')) return
    try {
      await deleteVideo(id)
      setVideos(vs => vs.filter(v => v.id !== id))
      show('Video deleted')
    } catch (err) {
      show('Delete failed: ' + err.message, 'error')
    }
  }

  return (
    <div>
      {ToastEl}
      {/* Upload form */}
      <div className="card card-pad" style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: 20 }}>📤 Upload New Video</h3>
        <form onSubmit={handleUpload}>
          <div className="drop-zone" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎬</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Paste a YouTube or Vimeo link below</div>
            <div style={{ fontSize: '.82rem' }}>YouTube, Vimeo, or any direct embed URL</div>
          </div>
          <div className="form-group">
            <label>Video URL *</label>
            <input className="form-control" value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://www.youtube.com/watch?v=..." required />
          </div>
          <div className="form-group">
            <label>Video Title *</label>
            <input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Introduction to Algebra" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Subject</label>
              <select className="form-control" value={form.subject} onChange={e => set('subject', e.target.value)}>
                {Object.keys(SUBJECTS).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Grade</label>
              <select className="form-control" value={form.grade} onChange={e => set('grade', e.target.value)}>
                {GRADES.map(g => <option key={g} value={g}>{g === 'R' ? 'Grade R' : `Grade ${g}`}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Topic / Chapter</label>
              <input className="form-control" value={form.topic} onChange={e => set('topic', e.target.value)} placeholder="e.g. Fractions, Entrepreneurship…" />
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <input className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description" />
            </div>
          </div>
          <button className="btn btn-teal" type="submit" disabled={loading}>
            {loading ? '⏳ Uploading…' : '📤 Upload Video'}
          </button>
        </form>
      </div>

      {/* Video library */}
      <h4 style={{ marginBottom: 14 }}>📚 Video Library ({videos.length})</h4>
      {videosLoading ? <Spinner /> : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Title</th><th>Subject</th><th>Grade</th><th>Topic</th><th>Added</th><th></th></tr></thead>
            <tbody>
              {videos.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa', padding: '32px 16px' }}>No videos yet — upload your first one above!</td></tr>
              )}
              {videos.map(v => (
                <tr key={v.id}>
                  <td><b>{v.title}</b></td>
                  <td>{SUBJECTS[v.subject]?.icon} {v.subject}</td>
                  <td>Grade {v.grade}</td>
                  <td style={{ color: '#888' }}>{v.topic || '—'}</td>
                  <td style={{ color: '#aaa', fontSize: '.8rem' }}>{new Date(v.created_at).toLocaleDateString()}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(v.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Learners Section ──────────────────────────────────────────────────────────
function LearnersSection() {
  const [learners, setLearners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllLearners()
      .then(data => setLearners(data.length > 0 ? data : fallbackLearners()))
      .catch(() => setLearners(fallbackLearners()))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard num={learners.length} label="Total Learners" sub="Registered" color="var(--teal)" />
        <StatCard num={learners.filter(l => l.grade && parseInt(l.grade) >= 10).length} label="High School" sub="Grades 10-12" color="var(--purple)" />
        <StatCard num={learners.filter(l => l.grade && parseInt(l.grade) <= 7).length} label="Primary School" sub="Grades R-7" color="var(--gold)" />
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Grade</th><th>Email</th><th>Joined</th><th>Role</th></tr></thead>
          <tbody>
            {learners.map(l => (
              <tr key={l.id}>
                <td><b>{l.name}</b></td>
                <td>{l.grade ? `Grade ${l.grade}` : '—'}</td>
                <td style={{ color: 'var(--teal)', fontSize: '.85rem' }}>{l.email}</td>
                <td style={{ color: '#aaa', fontSize: '.8rem' }}>{new Date(l.created_at).toLocaleDateString()}</td>
                <td><span className="pill pill-green">{l.role}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Visitors Section ──────────────────────────────────────────────────────────
function VisitorsSection() {
  const [visits, setVisits] = useState([])
  const [stats, setStats] = useState({ today: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchVisits(), fetchVisitStats()])
      .then(([v, s]) => { setVisits(v); setStats(s) })
      .catch(() => {
        setVisits([
          { id: 1, page: 'Home', visited_at: new Date().toISOString(), profiles: { name: 'Anonymous', role: 'visitor' }, user_agent: 'Chrome/120' },
          { id: 2, page: 'Grade 7 Maths', visited_at: new Date().toISOString(), profiles: { name: 'Amara D.', role: 'learner' }, user_agent: 'Safari/17' },
        ])
        setStats({ today: 12, total: 340 })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard num={stats.today} label="Visits Today" sub="↑ Live tracking" color="var(--teal)" />
        <StatCard num={stats.total} label="Total Visits" sub="All time" color="var(--purple)" />
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>User</th><th>Page</th><th>Role</th><th>When</th></tr></thead>
          <tbody>
            {visits.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>No visits logged yet</td></tr>
            )}
            {visits.map(v => (
              <tr key={v.id}>
                <td style={{ fontWeight: 600 }}>{v.profiles?.name || 'Anonymous'}</td>
                <td>{v.page || '/'}</td>
                <td><span className={`pill ${v.profiles?.role === 'learner' ? 'pill-green' : 'pill-blue'}`}>{v.profiles?.role || 'visitor'}</span></td>
                <td style={{ color: '#aaa', fontSize: '.8rem' }}>{new Date(v.visited_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Admin Dashboard ──────────────────────────────────────────────────────
export default function AdminDashboard({ profile }) {
  const [section, setSection] = useState('overview')
  const [learnerCount, setLearnerCount] = useState('—')
  const { show, ToastEl } = useToast()

  useEffect(() => {
    fetchAllLearners().then(d => setLearnerCount(d.length)).catch(() => {})
  }, [])

  const sideItems = [
    { id: 'overview',  icon: '📊', label: 'Overview' },
    { id: 'upload',    icon: '📤', label: 'Upload Video' },
    { id: 'learners',  icon: '👥', label: 'Learners' },
    { id: 'visitors',  icon: '👁️', label: 'Site Visitors' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {ToastEl}
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2d1b69, #4a2d99)', color: '#fff', padding: '24px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem' }}>Tutor Dashboard 🖥️</h2>
          <p style={{ opacity: .7, fontSize: '.88rem', marginTop: 3 }}>Welcome back, {profile?.name || 'Tutor'}</p>
        </div>
        <span className="nav-badge" style={{ background: 'rgba(255,255,255,.15)' }}>Admin</span>
      </div>

      <div className="portal-layout">
        <div className="sidebar">
          <div className="sidebar-section">Menu</div>
          {sideItems.map(s => (
            <button key={s.id} className={`sidebar-btn ${section === s.id ? 'active' : ''}`} onClick={() => setSection(s.id)}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        <div className="portal-main">
          {section === 'overview' && (
            <>
              <h3 style={{ marginBottom: 20 }}>📊 Dashboard Overview</h3>
              <div className="stats-grid">
                <StatCard num={learnerCount} label="Total Learners" sub="Registered" color="var(--teal)" />
                <StatCard num="10" label="Subjects" sub="Available" color="var(--gold)" />
                <StatCard num="13" label="Grade Levels" sub="R through 12" color="var(--purple)" />
                <StatCard num="AI" label="Quiz Engine" sub="Claude-powered" color="var(--rose)" />
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid var(--mist)', marginTop: 8 }}>
                <h4 style={{ marginBottom: 12 }}>🚀 Quick Actions</h4>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn btn-teal btn-sm" onClick={() => setSection('upload')}>📤 Upload Video</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSection('learners')}>👥 View Learners</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSection('visitors')}>👁️ Site Visitors</button>
                </div>
              </div>
            </>
          )}
          {section === 'upload'   && <UploadSection profile={profile} />}
          {section === 'learners' && <LearnersSection />}
          {section === 'visitors' && <VisitorsSection />}
        </div>
      </div>
    </div>
  )
}
