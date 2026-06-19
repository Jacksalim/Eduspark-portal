import { useState, useEffect } from 'react'
import { fetchChildrenForParent, fetchProgress, fetchQuizResults, findLearnerByEmail, linkChildToParent, unlinkChild } from '../lib/supabase'
import { SUBJECTS, Spinner, ProgressBar, useToast } from '../components/ui'
import { generateProgressReport } from '../lib/pdfReport'

const CHILD_COLORS = ['var(--teal)', 'var(--rose)', 'var(--purple)', '#b87a00', '#2d7a2d', '#1a5fbf']

function getAlerts(quizzes, progress) {
  const alerts = []
  const avgScore = quizzes.length ? Math.round(quizzes.reduce((a, q) => a + q.percent, 0) / quizzes.length) : null
  if (avgScore !== null && avgScore < 50) {
    alerts.push({ type: 'danger', icon: '⚠️', title: 'Low average score', desc: `Average quiz score is ${avgScore}%. Extra practice recommended.` })
  } else if (avgScore !== null && avgScore < 70) {
    alerts.push({ type: 'warn', icon: '📉', title: 'Score below target', desc: `Average score is ${avgScore}%. Encourage regular practice to reach 70%+.` })
  }
  const lowSubjects = progress.filter(p => p.percent < 50)
  if (lowSubjects.length > 0) {
    alerts.push({ type: 'warn', icon: '📚', title: 'Subjects need attention', desc: `${lowSubjects.map(s => s.subject).join(', ')} ${lowSubjects.length === 1 ? 'is' : 'are'} below 50% progress.` })
  }
  if (quizzes.length === 0) {
    alerts.push({ type: 'info', icon: '💡', title: 'No quizzes taken yet', desc: 'Encourage your child to take their first quiz to begin tracking progress.' })
  }
  if (alerts.length === 0 && avgScore !== null) {
    alerts.push({ type: 'info', icon: '🌟', title: 'Doing well!', desc: `Average score is ${avgScore}%. Keep up the great work!` })
  }
  return alerts
}

// ── Link Child Section ─────────────────────────────────────────────────────────
function LinkChildSection({ profile, onLinked }) {
  const [email, setEmail] = useState('')
  const [found, setFound] = useState(null)
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState(false)
  const [searchError, setSearchError] = useState('')
  const { show, ToastEl } = useToast()

  async function handleSearch(e) {
    e.preventDefault()
    if (!email.trim()) return
    setSearching(true); setFound(null); setSearchError('')
    try { setFound(await findLearnerByEmail(email)) }
    catch { setSearchError('No learner account found with that email address.') }
    finally { setSearching(false) }
  }

  async function handleLink() {
    if (!found || !profile?.id) return
    setLinking(true)
    try {
      await linkChildToParent(found.id, profile.id)
      show(`${found.name} has been linked to your account!`)
      setEmail(''); setFound(null)
      setTimeout(onLinked, 1200)
    } catch (err) { show('Could not link: ' + err.message, 'error') }
    finally { setLinking(false) }
  }

  return (
    <div className="card card-pad">
      {ToastEl}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🔗</div>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem' }}>Link a Child Account</h4>
          <p style={{ margin: 0, fontSize: '.82rem', color: '#888', marginTop: 2 }}>Enter your child's registered email to connect their account.</p>
        </div>
      </div>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input className="form-control" type="email" value={email}
          onChange={e => { setEmail(e.target.value); setFound(null); setSearchError('') }}
          placeholder="child@email.com" style={{ flex: 1, minWidth: 220 }} required />
        <button className="btn btn-teal" type="submit" disabled={searching || !email.trim()}>
          {searching ? '⏳ Searching…' : '🔍 Find Account'}
        </button>
      </form>
      {searchError && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--rose-light)', color: 'var(--rose)', borderRadius: 8, fontSize: '.87rem', fontWeight: 500 }}>
          ❌ {searchError}
        </div>
      )}
      {found && (
        <div style={{ marginTop: 14, padding: '14px 18px', background: 'var(--teal-light)', border: '1px solid var(--teal)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>
              {found.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{found.name}</div>
              <div style={{ fontSize: '.8rem', color: '#555', marginTop: 2 }}>{found.grade ? `Grade ${found.grade}` : 'Grade not set'} · {found.email}</div>
            </div>
          </div>
          <button className="btn btn-teal btn-sm" onClick={handleLink} disabled={linking}>
            {linking ? '⏳ Linking…' : '✅ Link This Child'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Parent Portal ─────────────────────────────────────────────────────────
export default function ParentPortal({ profile }) {
  const [section, setSection]           = useState('overview')
  const [children, setChildren]         = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [progress, setProgress]         = useState([])
  const [quizzes, setQuizzes]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [exporting, setExporting]       = useState(false)
  const isReal = !!profile?.id
  const { show, ToastEl } = useToast()

  const subjectColors = { Mathematics: 'var(--teal)', English: '#2d7a2d', 'Business Studies': 'var(--purple)', 'Natural Sciences': '#b87a00', Geography: '#b87a00', History: '#5c3a1e', 'Life Orientation': 'var(--teal)', Technology: '#1a5fbf', Accounting: 'var(--purple)', 'Physical Sciences': '#2d7a2d' }

  function loadChildren() {
    if (!profile?.id) { setLoading(false); return }
    fetchChildrenForParent(profile.id)
      .then(data => {
        setChildren(data)
        setSelectedChild(prev => data.length > 0 ? (data.find(c => c.id === prev?.id) || data[0]) : null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadChildren() }, [profile?.id])

  useEffect(() => {
    if (!selectedChild?.id) { setProgress([]); setQuizzes([]); return }
    Promise.all([fetchProgress(selectedChild.id), fetchQuizResults(selectedChild.id)])
      .then(([p, q]) => { setProgress(p); setQuizzes(q) })
      .catch(() => {})
  }, [selectedChild?.id])

  async function handleUnlink(child) {
    if (!confirm(`Remove ${child.name} from your account?`)) return
    try { await unlinkChild(child.id); show(`${child.name} unlinked`); loadChildren() }
    catch (err) { show('Could not unlink: ' + err.message, 'error') }
  }

  async function handleExport() {
    if (!selectedChild) return
    setExporting(true)
    try { await generateProgressReport({ child: selectedChild, progress, quizzes }); show('PDF report downloaded! ✅') }
    catch (err) { show('PDF export failed: ' + err.message, 'error') }
    finally { setExporting(false) }
  }

  const avgScore = quizzes.length ? Math.round(quizzes.reduce((a, q) => a + q.percent, 0) / quizzes.length) : 0
  const overallProgress = progress.length ? Math.round(progress.reduce((a, p) => a + p.percent, 0) / progress.length) : 0
  const alerts = selectedChild ? getAlerts(quizzes, progress) : []

  const sideItems = [
    { id: 'overview',  icon: '📊', label: 'Overview' },
    { id: 'progress',  icon: '📈', label: 'Progress' },
    { id: 'reports',   icon: '📄', label: 'Reports' },
    { id: 'manage',    icon: '👥', label: 'Manage Children' },
  ]

  if (loading) return (
    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Spinner label="Loading dashboard…" />
    </div>
  )

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
            <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>Parent</div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '.875rem' }}>{profile?.name?.split(' ')[0]}</div>
            <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '.75rem', marginTop: 2 }}>{children.length} child{children.length !== 1 ? 'ren' : ''} linked</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="portal-main">

          {/* ── OVERVIEW ── */}
          {section === 'overview' && (
            <div>
              <div className="dash-hero" style={{ background: 'linear-gradient(135deg, #6b1a1a 0%, var(--rose) 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: '.75rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>
                      👨‍👩‍👧 Parent Dashboard
                    </div>
                    <h2 style={{ fontSize: 'clamp(1.4rem,3vw,1.9rem)', fontFamily: "'Playfair Display',serif", marginBottom: 4 }}>
                      Hello, {profile?.name?.split(' ')[0]}! 👋
                    </h2>
                    <p style={{ opacity: .7, fontSize: '.88rem', marginTop: 4 }}>
                      {children.length === 0 ? 'No children linked yet — add one below.' : `Monitoring ${children.length} child${children.length !== 1 ? 'ren' : ''}.`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.3)' }} onClick={() => setSection('manage')}>
                      ＋ Manage Children
                    </button>
                  </div>
                </div>
              </div>

              {/* No children state */}
              {children.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>👨‍👩‍👧</div>
                  <h3 style={{ marginBottom: 10, color: '#555' }}>No children linked yet</h3>
                  <p style={{ color: '#888', fontSize: '.9rem', marginBottom: 24 }}>Link your child's account to start monitoring their progress.</p>
                  <button className="btn btn-rose" onClick={() => setSection('manage')}>🔗 Link a Child Now</button>
                </div>
              )}

              {children.length > 0 && (
                <>
                  {/* Child selector cards */}
                  <div className="child-cards">
                    {children.map((c, i) => (
                      <div key={c.id} className={`child-card ${selectedChild?.id === c.id ? 'active' : ''}`} onClick={() => setSelectedChild(c)}>
                        <div className="child-avatar" style={{ background: CHILD_COLORS[i % CHILD_COLORS.length] }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: 4 }}>{c.name}</div>
                        <div style={{ fontSize: '.78rem', color: '#888' }}>Grade {c.grade || '—'}</div>
                        {selectedChild?.id === c.id && (
                          <div style={{ marginTop: 8 }}>
                            <span className="pill pill-red" style={{ fontSize: '.7rem' }}>Selected</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Alerts */}
                  {alerts.map((a, i) => (
                    <div key={i} className={`alert-card ${a.type}`}>
                      <div style={{ fontSize: '1.2rem', flexShrink: 0 }}>{a.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 3 }}>{a.title}</div>
                        <div style={{ fontSize: '.82rem', opacity: .8 }}>{a.desc}</div>
                      </div>
                    </div>
                  ))}

                  {/* Stats */}
                  {selectedChild && (
                    <>
                      <div className="stats-grid" style={{ marginBottom: 24, marginTop: 8 }}>
                        {[
                          { num: `${overallProgress}%`, label: 'Overall Progress', sub: 'All subjects', color: 'var(--rose)' },
                          { num: quizzes.length, label: 'Quizzes Taken', sub: 'All subjects', color: 'var(--teal)' },
                          { num: quizzes.length ? `${avgScore}%` : '—', label: 'Average Score', sub: 'Quiz average', color: 'var(--gold)' },
                          { num: progress.length, label: 'Subjects Active', sub: 'Being tracked', color: 'var(--purple)' },
                        ].map(s => (
                          <div key={s.label} className="stat-card">
                            <div className="stat-num" style={{ color: s.color }}>{s.num}</div>
                            <div className="stat-label">{s.label}</div>
                            <div className="stat-sub" style={{ color: s.color }}>{s.sub}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button className="btn btn-teal btn-sm" onClick={() => setSection('progress')}>📈 View Progress →</button>
                        <button className="btn btn-ghost btn-sm" onClick={handleExport} disabled={exporting}>
                          {exporting ? '⏳ Generating…' : '⬇ Download PDF Report'}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── PROGRESS ── */}
          {section === 'progress' && (
            <div>
              <div className="section-header">
                <h2>📈 Academic Progress</h2>
                <p>{selectedChild ? `Detailed progress report for ${selectedChild.name}` : 'Select a child to view their progress.'}</p>
              </div>

              {!selectedChild ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ccc' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👆</div>
                  <div style={{ fontWeight: 600, color: '#888' }}>No child selected</div>
                  <div style={{ fontSize: '.88rem', marginTop: 6 }}>Go to Overview and select a child.</div>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={() => setSection('overview')}>← Back to Overview</button>
                </div>
              ) : (
                <>
                  {/* Subject progress bars */}
                  {progress.length > 0 ? (
                    <div className="card card-pad" style={{ marginBottom: 20 }}>
                      <h4 style={{ marginBottom: 20 }}>📚 Progress by Subject</h4>
                      {progress.map(p => (
                        <div key={p.subject} style={{ marginBottom: 18 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                            <span style={{ fontWeight: 600, fontSize: '.9rem' }}>{SUBJECTS[p.subject]?.icon} {p.subject}</span>
                            <span style={{ fontWeight: 700, fontSize: '.88rem', color: subjectColors[p.subject] || 'var(--teal)' }}>{p.percent}%</span>
                          </div>
                          <ProgressBar value={p.percent} color={subjectColors[p.subject] || 'var(--teal)'} height={10} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#ccc', marginBottom: 20 }}>
                      <div style={{ fontSize: '2rem', marginBottom: 8 }}>📊</div>
                      <div style={{ fontSize: '.88rem' }}>No subject progress yet. Progress appears after quizzes are taken.</div>
                    </div>
                  )}

                  {/* Quiz results table */}
                  {quizzes.length > 0 && (
                    <div className="card card-pad">
                      <h4 style={{ marginBottom: 16 }}>📝 Recent Quiz Results</h4>
                      <div className="data-table-wrap" style={{ boxShadow: 'none', border: '1px solid var(--mist)' }}>
                        <table className="data-table">
                          <thead><tr><th>Subject</th><th>Grade</th><th>Score</th><th>Result</th><th>Date</th></tr></thead>
                          <tbody>
                            {quizzes.slice(0, 15).map(q => (
                              <tr key={q.id}>
                                <td><b>{q.subject}</b></td>
                                <td>Grade {q.grade}</td>
                                <td>{q.score}/{q.total}</td>
                                <td><span className={`pill ${q.percent >= 70 ? 'pill-green' : q.percent >= 50 ? 'pill-amber' : 'pill-red'}`}>{q.percent}%</span></td>
                                <td style={{ color: '#aaa', fontSize: '.8rem' }}>{new Date(q.created_at).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {quizzes.length === 0 && progress.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ccc' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📊</div>
                      <div style={{ fontWeight: 600, color: '#888' }}>No activity recorded yet</div>
                      <div style={{ fontSize: '.88rem', marginTop: 6 }}>Encourage {selectedChild.name.split(' ')[0]} to take a quiz!</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── REPORTS ── */}
          {section === 'reports' && (
            <div>
              <div className="section-header">
                <h2>📄 Reports</h2>
                <p>Download detailed progress reports for your children.</p>
              </div>

              {!selectedChild ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ccc' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👆</div>
                  <div style={{ fontWeight: 600, color: '#888' }}>No child selected</div>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={() => setSection('overview')}>← Back to Overview</button>
                </div>
              ) : (
                <>
                  <div className="report-card">
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--rose-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>📊</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>Full Progress Report — {selectedChild.name}</div>
                      <div style={{ color: '#888', fontSize: '.85rem', lineHeight: 1.6 }}>
                        Includes subject progress, quiz history, average scores, and a performance summary. Downloaded as a PDF.
                      </div>
                    </div>
                    <button className="btn btn-rose btn-sm" onClick={handleExport} disabled={exporting} style={{ flexShrink: 0 }}>
                      {exporting ? '⏳ Generating…' : '⬇ Download PDF'}
                    </button>
                  </div>

                  <div style={{ padding: '16px 20px', background: '#fff8e8', border: '1px solid var(--gold-light, #f0d9a0)', borderRadius: 12, fontSize: '.87rem', color: '#996600', marginTop: 8 }}>
                    💡 <b>Tip:</b> Progress scores update automatically after each quiz. For the most up-to-date report, make sure {selectedChild.name.split(' ')[0]} has recently taken quizzes.
                  </div>

                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ marginBottom: 16 }}>📋 Report Preview</h4>
                    <div className="stats-grid">
                      {[
                        { num: `${overallProgress}%`, label: 'Overall Progress', color: 'var(--rose)' },
                        { num: quizzes.length, label: 'Quizzes Taken', color: 'var(--teal)' },
                        { num: quizzes.length ? `${avgScore}%` : '—', label: 'Average Score', color: 'var(--gold)' },
                        { num: progress.length, label: 'Active Subjects', color: 'var(--purple)' },
                      ].map(s => (
                        <div key={s.label} className="stat-card">
                          <div className="stat-num" style={{ color: s.color }}>{s.num}</div>
                          <div className="stat-label">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── MANAGE CHILDREN ── */}
          {section === 'manage' && (
            <div>
              <div className="section-header">
                <h2>👥 Manage Children</h2>
                <p>Link your children's accounts or remove existing connections.</p>
              </div>

              {isReal && <LinkChildSection profile={profile} onLinked={() => { loadChildren(); setSection('overview') }} />}

              {children.length > 0 && (
                <div className="card card-pad" style={{ marginTop: 24 }}>
                  <h4 style={{ marginBottom: 16 }}>Linked Children ({children.length})</h4>
                  {children.map((c, i) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < children.length - 1 ? '1px solid var(--mist)' : 'none' }}>
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: CHILD_COLORS[i % CHILD_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{c.name}</div>
                        <div style={{ fontSize: '.8rem', color: '#888', marginTop: 2 }}>Grade {c.grade || '—'} · {c.email}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedChild(c); setSection('progress') }}>View Progress</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleUnlink(c)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {children.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#ccc' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>👨‍👩‍👧</div>
                  <div style={{ fontSize: '.88rem' }}>No children linked yet. Use the form above to add your first child.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
