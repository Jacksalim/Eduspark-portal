export default function Landing({ onEnter }) {
  return (
    <div style={{ flex: 1 }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--ink) 55%, #1a4040 100%)',
        color: '#fff', padding: 'clamp(48px,8vw,96px) clamp(20px,6vw,80px)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -100, right: -100, width: 500, height: 500,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,.15) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 700, position: 'relative' }}>
          <div style={{ display: 'inline-block', background: 'rgba(201,168,76,.18)', color: 'var(--gold-light, #f0d9a0)', fontSize: '.75rem', fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 20, marginBottom: 20 }}>
            🎓 Online Tutoring Portal
          </div>
          <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', lineHeight: 1.15, color: '#fff' }}>
            Learn Smarter.<br /><span style={{ color: 'var(--gold)' }}>Go Further.</span>
          </h1>
          <p style={{ marginTop: 18, fontSize: '1.05rem', color: 'rgba(255,255,255,.72)', lineHeight: 1.75, maxWidth: 540 }}>
            Expert-led video lessons, AI-powered quizzes, and real-time progress tracking — for every grade, every subject, every learner.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 36, flexWrap: 'wrap' }}>
            <button className="btn btn-gold" onClick={() => onEnter('learner')}>Start Learning →</button>
            <button className="btn btn-outline" onClick={() => onEnter('parent')}>Parent Dashboard</button>
            <button className="btn btn-outline" onClick={() => onEnter('admin')}>Tutor Login</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', background: '#fff', borderBottom: '1px solid var(--mist)' }}>
        {[['500+','Video Lessons'],['13','Grades Covered'],['10','Core Subjects'],['AI','Powered Quizzes']].map(([n,l], i) => (
          <div key={l} style={{ padding: '24px 28px', textAlign: 'center', borderRight: i < 3 ? '1px solid var(--mist)' : 'none' }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', fontWeight: 700, color: 'var(--teal)' }}>{n}</div>
            <div style={{ fontSize: '.75rem', color: '#999', marginTop: 3, letterSpacing: '.5px', textTransform: 'uppercase' }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Portal Cards */}
      <div style={{ padding: 'clamp(40px,6vw,72px) clamp(20px,6vw,72px)' }}>
        <div className="section-tag">Portals</div>
        <h2 className="section-title">Who are you learning with today?</h2>
        <p className="section-sub" style={{ maxWidth: 500, marginBottom: 40 }}>
          Each portal is tailored to your role — learners, parents and tutors all in one place.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {[
            { role: 'learner', icon: '🎒', title: 'Learner Portal', desc: 'Watch lessons by grade & subject, take AI-powered quizzes and track your progress.', accent: 'var(--teal)', bg: 'var(--teal-light)', footBg: 'var(--teal)' },
            { role: 'parent',  icon: '👨‍👩‍👧', title: 'Parent Portal',  desc: "Monitor your child's activity, quiz scores, videos watched and overall progress.", accent: 'var(--rose)', bg: 'var(--rose-light)', footBg: 'var(--rose)' },
            { role: 'admin',   icon: '🖥️', title: 'Tutor Dashboard', desc: 'Upload videos, generate quizzes, manage learners and view all site analytics.', accent: 'var(--purple)', bg: 'var(--purple-light)', footBg: 'var(--purple)' },
          ].map(c => (
            <div key={c.role} onClick={() => onEnter(c.role)}
              style={{ borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)', cursor: 'pointer', transition: 'transform .2s, box-shadow .2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}>
              <div style={{ padding: '30px 26px 24px', background: c.bg }}>
                <div style={{ fontSize: '2.2rem', marginBottom: 14 }}>{c.icon}</div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>{c.title}</h3>
                <p style={{ fontSize: '.88rem', color: '#666', lineHeight: 1.65 }}>{c.desc}</p>
              </div>
              <div style={{ padding: '15px 26px', background: c.footBg, color: '#fff', fontSize: '.83rem', fontWeight: 700, letterSpacing: '.4px' }}>
                Enter {c.title} →
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features strip */}
      <div style={{ background: 'var(--ink)', color: '#fff', padding: 'clamp(40px,5vw,60px) clamp(20px,6vw,72px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32 }}>
          {[
            ['🎬','YouTube/Vimeo embed','Paste any video link from the admin panel — no coding needed.'],
            ['🤖','AI Quiz Generation','Claude generates curriculum-aligned quizzes per grade instantly.'],
            ['📊','Live Progress Tracking','Parents and tutors see real-time progress dashboards.'],
            ['🔒','Secure with Supabase','Row-level security keeps every learner\'s data private.'],
          ].map(([icon, title, desc]) => (
            <div key={title}>
              <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>{icon}</div>
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: '.95rem' }}>{title}</div>
              <div style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.55)', lineHeight: 1.65 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
