// src/pages/public/AboutUs.jsx
import { useNavigate } from 'react-router-dom'
import PublicPageShell from '../../components/PublicPageShell'

export default function AboutUs() {
  const navigate = useNavigate()

  return (
    <PublicPageShell title="About Us">
      <Section title="Our Story">
        EduSpark was founded with a simple goal: make high-quality, CBC-aligned learning
        accessible to every student in Kenya, regardless of where they live or what
        resources their school has. We combine AI-powered quizzes, structured video
        lessons, and real human tutors to give every learner a personalised path through
        the curriculum.
      </Section>

      <Section title="What We Believe">
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Every learner deserves curriculum-aligned content built for their grade — not generic material.</li>
          <li>Parents should be able to see their child's progress without having to ask.</li>
          <li>Technology should support teachers and tutors, not replace them.</li>
          <li>Education data is sensitive — we protect it accordingly.</li>
        </ul>
      </Section>

      <Section title="How It Works">
        Students sign up once and choose their grade — from there, every lesson, quiz,
        and revision material on EduSpark is automatically tailored to that level. As
        students progress through the academic year, our platform tracks their mastery
        of each topic and recommends when they're ready to advance to the next grade.
        Parents can link to their child's account to follow along, and qualified tutors
        can apply to create content and support learners directly.
      </Section>

      <Section title="Get in Touch">
        Have questions, feedback, or partnership ideas? We'd love to hear from you.<br />
        📧 eduspark.portal@gmail.com<br />
        📞 +254 759 666 992
      </Section>

      <button onClick={() => navigate('/register')} style={{
        marginTop: 8, padding: '12px 28px', background: '#6366f1', color: 'white',
        border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
      }}>
        Join EduSpark today
      </button>
    </PublicPageShell>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 10 }}>{title}</h2>
      <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}
