// src/pages/public/OurServices.jsx
import { useNavigate } from 'react-router-dom'
import PublicPageShell from '../../components/PublicPageShell'

const SERVICES = [
  {
    icon: '🤖',
    title: 'AI-Powered Quizzes',
    desc: 'Fresh, curriculum-aligned quiz questions generated for every grade and subject — no two attempts are ever the same, so learners can practice as much as they need.',
  },
  {
    icon: '🎬',
    title: 'Video Lessons',
    desc: 'A structured library of lessons organised by grade and subject, so students always see content that matches exactly where they are in the CBC curriculum.',
  },
  {
    icon: '📝',
    title: 'Notes & Revision Materials',
    desc: 'Topic-by-topic study notes plus past papers and revision guides, all automatically filtered to the learner\'s own grade.',
  },
  {
    icon: '📊',
    title: 'Progress Tracking & Promotion',
    desc: 'Every quiz attempt feeds into topic-level mastery tracking. When a learner is ready, they\'re offered the choice to advance to the next grade — or repeat for extra practice.',
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Parent Monitoring',
    desc: 'Parents can securely link to their child\'s account (with the student\'s approval) to follow progress, quiz results, and activity in real time.',
  },
  {
    icon: '🎓',
    title: 'Tutor Platform',
    desc: 'Qualified tutors can apply, get verified by our admin team, and contribute lessons, quizzes, and feedback directly to learners on the platform.',
  },
  {
    icon: '🏆',
    title: 'Leaderboards',
    desc: 'Friendly, anonymised competition within each grade and subject keeps learners motivated without compromising privacy.',
  },
]

export default function OurServices() {
  const navigate = useNavigate()

  return (
    <PublicPageShell title="Our Services">
      <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 32, lineHeight: 1.7 }}>
        EduSpark brings together everything a CBC learner needs in one place — built for
        Kenyan students, parents, and tutors.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 32 }}>
        {SERVICES.map(s => (
          <div key={s.title} style={{
            padding: '22px 20px', background: '#f9fafb', borderRadius: 14,
            border: '1px solid #f3f4f6',
          }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>{s.icon}</div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{s.title}</h3>
            <p style={{ fontSize: 13.5, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
          </div>
        ))}
      </div>

      <button onClick={() => navigate('/register')} style={{
        padding: '12px 28px', background: '#6366f1', color: 'white',
        border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
      }}>
        Get started for free
      </button>
    </PublicPageShell>
  )
}
