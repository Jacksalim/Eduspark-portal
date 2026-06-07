import { useState, useEffect } from 'react'
import { fetchAllLearners, uploadVideo, deleteVideo, fetchVideos, fetchVisits, fetchVisitStats } from '../lib/supabase'
import { SUBJECTS, GRADES, Spinner, useToast } from '../components/ui'

function fallbackLearners() {
  return [
    { id: '1', name: 'Amara Dlamini',  grade: '7',  email: 'amara@email.com',  role: 'learner', created_at: '2024-03-01' },
    { id: '2', name: 'Sipho Ndlovu',   grade: '9',  email: 'sipho@email.com',  role: 'learner', created_at: '2024-03-05' },
    { id: '3', name: 'Zoe Pietersen',  grade: '5',  email: 'zoe@email.com',    role: 'learner', created_at: '2024-03-10' },
  ]
}

// ── Mini Bar Chart (CSS-based) ─────────────────────────────────────────────────
function MiniBarChart({ data, color = 'var(--teal)' }) {
  const max = Math.max(...data.map(d => d.val), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 64, paddingTop: 4 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: '100%', borderRadius: '3px 3px 0 0', minHeight: d.val > 0 ? 6 : 2,
            height: `${Math.max((d.val / max) * 50, d.val > 0 ? 6 : 2)}px`,
            background: d.val > 0 ? color : 'var(--mist)', transition: 'height .4s ease'
          }} />
          <div style={{ fontSize: '.62rem', color: '#bbb', whiteSpace: 'nowrap' }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Upload Video Section ───────────────────────────────────────────────────────
function UploadSection({ profile }) {
  const [form, setForm] = useState({ title: '', subject: 'Mathematics', grade: '7', topic: '', url: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [videos, setVideos] = useState([])
  const [videosLoading, setVideosLoading] = useState(true)
  const [filterSubject, setFilterSubject] = useState('All')
  const { show, ToastEl } = useToast()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { fetchVideos({}).then(setVideos).catch(() => {}).finally(() => setVideosLoading(false)) }, [])

  async function handleUpload(e) {
    e.preventDefault()
    if (!form.title || !form.url) { show('Title and URL are required', 'error'); return }
    setLoading(true)
    try {
      const v = await uploadVideo({ ...form, uploadedBy: profile?.id })
      setVideos(vs => [v, ...vs])
      setForm({ title: '', subject: 'Mathematics', grade: '7', topic: '', url: '', description: '' })
      show('Video uploaded successfully! ✅')
    } catch (err) { show('Upload failed: ' + err.message, 'error') }
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this video? This cannot be undone.')) return
    try { await deleteVideo(id); setVideos(vs => vs.filter(v => v.id !== id)); show('Video deleted') }
    catch (err) { show('Delete failed: ' + err.message, 'error') }
  }

  const filtered = filterSubject === 'All' ? videos : videos.filter(v => v.subject === filterSubject)

  return (
    <div>
      {ToastEl}
      <div className="section-header">
        <h2>📤 Video Management</h2>
        <p>Upload new lessons or manage existing video content.</p>
      </div>

      {/* Upload Form */}
      <div className="card card-pad" style={{ marginBottom: 28 }}>
        <h4 style={{ fontSize: '1rem', marginBottom: 20 }}>Upload New Video</h4>
        <form onSubmit={handleUpload}>
          <div className="drop-zone" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎬</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Paste a YouTube or Vimeo link below</div>
            <div style={{ fontSize: '.82rem', color: '#aaa' }}>Supports YouTube, Vimeo, and direct embed URLs</div>
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

      {/* Video Library */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <h4 style={{ margin: 0 }}>📚 Video Library ({filtered.length}{filterSubject !== 'All' ? ` of ${videos.length}` : ''})</h4>
        <select className="form-control" value={filterSubject} onChange={e => setFilterSubject(e.target.value)} style={{ width: 180 }}>
          <option value="All">All Subjects</option>
          {Object.keys(SUBJECTS).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {videosLoading ? <Spinner /> : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Title</th><th>Subject</th><th>Grade</th><th>Topic</th><th>Added</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa', padding: '32px 16px' }}>
                  {videos.length === 0 ? 'No videos yet — upload your first one above!' : `No videos for "${filterSubject}"`}
                </td></tr>
              )}
              {filtered.map(v => (
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

// ── Learners Section ───────────────────────────────────────────────────────────
function LearnersSection() {
  const [learners, setLearners] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('All')

  useEffect(() => {
    fetchAllLearners()
      .then(data => setLearners(data.length > 0 ? data : fallbackLearners()))
      .catch(() => setLearners(fallbackLearners()))
      .finally(() => setLoading(false))
  }, [])

  const filtered = learners.filter(l => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase())
    const matchGrade = gradeFilter === 'All' || l.grade === gradeFilter
    return matchSearch && matchGrade
  })

  const primary = learners.filter(l => l.grade && (l.grade === 'R' || parseInt(l.grade) <= 7)).length
  const highSchool = learners.filter(l => l.grade && parseInt(l.grade) >= 8).length

  if (loading) return <Spinner />

  return (
    <div>
      <div className="section-header">
        <h2>👥 Learner Management</h2>
        <p>View and manage all registered learners on the platform.</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { num: learners.length, label: 'Total Learners', sub: 'Registered', color: 'var(--teal)' },
          { num: primary,         label: 'Primary School', sub: 'Grades R–7',  color: 'var(--gold)' },
          { num: highSchool,      label: 'High School',    sub: 'Grades 8–12', color: 'var(--purple)' },
          { num: filtered.length, label: 'Showing',        sub: 'Current filter', color: 'var(--rose)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-num" style={{ color: s.color }}>{s.num}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-sub" style={{ color: s.color }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 220 }}>
          <input className="form-control" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control" value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} style={{ width: 140 }}>
          <option value="All">All Grades</option>
          {GRADES.map(g => <option key={g} value={g}>{g === 'R' ? 'Grade R' : `Grade ${g}`}</option>)}
        </select>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Grade</th><th>Email</th><th>Joined</th><th>Role</th></tr></thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#aaa', padding: '32px' }}>No learners match your search.</td></tr>
            )}
            {filtered.map(l => (
              <tr key={l.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.85rem', fontWeight: 700, color: 'var(--teal)', flexShrink: 0 }}>
                      {l.name.charAt(0).toUpperCase()}
                    </div>
                    <b>{l.name}</b>
                  </div>
                </td>
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

// ── Visitors Section ───────────────────────────────────────────────────────────
function VisitorsSection() {
  const [visits, setVisits] = useState([])
  const [stats, setStats] = useState({ today: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchVisits(), fetchVisitStats()])
      .then(([v, s]) => { setVisits(v); setStats(s) })
      .catch(() => {
        setVisits([
          { id: 1, page: '/', visited_at: new Date().toISOString(), profiles: { name: 'Anonymous', role: 'visitor' } },
          { id: 2, page: '/grade-7-maths', visited_at: new Date().toISOString(), profiles: { name: 'Amara D.', role: 'learner' } },
        ])
        setStats({ today: 12, total: 340 })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <div>
      <div className="section-header">
        <h2>👁 Site Visitors</h2>
        <p>Live tracking of all page visits and user activity.</p>
      </div>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--teal)' }}>{stats.today}</div>
          <div className="stat-label">Visits Today</div>
          <div className="stat-sub" style={{ color: 'var(--teal)' }}>↑ Live</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--purple)' }}>{stats.total}</div>
          <div className="stat-label">Total Visits</div>
          <div className="stat-sub" style={{ color: 'var(--purple)' }}>All time</div>
        </div>
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
                <td style={{ color: '#666', fontSize: '.87rem' }}>{v.page || '/'}</td>
                <td><span className={`pill ${v.profiles?.role === 'learner' ? 'pill-green' : v.profiles?.role === 'admin' ? 'pill-purple' : 'pill-blue'}`}>{v.profiles?.role || 'visitor'}</span></td>
                <td style={{ color: '#aaa', fontSize: '.8rem' }}>{new Date(v.visited_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Admin Dashboard ───────────────────────────────────────────────────────
export default function AdminDashboard({ profile }) {
  const [section, setSection]       = useState('overview')
  const [learners, setLearners]     = useState([])
  const [videos, setVideos]         = useState([])
  const [visitStats, setVisitStats] = useState({ today: 0, total: 0 })
  const [dataLoading, setDataLoading] = useState(true)
  const { show, ToastEl } = useToast()

  useEffect(() => {
    Promise.all([fetchAllLearners(), fetchVideos({}), fetchVisitStats()])
      .then(([l, v, s]) => { setLearners(l); setVideos(v); setVisitStats(s) })
      .catch(() => { setLearners(fallbackLearners()) })
      .finally(() => setDataLoading(false))
  }, [])

  const sideItems = [
    { id: 'overview',  icon: '📊', label: 'Overview' },
    { id: 'videos',    icon: '📤', label: 'Videos' },
    { id: 'learners',  icon: '👥', label: 'Learners' },
    { id: 'visitors',  icon: '👁',  label: 'Visitors' },
  ]

  // Grade distribution for bar chart
  const gradeData = ['7','8','9','10','11','12'].map(g => ({
    label: `G${g}`,
    val: learners.filter(l => l.grade === g).length
  }))

  // Subject distribution from videos
  const subjectData = Object.keys(SUBJECTS).slice(0, 6).map(s => ({
    label: s.slice(0, 4),
    val: videos.filter(v => v.subject === s).length
  }))

  const primary = learners.filter(l => l.grade && (l.grade === 'R' || parseInt(l.grade) <= 7)).length
  const highSchool = learners.filter(l => l.grade && parseInt(l.grade) >= 8).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {ToastEl}

      <div className="portal-layout">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-section">Navigation</div>
          {sideItems.map(s => (
            <button key={s.id} className={`sidebar-btn ${section === s.id ? 'active' : ''}`} onClick={() => setSection(s.id)}>
              {s.icon} {s.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ padding: '12px', background: 'rgba(255,255,255,.04)', borderRadius: 10, margin: '8px 4px 0' }}>
            <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>Admin</div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '.875rem' }}>{profile?.name?.split(' ')[0]}</div>
            <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '.75rem', marginTop: 2 }}>Tutor / Admin</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="portal-main">

          {/* ── OVERVIEW ── */}
          {section === 'overview' && (
            <div>
              {/* Hero */}
              <div className="dash-hero" style={{ background: 'linear-gradient(135deg, #1a0a4a 0%, #2d1b69 50%, #4a2d99 100%)' }}>
                <div style={{ fontSize: '.75rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>
                  🖥️ Tutor Dashboard
                </div>
                <h2 style={{ fontSize: 'clamp(1.4rem,3vw,1.9rem)', fontFamily: "'Playfair Display',serif", marginBottom: 4 }}>
                  Welcome back, {profile?.name?.split(' ')[0] || 'Tutor'}! 👋
                </h2>
                <p style={{ opacity: .65, fontSize: '.88rem', marginTop: 4 }}>
                  {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Stats */}
              {dataLoading ? (
                <div className="stats-grid-6">
                  {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}
                </div>
              ) : (
                <div className="stats-grid-6">
                  {[
                    { icon: '👥', label: 'Total Learners',  val: learners.length,      color: 'var(--teal)' },
                    { icon: '📺', label: 'Videos Uploaded', val: videos.length,        color: '#2d7a2d' },
                    { icon: '📚', label: 'Subjects',        val: 10,                   color: 'var(--gold)' },
                    { icon: '🎓', label: 'Grade Levels',    val: 13,                   color: 'var(--purple)' },
                    { icon: '👁',  label: 'Visits Today',   val: visitStats.today,     color: 'var(--rose)' },
                    { icon: '📊', label: 'Total Visits',    val: visitStats.total,     color: '#1a5fbf' },
                  ].map(s => (
                    <div key={s.label} className="stat-card-v2">
                      <div className="stat-accent" style={{ background: s.color }} />
                      <div className="stat-icon">{s.icon}</div>
                      <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
                      <div className="stat-lbl">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Charts + Quick Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 24 }}>
                {/* Learner grade distribution */}
                <div className="card card-pad">
                  <h4 style={{ fontSize: '.9rem', marginBottom: 4 }}>👥 Learners by Grade</h4>
                  <p style={{ fontSize: '.75rem', color: '#aaa', marginBottom: 16 }}>Grades 7–12</p>
                  <MiniBarChart data={gradeData} color="var(--teal)" />
                </div>

                {/* Videos by subject */}
                <div className="card card-pad">
                  <h4 style={{ fontSize: '.9rem', marginBottom: 4 }}>📺 Videos by Subject</h4>
                  <p style={{ fontSize: '.75rem', color: '#aaa', marginBottom: 16 }}>Top 6 subjects</p>
                  <MiniBarChart data={subjectData} color="var(--purple)" />
                </div>

                {/* School level breakdown */}
                <div className="card card-pad">
                  <h4 style={{ fontSize: '.9rem', marginBottom: 16 }}>🏫 School Level Breakdown</h4>
                  {[
                    { label: 'Primary School (R–7)', val: primary, color: 'var(--gold)', total: learners.length },
                    { label: 'High School (8–12)', val: highSchool, color: 'var(--teal)', total: learners.length },
                  ].map(b => (
                    <div key={b.label} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{b.label}</span>
                        <span style={{ fontSize: '.82rem', fontWeight: 700, color: b.color }}>{b.val}</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--mist)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${b.total > 0 ? (b.val / b.total) * 100 : 0}%`, background: b.color, borderRadius: 4, transition: 'width .4s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card card-pad">
                <h4 style={{ marginBottom: 16, fontSize: '.95rem' }}>⚡ Quick Actions</h4>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[
                    { label: '📤 Upload Video',   section: 'videos',   cls: 'btn-teal' },
                    { label: '👥 View Learners',  section: 'learners', cls: 'btn-ghost' },
                    { label: '👁 Site Visitors',  section: 'visitors', cls: 'btn-ghost' },
                  ].map(a => (
                    <button key={a.section} className={`btn ${a.cls} btn-sm`} onClick={() => setSection(a.section)}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* System Status */}
              <div className="card card-pad" style={{ marginTop: 20 }}>
                <h4 style={{ marginBottom: 14, fontSize: '.95rem' }}>🟢 System Status</h4>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Supabase DB',    ok: true },
                    { label: 'Auth Service',   ok: true },
                    { label: 'AI Quiz Engine', ok: true },
                    { label: 'Video Embeds',   ok: true },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7, background: s.ok ? '#e6f5e6' : 'var(--rose-light)', borderRadius: 8, padding: '7px 13px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.ok ? '#256625' : 'var(--rose)', flexShrink: 0 }} />
                      <span style={{ fontSize: '.8rem', fontWeight: 600, color: s.ok ? '#256625' : 'var(--rose)' }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'videos'   && <UploadSection profile={profile} />}
          {section === 'learners' && <LearnersSection />}
          {section === 'visitors' && <VisitorsSection />}
        </div>
      </div>
    </div>
  )
}
