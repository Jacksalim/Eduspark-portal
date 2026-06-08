import { useState, useEffect, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'

// ── helpers ────────────────────────────────────────────────────────────────────
const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

const FU = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] },
})

function useCountUp(target, inView, duration = 2000) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    const t0 = performance.now()
    const step = ts => {
      const p = Math.min((ts - t0) / duration, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [inView, target, duration])
  return val
}

// ── data ───────────────────────────────────────────────────────────────────────
const STATS = [
  { value: 12000, suffix: '+', label: 'Active Learners',    icon: '🎓' },
  { value: 50000, suffix: '+', label: 'Quizzes Completed',  icon: '✅' },
  { value: 500,   suffix: '+', label: 'Video Lessons',      icon: '🎬' },
  { value: 98,    suffix: '%', label: 'Parent Satisfaction', icon: '⭐' },
]

const FEATURES = [
  { icon: '🤖', title: 'AI Quiz Generation',     color: '#1a6b6b', desc: 'Claude AI generates unique, curriculum-aligned quizzes for every grade and subject in seconds — no two quizzes are the same.' },
  { icon: '🎬', title: 'Video Learning Library',  color: '#7c3aed', desc: 'Access high-quality educational videos organised by grade and subject. Learn at your own pace, anytime, anywhere.' },
  { icon: '👨‍👩‍👧', title: 'Parent Monitoring',    color: '#d97706', desc: "Parents get a real-time view of their child's progress, quiz results, and activity — without needing to ask." },
  { icon: '📈', title: 'Progress Tracking',       color: '#059669', desc: 'Every quiz score and lesson is recorded. See growth across all subjects over time with detailed charts.' },
  { icon: '🏆', title: 'Leaderboards',            color: '#dc2626', desc: 'Subject-based leaderboards motivate learners through healthy competition and achievement recognition.' },
  { icon: '🎯', title: 'Personalised Learning',   color: '#6366f1', desc: "Adaptive content recommendations based on each learner's performance history and exact grade level." },
]

const STEPS = [
  { num: '01', icon: '👤', title: 'Create Your Account',   desc: 'Sign up as a Learner, Parent, or Tutor. Choose your grade level and subjects in under 60 seconds.' },
  { num: '02', icon: '📚', title: 'Learn and Practice',    desc: 'Watch curriculum-aligned video lessons and take AI-generated quizzes tailored to your exact grade.' },
  { num: '03', icon: '📊', title: 'Track and Improve',     desc: 'Monitor your progress with visual charts. Parents stay informed. Tutors grow their learners.' },
]

const BENEFITS = {
  learner: {
    label: 'Learners', icon: '🎓', color: '#1a6b6b',
    headline: 'Learn at your own pace — your way',
    desc: 'Everything you need to excel from Grade R through Grade 12, all in one place.',
    items: [
      '🤖  AI quizzes personalised to your grade and subject',
      '⚡  Instant feedback with explanations for every answer',
      '📈  Live progress tracking across all subjects',
      '🏆  Achievement badges and class leaderboards',
      '🎬  Video lessons from qualified educators',
      '📱  Mobile-friendly — learn anywhere, anytime',
    ],
  },
  parent: {
    label: 'Parents', icon: '👨‍👩‍👧', color: '#d97706',
    headline: 'Stay informed. Stay in control.',
    desc: "Get a complete picture of your child's academic journey — without the guesswork.",
    items: [
      "👁️  Real-time view of your child's progress",
      '📊  Performance trends and full quiz history',
      '📧  Email progress reports with PDF download',
      '🔗  Link multiple children to one account',
      '🚨  Alerts when performance needs attention',
      "🕐  See exactly when your child last studied",
    ],
  },
  tutor: {
    label: 'Tutors', icon: '🖥️', color: '#6366f1',
    headline: 'Manage your learners with confidence',
    desc: 'A complete toolkit for tutors to deliver, track, and improve learning outcomes.',
    items: [
      '📤  Upload video lessons by subject and grade',
      '🤖  Generate AI quizzes for any topic instantly',
      '📋  View all learner profiles and progress',
      '📊  Track engagement across all video content',
      '🏅  Manage the class leaderboard',
      '📈  Analyse performance trends over time',
    ],
  },
}

const TESTIMONIALS = [
  { name: 'Amina Ochieng',  role: 'Grade 10 Learner · Nairobi', initials: 'AO', color: '#1a6b6b', text: "EduSpark made revision actually enjoyable. The AI quizzes are different every time so I never get bored, and watching my progress chart go up keeps me motivated!" },
  { name: 'David Kamau',    role: 'Parent of 2 · Mombasa',      initials: 'DK', color: '#d97706', text: "As a parent I love the monitoring dashboard. I can see exactly how my kids are doing without having to ask them. The PDF progress reports are a real bonus." },
  { name: 'Sarah Njeri',    role: 'Maths Tutor · Kisumu',       initials: 'SN', color: '#6366f1', text: "EduSpark is the only platform that lets me upload my own videos AND generate AI quizzes for my learners. The engagement tracking is invaluable." },
  { name: 'Brian Mutua',    role: 'Grade 8 Learner · Nakuru',   initials: 'BM', color: '#dc2626', text: "The leaderboard is everything! I went from bottom 5 to top 3 in Maths in one month. My friends and I compete every week now." },
]

const FAQS = [
  { q: 'Is EduSpark free to use?', a: 'EduSpark offers a free tier with access to AI quizzes and video lessons. Premium plans unlock unlimited access for serious learners and full parent monitoring.' },
  { q: 'What grades are supported?', a: 'EduSpark supports Grade R through Grade 12, covering the full school curriculum across all core subjects including Mathematics, Science, English, and more.' },
  { q: 'How does AI quiz generation work?', a: 'We use Claude AI (by Anthropic) to generate unique, curriculum-aligned multiple-choice questions. Every quiz is freshly generated — no two quizzes are ever identical.' },
  { q: 'Can parents monitor multiple children?', a: "Yes! Parents can link multiple children's accounts to their dashboard and switch between them seamlessly for a consolidated view of all progress." },
  { q: 'Are video lessons from qualified teachers?', a: 'All content is uploaded by qualified tutors and educators registered on the platform. Content is reviewed by admins before being made available.' },
  { q: 'How secure is my data?', a: 'EduSpark is built on Supabase with row-level security. Your data is encrypted and private — never sold to third parties.' },
  { q: 'How do I reset my password?', a: "Click \"Forgot password?\" on the Sign In page, enter your email, and we'll send a secure reset link. The link expires after 1 hour for your security." },
]

// ── sub-components ─────────────────────────────────────────────────────────────
function StatCard({ stat }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const count = useCountUp(stat.value, inView)
  return (
    <motion.div ref={ref} {...FU()} style={{ textAlign: 'center', padding: '36px 20px' }}>
      <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>{stat.icon}</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, color: 'var(--teal)', lineHeight: 1 }}>
        {count.toLocaleString()}{stat.suffix}
      </div>
      <div style={{ fontSize: '.75rem', color: '#999', marginTop: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
        {stat.label}
      </div>
    </motion.div>
  )
}

function FeatureCard({ f, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: i * 0.08 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      style={{ background: '#fff', borderRadius: 18, padding: '30px 26px', border: '1.5px solid var(--mist)', borderTop: `3px solid ${f.color}`, cursor: 'default', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}
    >
      <div style={{ width: 54, height: 54, borderRadius: 14, background: `${f.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', marginBottom: 18 }}>
        {f.icon}
      </div>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 10, color: 'var(--ink)' }}>{f.title}</h3>
      <p style={{ fontSize: '.88rem', color: '#777', lineHeight: 1.78 }}>{f.desc}</p>
    </motion.div>
  )
}

// ── main ───────────────────────────────────────────────────────────────────────
export default function Landing({ onGetStarted, onSignIn }) {
  const [activeTab, setActiveTab] = useState('learner')
  const [openFaq, setOpenFaq]     = useState(null)
  const [tIdx, setTIdx]           = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTIdx(i => (i + 1) % TESTIMONIALS.length), 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ flex: 1, overflowX: 'hidden' }}>

      {/* ════════ HERO ════════════════════════════════════════════════════ */}
      <section id="home" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', background: 'linear-gradient(150deg, #050c0c 0%, #0a1f1f 45%, #0e2d2d 100%)', overflow: 'hidden' }}>

        {/* Animated background blobs */}
        {[
          { w: 700, h: 700, top: -200,   right: -200, left: 'auto', bottom: 'auto', c: 'rgba(26,107,107,.28)',   dur: 18 },
          { w: 500, h: 500, bottom: -150, left: -150,  right: 'auto', top: 'auto',  c: 'rgba(201,168,76,.10)', dur: 24 },
          { w: 400, h: 400, top: '30%',   right: '20%', left: 'auto', bottom: 'auto', c: 'rgba(99,102,241,.08)',  dur: 14 },
        ].map((b, i) => (
          <motion.div key={i}
            style={{ position: 'absolute', width: b.w, height: b.h, borderRadius: '50%', background: `radial-gradient(circle, ${b.c} 0%, transparent 70%)`, filter: 'blur(70px)', top: b.top, right: b.right, bottom: b.bottom, left: b.left, pointerEvents: 'none', zIndex: 0 }}
            animate={{ scale: [1, 1.18, 0.88, 1], x: [0, 40, -20, 0], y: [0, -30, 18, 0] }}
            transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(100px,14vh,150px) clamp(24px,6vw,80px) clamp(80px,10vh,120px)', position: 'relative', zIndex: 1, width: '100%' }}>
          <div style={{ maxWidth: 780 }}>

            {/* Badge */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.28)', color: '#f0d9a0', fontSize: '.7rem', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', padding: '8px 18px', borderRadius: 50, marginBottom: 34 }}>
                🎓 AI-Powered Learning · Kenya
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1 initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
              style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(3rem,7.5vw,5.2rem)', fontWeight: 900, lineHeight: 1.03, color: '#fff', marginBottom: 26, letterSpacing: '-2px' }}>
              Learn Smarter,<br />
              <span style={{ background: 'linear-gradient(90deg, #c9a84c 20%, #f5e09a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Achieve More.
              </span>
            </motion.h1>

            {/* Sub */}
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              style={{ fontSize: 'clamp(1rem,2.2vw,1.18rem)', color: 'rgba(255,255,255,.62)', lineHeight: 1.82, maxWidth: 580, marginBottom: 46 }}>
              AI-powered learning, interactive quizzes, educational videos, and real-time progress tracking — all in one place.
            </motion.p>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
              style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: '0 10px 36px rgba(201,168,76,.45)' }}
                whileTap={{ scale: 0.97 }}
                onClick={onGetStarted}
                style={{ background: 'linear-gradient(135deg, #c9a84c, #a88535)', color: '#fff', border: 'none', padding: '17px 38px', borderRadius: 14, fontSize: '1.02rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                Get Started Free →
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04, background: 'rgba(255,255,255,.12)' }}
                whileTap={{ scale: 0.97 }}
                onClick={onSignIn}
                style={{ background: 'rgba(255,255,255,.06)', color: '#fff', border: '1.5px solid rgba(255,255,255,.18)', padding: '17px 38px', borderRadius: 14, fontSize: '1.02rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", backdropFilter: 'blur(8px)' }}>
                Sign In
              </motion.button>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}
              onClick={() => scrollTo('stats')}
              style={{ marginTop: 72, display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,.28)', fontSize: '.8rem', cursor: 'pointer', width: 'fit-content' }}>
              <motion.div animate={{ y: [0, 7, 0] }} transition={{ repeat: Infinity, duration: 1.7, ease: 'easeInOut' }}
                style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.78rem' }}>
                ↓
              </motion.div>
              Explore platform
            </motion.div>
          </div>
        </div>

        {/* Floating stat cards */}
        <div className="hero-floats" style={{ position: 'absolute', right: 'clamp(24px,5vw,80px)', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 14, zIndex: 2 }}>
          {[['12K+','Active Learners','🎓',0.5],['50K+','Quizzes Done','✅',0.65],['500+','Video Lessons','🎬',0.8],['98%','Parent Satisfaction','⭐',0.95]].map(([n, l, ic, d]) => (
            <motion.div key={l}
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: d }}
              whileHover={{ scale: 1.06, x: -4 }}
              style={{ background: 'rgba(255,255,255,.055)', backdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 16, padding: '16px 22px', textAlign: 'center', minWidth: 130 }}>
              <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{ic}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.45rem', fontWeight: 700, color: '#c9a84c', lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.42)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>{l}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ════════ STATS BAR ═══════════════════════════════════════════════ */}
      <section id="stats" style={{ background: '#fff', boxShadow: '0 2px 0 var(--mist)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', padding: '0 clamp(24px,6vw,80px)' }} className="stats-resp">
          {STATS.map((s, i) => (
            <div key={i} style={{ borderRight: i < 3 ? '1px solid var(--mist)' : 'none' }} className="stat-cell">
              <StatCard stat={s} />
            </div>
          ))}
        </div>
      </section>

      {/* ════════ FEATURES ════════════════════════════════════════════════ */}
      <section id="features" style={{ padding: 'clamp(72px,9vw,110px) clamp(24px,6vw,80px)', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div {...FU()} style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ display: 'inline-block', color: 'var(--teal)', fontSize: '.72rem', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 14, background: 'var(--teal-light)', padding: '7px 18px', borderRadius: 50 }}>✨ Platform Features</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(2rem,4.5vw,3.2rem)', marginBottom: 18, letterSpacing: '-0.5px' }}>Everything a Learner Needs</h2>
            <p style={{ color: '#777', fontSize: '1rem', maxWidth: 520, margin: '0 auto', lineHeight: 1.8 }}>
              From AI-powered quizzes to parent monitoring — EduSpark covers the complete learning journey.
            </p>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 22 }}>
            {FEATURES.map((f, i) => <FeatureCard key={i} f={f} i={i} />)}
          </div>
        </div>
      </section>

      {/* ════════ HOW IT WORKS ════════════════════════════════════════════ */}
      <section style={{ background: 'linear-gradient(150deg, #050c0c 0%, #0f2f2f 100%)', padding: 'clamp(72px,9vw,110px) clamp(24px,6vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div {...FU()} style={{ textAlign: 'center', marginBottom: 76 }}>
            <div style={{ display: 'inline-block', color: '#c9a84c', fontSize: '.72rem', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 14, background: 'rgba(201,168,76,.1)', padding: '7px 18px', borderRadius: 50 }}>🚀 How It Works</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(2rem,4.5vw,3.2rem)', color: '#fff', letterSpacing: '-0.5px' }}>Start Learning in 3 Steps</h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 48 }}>
            {STEPS.map((s, i) => (
              <motion.div key={i} {...FU(i * 0.15)} style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
                  <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(201,168,76,.08)', border: '2px solid rgba(201,168,76,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem' }}>
                    {s.icon}
                  </div>
                  <div style={{ position: 'absolute', top: -6, right: -6, width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #c9a84c, #a88535)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif", fontSize: '.68rem', fontWeight: 900, color: '#0a1f1f' }}>
                    {s.num}
                  </div>
                </div>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', color: '#fff', marginBottom: 12 }}>{s.title}</h3>
                <p style={{ fontSize: '.9rem', color: 'rgba(255,255,255,.52)', lineHeight: 1.8 }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div {...FU(0.3)} style={{ textAlign: 'center', marginTop: 68 }}>
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: '0 10px 36px rgba(201,168,76,.45)' }}
              whileTap={{ scale: 0.97 }}
              onClick={onGetStarted}
              style={{ background: 'linear-gradient(135deg, #c9a84c, #a88535)', color: '#fff', border: 'none', padding: '16px 42px', borderRadius: 14, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
              Join EduSpark Today →
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ════════ ROLE BENEFITS ═══════════════════════════════════════════ */}
      <section id="about" style={{ padding: 'clamp(72px,9vw,110px) clamp(24px,6vw,80px)', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div {...FU()} style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-block', color: 'var(--teal)', fontSize: '.72rem', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 14, background: 'var(--teal-light)', padding: '7px 18px', borderRadius: 50 }}>🌟 Who Is It For?</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(2rem,4.5vw,3.2rem)', letterSpacing: '-0.5px' }}>Built for Every Role</h2>
          </motion.div>

          {/* Role tabs */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 52, flexWrap: 'wrap' }}>
            {Object.entries(BENEFITS).map(([key, b]) => (
              <motion.button key={key}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveTab(key)}
                style={{ padding: '12px 30px', borderRadius: 50, border: '2px solid', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: '.93rem', transition: 'all .2s',
                  borderColor: activeTab === key ? b.color : 'var(--mist)',
                  background: activeTab === key ? b.color : '#fff',
                  color: activeTab === key ? '#fff' : '#888' }}>
                {b.icon} {b.label}
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {Object.entries(BENEFITS).map(([key, b]) => activeTab === key && (
              <motion.div key={key}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 60, alignItems: 'center' }}>

                <div>
                  <div style={{ fontSize: '3.2rem', marginBottom: 20 }}>{b.icon}</div>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.5rem,3vw,2.1rem)', marginBottom: 14, lineHeight: 1.2 }}>{b.headline}</h3>
                  <p style={{ color: '#777', lineHeight: 1.82, marginBottom: 34, fontSize: '.97rem' }}>{b.desc}</p>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onGetStarted}
                    style={{ background: b.color, color: '#fff', border: 'none', padding: '14px 30px', borderRadius: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, cursor: 'pointer', fontSize: '.95rem' }}>
                    Get Started →
                  </motion.button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {b.items.map((item, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      style={{ background: 'var(--cream)', borderRadius: 12, padding: '14px 16px', fontSize: '.87rem', color: '#444', lineHeight: 1.6, border: '1px solid var(--mist)' }}>
                      {item}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* ════════ TESTIMONIALS ════════════════════════════════════════════ */}
      <section style={{ padding: 'clamp(72px,9vw,110px) clamp(24px,6vw,80px)', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div {...FU()} style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', color: 'var(--teal)', fontSize: '.72rem', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 14, background: 'var(--teal-light)', padding: '7px 18px', borderRadius: 50 }}>💬 What People Say</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(2rem,4.5vw,3.2rem)', letterSpacing: '-0.5px' }}>Loved by Learners & Parents</h2>
          </motion.div>

          <div style={{ position: 'relative', maxWidth: 620, margin: '0 auto' }}>
            <AnimatePresence mode="wait">
              <motion.div key={tIdx}
                initial={{ opacity: 0, x: 36 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -36 }}
                transition={{ duration: 0.38, ease: 'easeOut' }}>
                <div style={{ background: '#fff', borderRadius: 22, padding: '36px 40px', boxShadow: '0 6px 30px rgba(0,0,0,.07)', border: '1px solid var(--mist)' }}>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 22 }}>
                    {'★★★★★'.split('').map((s, i) => <span key={i} style={{ color: '#c9a84c', fontSize: '1.15rem' }}>{s}</span>)}
                  </div>
                  <p style={{ fontSize: '1.02rem', lineHeight: 1.82, color: '#444', marginBottom: 28, fontStyle: 'italic' }}>
                    "{TESTIMONIALS[tIdx].text}"
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: TESTIMONIALS[tIdx].color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '.9rem', flexShrink: 0 }}>
                      {TESTIMONIALS[tIdx].initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '.93rem', color: 'var(--ink)' }}>{TESTIMONIALS[tIdx].name}</div>
                      <div style={{ fontSize: '.78rem', color: '#aaa', marginTop: 2 }}>{TESTIMONIALS[tIdx].role}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dots */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 28 }}>
              {TESTIMONIALS.map((_, i) => (
                <button key={i} onClick={() => setTIdx(i)}
                  style={{ width: i === tIdx ? 26 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', transition: 'all .25s', padding: 0, background: i === tIdx ? 'var(--teal)' : 'var(--mist)' }} />
              ))}
            </div>

            {/* Nav arrows */}
            {[-1, 1].map((dir, i) => (
              <button key={i}
                onClick={() => setTIdx(x => (x + dir + TESTIMONIALS.length) % TESTIMONIALS.length)}
                style={{ position: 'absolute', [i === 0 ? 'left' : 'right']: -60, top: '40%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: '#fff', border: '1px solid var(--mist)', cursor: 'pointer', fontSize: '1.1rem', boxShadow: '0 2px 14px rgba(0,0,0,.09)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                className="test-arrow">
                {dir === -1 ? '←' : '→'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FAQ ══════════════════════════════════════════════════════ */}
      <section style={{ padding: 'clamp(72px,9vw,110px) clamp(24px,6vw,80px)', background: '#fff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <motion.div {...FU()} style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', color: 'var(--teal)', fontSize: '.72rem', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 14, background: 'var(--teal-light)', padding: '7px 18px', borderRadius: 50 }}>❓ FAQ</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(2rem,4.5vw,3.2rem)', letterSpacing: '-0.5px' }}>Common Questions</h2>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((faq, i) => (
              <motion.div key={i} {...FU(i * 0.04)}
                style={{ background: openFaq === i ? '#f7fbfb' : '#fff', border: '1.5px solid', borderColor: openFaq === i ? 'var(--teal)' : 'var(--mist)', borderRadius: 14, overflow: 'hidden', transition: 'border-color .2s, background .2s' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", textAlign: 'left', gap: 16 }}>
                  <span style={{ fontWeight: 600, fontSize: '.97rem', color: 'var(--ink)', lineHeight: 1.45 }}>{faq.q}</span>
                  <motion.span animate={{ rotate: openFaq === i ? 45 : 0 }} transition={{ duration: 0.2 }}
                    style={{ fontSize: '1.5rem', color: 'var(--teal)', flexShrink: 0, fontWeight: 300, lineHeight: 1 }}>+</motion.span>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '0 24px 22px', color: '#666', fontSize: '.92rem', lineHeight: 1.82, borderTop: '1px solid var(--mist)' }}>
                        <div style={{ paddingTop: 16 }}>{faq.a}</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ CONTACT ══════════════════════════════════════════════════ */}
      <section id="contact" style={{ padding: 'clamp(72px,9vw,110px) clamp(24px,6vw,80px)', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div {...FU()} style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-block', color: 'var(--teal)', fontSize: '.72rem', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 14, background: 'var(--teal-light)', padding: '7px 18px', borderRadius: 50 }}>📬 Get In Touch</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(2rem,4.5vw,3.2rem)', letterSpacing: '-0.5px', marginBottom: 12 }}>Contact Us</h2>
            <p style={{ color: '#777', fontSize: '.97rem' }}>Questions or feedback? We'd love to hear from you.</p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(196px, 1fr))', gap: 18, maxWidth: 900, margin: '0 auto 56px' }}>
            {[
              { icon: '👤', label: 'Founder',  value: 'Jack Abuya',                     href: null },
              { icon: '✉️', label: 'Email',    value: 'eduspark.portal@gmail.com',       href: 'mailto:eduspark.portal@gmail.com' },
              { icon: '🌐', label: 'Website',  value: 'eduspark.ink',                    href: 'https://eduspark.ink' },
              { icon: '📍', label: 'Location', value: 'Kenya',                           href: null },
            ].map((c, i) => (
              <motion.div key={i} {...FU(i * 0.08)}
                whileHover={{ y: -5, boxShadow: '0 10px 32px rgba(0,0,0,.1)' }}
                style={{ background: '#fff', borderRadius: 18, padding: '28px 20px', border: '1px solid var(--mist)', textAlign: 'center', transition: 'box-shadow .2s' }}>
                <div style={{ fontSize: '1.9rem', marginBottom: 10 }}>{c.icon}</div>
                <div style={{ fontSize: '.67rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#c0c0c0', marginBottom: 7 }}>{c.label}</div>
                {c.href
                  ? <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                      style={{ color: 'var(--teal)', fontWeight: 600, fontSize: '.88rem', textDecoration: 'none', wordBreak: 'break-all' }}>{c.value}</a>
                  : <div style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--ink)' }}>{c.value}</div>}
              </motion.div>
            ))}
          </div>

          {/* CTA banner */}
          <motion.div {...FU(0.15)}
            style={{ background: 'linear-gradient(135deg, #0a1f1f 0%, #1a6b6b 100%)', borderRadius: 22, padding: 'clamp(36px,5vw,56px) clamp(28px,5vw,64px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 28 }}>
            <div>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.4rem,3vw,2rem)', color: '#fff', marginBottom: 8 }}>Ready to start learning?</h3>
              <p style={{ color: 'rgba(255,255,255,.58)', fontSize: '.93rem' }}>Join EduSpark today — it's free to sign up.</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 10px 36px rgba(201,168,76,.5)' }}
              whileTap={{ scale: 0.97 }}
              onClick={onGetStarted}
              style={{ background: 'linear-gradient(135deg, #c9a84c, #a88535)', color: '#fff', border: 'none', padding: '16px 38px', borderRadius: 14, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}>
              Get Started Free →
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ════════ FOOTER ══════════════════════════════════════════════════ */}
      <footer style={{ background: '#050c0c', color: 'rgba(255,255,255,.48)', padding: 'clamp(52px,7vw,80px) clamp(24px,6vw,80px) 30px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: 52, marginBottom: 60 }}>

            {/* Brand */}
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.75rem', fontWeight: 900, color: '#c9a84c', marginBottom: 14 }}>
                Edu<span style={{ color: '#fff' }}>Spark</span>
              </div>
              <p style={{ fontSize: '.87rem', lineHeight: 1.88, maxWidth: 248, marginBottom: 26 }}>
                Empowering learners across Kenya through smart, accessible, AI-powered education.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                {[['𝕏','https://twitter.com'],['in','https://linkedin.com'],['▶','https://youtube.com'],['f','https://facebook.com']].map(([icon, href]) => (
                  <a key={href} href={href} target="_blank" rel="noreferrer"
                    style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.55)', textDecoration: 'none', fontSize: '.82rem', fontWeight: 700, transition: 'background .2s, color .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,.22)'; e.currentTarget.style.color = '#c9a84c' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.07)'; e.currentTarget.style.color = 'rgba(255,255,255,.55)' }}>
                    {icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '.72rem', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 22 }}>Quick Links</div>
              {[['Home','home'],['Features','features'],['About','about'],['Contact','contact']].map(([l, id]) => (
                <button key={id} onClick={() => scrollTo(id)}
                  style={{ display: 'block', background: 'none', border: 'none', color: 'rgba(255,255,255,.48)', cursor: 'pointer', fontSize: '.88rem', padding: '5px 0', fontFamily: "'DM Sans',sans-serif", textAlign: 'left', transition: 'color .15s', width: '100%' }}
                  onMouseEnter={e => e.target.style.color = '#c9a84c'}
                  onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.48)'}>
                  → {l}
                </button>
              ))}
            </div>

            {/* Platform */}
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '.72rem', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 22 }}>Platform</div>
              {[['Sign In', onSignIn], ['Get Started', onGetStarted]].map(([l, fn]) => (
                <button key={l} onClick={fn}
                  style={{ display: 'block', background: 'none', border: 'none', color: 'rgba(255,255,255,.48)', cursor: 'pointer', fontSize: '.88rem', padding: '5px 0', fontFamily: "'DM Sans',sans-serif", textAlign: 'left', transition: 'color .15s', width: '100%' }}
                  onMouseEnter={e => e.target.style.color = '#c9a84c'}
                  onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.48)'}>
                  → {l}
                </button>
              ))}
            </div>

            {/* Contact */}
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '.72rem', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 22 }}>Contact</div>
              {[
                ['✉️', 'eduspark.portal@gmail.com', 'mailto:eduspark.portal@gmail.com'],
                ['🌐', 'eduspark.ink', 'https://eduspark.ink'],
                ['📍', 'Kenya', null],
              ].map(([ic, val, href]) => (
                <div key={val} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, fontSize: '.88rem', lineHeight: 1.5 }}>
                  <span>{ic}</span>
                  {href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" style={{ color: 'rgba(255,255,255,.48)', textDecoration: 'none' }}>{val}</a> : <span>{val}</span>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: '.8rem' }}>© 2026 EduSpark. All rights reserved.</div>
            <div style={{ fontSize: '.8rem' }}>Built with ❤️ for learners across Kenya</div>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 1060px) { .hero-floats { display: none !important; } }
        @media (max-width: 700px)  { .stats-resp { grid-template-columns: 1fr 1fr !important; } .stat-cell:nth-child(2) { border-right: none !important; } }
        @media (max-width: 420px)  { .stats-resp { grid-template-columns: 1fr !important; } .stat-cell { border-right: none !important; } }
        @media (max-width: 580px)  { .test-arrow { display: none !important; } }
      `}</style>
    </div>
  )
}
