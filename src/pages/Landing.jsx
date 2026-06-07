import { useEffect, useRef } from 'react'
function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

const FEATURES = [
  { icon: '🎬', title: 'Interactive Video Lessons', desc: 'Access high-quality educational videos organised by grade and subject. Learn at your own pace, anytime, anywhere.' },
  { icon: '🤖', title: 'AI-Powered Quiz Generation', desc: 'Claude AI generates unique, curriculum-aligned quizzes for every grade and subject in seconds — no two quizzes are the same.' },
  { icon: '📊', title: 'Learner Progress Tracking', desc: 'Every quiz score and lesson watched is recorded. Learners see their growth across all subjects over time.' },
  { icon: '👨‍👩‍👧', title: 'Parent Monitoring Dashboard', desc: "Parents get a real-time view of their child's progress, quiz results, and activity — without needing to ask." },
  { icon: '📚', title: 'Subject-Based Learning Resources', desc: 'Content is neatly organised by subject and grade — from Mathematics and Science to Business Studies and English.' },
  { icon: '🔒', title: 'Secure Online Learning Environment', desc: "Built on Supabase with row-level security. Every learner's data is private, protected, and accessible only to them." },
]

export default function Landing({ onGetStarted, onSignIn }) {
  return (
    <div style={{ flex: 1, overflowX: 'hidden' }}>

      {/* HERO */}
      <section id="home" style={{
        background: 'linear-gradient(135deg, #0d0d0d 0%, #0f2a2a 60%, #1a4040 100%)',
        color: '#fff',
        padding: 'clamp(72px,10vw,120px) clamp(20px,6vw,80px) clamp(60px,8vw,100px)',
        position: 'relative', overflow: 'hidden', minHeight: '92vh',
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{ position: 'absolute', top: -120, right: -120, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,.13) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,107,107,.2) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 780, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.3)', color: '#f0d9a0', fontSize: '.75rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 30, marginBottom: 28 }}>
            🎓 Online Tutoring Portal · Kenya
          </div>

          <h1 style={{ fontSize: 'clamp(2.4rem,6vw,4rem)', lineHeight: 1.1, fontFamily: "'Playfair Display',serif", fontWeight: 900, color: '#fff', marginBottom: 24 }}>
            Learn Smarter,<br />
            <span style={{ color: '#c9a84c' }}>Achieve More</span>
          </h1>

          <p style={{ fontSize: 'clamp(.95rem,2vw,1.15rem)', color: 'rgba(255,255,255,.72)', lineHeight: 1.8, maxWidth: 580, marginBottom: 40 }}>
            EduSpark provides interactive learning, AI-powered quizzes, progress tracking, and educational videos for learners, parents, and tutors.
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <button className="btn btn-gold" style={{ padding: '14px 32px', fontSize: '1rem', borderRadius: 12 }} onClick={onGetStarted}>
              Get Started →
            </button>
            <button className="btn btn-outline" style={{ padding: '14px 32px', fontSize: '1rem', borderRadius: 12 }} onClick={onSignIn}>
              Sign In
            </button>
          </div>

          <div style={{ marginTop: 64, display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,.35)', fontSize: '.8rem', cursor: 'pointer' }} onClick={() => scrollTo('features')}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem' }}>↓</div>
            Explore features
          </div>
        </div>

        {/* Floating stat cards */}
        <div style={{ position: 'absolute', right: 'clamp(20px,5vw,80px)', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 16, zIndex: 1 }} className="hero-stats">
          {[['500+','Video Lessons'],['13','Grades'],['10','Subjects'],['AI','Quiz Engine']].map(([n,l]) => (
            <div key={l} style={{ background: 'rgba(255,255,255,.07)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 14, padding: '16px 24px', textAlign: 'center', minWidth: 120 }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.6rem', fontWeight: 700, color: '#c9a84c' }}>{n}</div>
              <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.5)', marginTop: 2, letterSpacing: '.5px', textTransform: 'uppercase' }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: 'clamp(60px,8vw,100px) clamp(20px,6vw,80px)', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-tag" style={{ justifyContent: 'center', display: 'flex' }}>✨ What We Offer</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.8rem,4vw,2.8rem)', marginBottom: 16 }}>
              Everything a Learner Needs
            </h2>
            <p style={{ color: '#777', fontSize: '1rem', maxWidth: 520, margin: '0 auto', lineHeight: 1.75 }}>
              From video lessons to AI quizzes and parent dashboards — EduSpark covers the full learning journey.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} style={{
                background: '#fff', borderRadius: 16, padding: '28px 26px',
                border: '1.5px solid var(--mist)', transition: 'all .2s',
                borderTop: `3px solid ${['var(--teal)','#c9a84c','var(--rose)','var(--purple)','#2d7a2d','#1a5fbf'][i % 6]}`,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                <div style={{ fontSize: '2rem', marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: '.88rem', color: '#777', lineHeight: 1.75 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: 'var(--ink)', color: '#fff', padding: 'clamp(60px,8vw,100px) clamp(20px,6vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', color: '#c9a84c', fontSize: '.75rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>🚀 How It Works</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#fff' }}>
              Start Learning in 3 Steps
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
            {[
              { step: '01', title: 'Create Your Account', desc: 'Sign up as a learner, parent, or tutor. Takes less than a minute.' },
              { step: '02', title: 'Choose Grade & Subject', desc: 'Browse lessons organised by grade and subject. Pick what you need.' },
              { step: '03', title: 'Learn, Quiz & Track', desc: 'Watch videos, take AI quizzes, and watch your progress grow over time.' },
            ].map(s => (
              <div key={s.step}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '3.5rem', fontWeight: 900, color: 'rgba(201,168,76,.2)', lineHeight: 1, marginBottom: 12 }}>{s.step}</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 10, color: '#fff' }}>{s.title}</h3>
                <p style={{ fontSize: '.88rem', color: 'rgba(255,255,255,.55)', lineHeight: 1.75 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" style={{ padding: 'clamp(60px,8vw,100px) clamp(20px,6vw,80px)', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 60, alignItems: 'center' }}>
          <div>
            <div className="section-tag">About EduSpark</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.8rem,4vw,2.6rem)', marginBottom: 20, lineHeight: 1.2 }}>
              Built to Help Every<br />Learner Succeed
            </h2>
            <p style={{ color: '#666', lineHeight: 1.85, fontSize: '.97rem', marginBottom: 20 }}>
              EduSpark is an online tutoring portal designed to help learners improve academic performance through personalized learning experiences, educational videos, quizzes, and performance analytics.
            </p>
            <p style={{ color: '#666', lineHeight: 1.85, fontSize: '.97rem', marginBottom: 32 }}>
              Whether you're a learner working through Grade 7 Mathematics, a parent wanting to stay informed, or a tutor looking to reach more students — EduSpark brings everything into one place.
            </p>
            <button className="btn btn-teal" onClick={onGetStarted}>Join EduSpark Today →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { icon: '🎯', label: 'Curriculum-Aligned', sub: 'CAPS & Kenya curriculum' },
              { icon: '🌍', label: 'Kenya Based', sub: 'Serving all regions' },
              { icon: '🤖', label: 'AI-Powered', sub: 'Claude by Anthropic' },
              { icon: '🔒', label: 'Secure & Private', sub: 'Row-level security' },
            ].map(c => (
              <div key={c.label} style={{ background: 'var(--cream)', borderRadius: 14, padding: '20px', border: '1px solid var(--mist)' }}>
                <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>{c.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{c.label}</div>
                <div style={{ fontSize: '.78rem', color: '#999', marginTop: 3 }}>{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ padding: 'clamp(60px,8vw,100px) clamp(20px,6vw,80px)', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="section-tag" style={{ justifyContent: 'center', display: 'flex' }}>📬 Get In Touch</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.8rem,4vw,2.6rem)', marginBottom: 12 }}>Contact Us</h2>
            <p style={{ color: '#777', fontSize: '.97rem' }}>Have questions? We'd love to hear from you.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, maxWidth: 900, margin: '0 auto' }}>
            {[
              { icon: '👤', label: 'Tutor', value: 'Jack Abuya' },
              { icon: '✉️', label: 'Email', value: 'eduspark.portal@gmail.com', href: 'mailto:eduspark.portal@gmail.com' },
              { icon: '📞', label: 'Phone', value: '+254 759 666 992', href: 'tel:+254759666992' },
              { icon: '📍', label: 'Location', value: 'Kenya' },
            ].map(c => (
              <div key={c.label} style={{ background: '#fff', borderRadius: 16, padding: '24px', border: '1px solid var(--mist)', boxShadow: 'var(--shadow)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>{c.icon}</div>
                <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#aaa', marginBottom: 6 }}>{c.label}</div>
                {c.href ? (
                  <a href={c.href} style={{ color: 'var(--teal)', fontWeight: 600, fontSize: '.9rem', textDecoration: 'none', wordBreak: 'break-all' }}>{c.value}</a>
                ) : (
                  <div style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--ink)' }}>{c.value}</div>
                )}
              </div>
            ))}
          </div>

          {/* CTA banner */}
          <div style={{ marginTop: 56, background: 'linear-gradient(135deg, var(--teal), #0f3535)', borderRadius: 20, padding: 'clamp(32px,5vw,48px) clamp(24px,5vw,56px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.3rem,3vw,1.8rem)', color: '#fff', marginBottom: 8 }}>Ready to start learning?</h3>
              <p style={{ color: 'rgba(255,255,255,.65)', fontSize: '.92rem' }}>Join EduSpark today — it's free to sign up.</p>
            </div>
            <button className="btn btn-gold" style={{ padding: '14px 32px', fontSize: '1rem', flexShrink: 0 }} onClick={onGetStarted}>
              Get Started Free →
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: 'var(--ink)', color: 'rgba(255,255,255,.55)', padding: 'clamp(40px,6vw,60px) clamp(20px,6vw,80px) 28px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 48 }}>

            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.6rem', fontWeight: 900, color: '#c9a84c', marginBottom: 12 }}>
                Edu<span style={{ color: '#fff' }}>Spark</span>
              </div>
              <p style={{ fontSize: '.85rem', lineHeight: 1.75, maxWidth: 240 }}>
                Empowering learners across Kenya and beyond through smart, accessible online education.
              </p>
            </div>

            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '.82rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16 }}>Quick Links</div>
              {[['Home','home'],['Features','features'],['About','about'],['Contact','contact']].map(([label, id]) => (
                <div key={id} style={{ marginBottom: 10 }}>
                  <button onClick={() => scrollTo(id)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.55)', cursor: 'pointer', fontSize: '.88rem', padding: 0, fontFamily: "'DM Sans',sans-serif", transition: 'color .15s' }}
                    onMouseEnter={e => e.target.style.color = '#c9a84c'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.55)'}>
                    {label}
                  </button>
                </div>
              ))}
            </div>

            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '.82rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16 }}>Contact</div>
              <div style={{ fontSize: '.88rem', marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span>✉️</span>
                <a href="mailto:eduspark.portal@gmail.com" style={{ color: 'rgba(255,255,255,.55)', textDecoration: 'none' }}>eduspark.portal@gmail.com</a>
              </div>
              <div style={{ fontSize: '.88rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📞</span>
                <a href="tel:+254759666992" style={{ color: 'rgba(255,255,255,.55)', textDecoration: 'none' }}>+254 759 666 992</a>
              </div>
              <div style={{ fontSize: '.88rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📍</span> Kenya
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: '.82rem' }}>© 2026 EduSpark. All rights reserved.</div>
            <div style={{ fontSize: '.82rem' }}>Built with ❤️ for learners everywhere</div>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 900px) { .hero-stats { display: none !important; } }
        @media (max-width: 600px) { #contact > div > div:nth-child(2) { grid-template-columns: 1fr 1fr; } }
      `}</style>
    </div>
  )
}