// src/pages/public/Blog.jsx
import PublicPageShell from '../../components/PublicPageShell'

const POSTS = [
  {
    title: 'Understanding the CBC Curriculum: A Guide for Parents',
    excerpt: 'A plain-language walkthrough of how Competency Based Curriculum assessment works, and what it means for your child\'s daily learning.',
    date: 'Coming soon',
    icon: '📘',
  },
  {
    title: '5 Ways to Help Your Child Stay Motivated to Study',
    excerpt: 'Practical, research-backed tips for parents supporting a learner through a busy school term.',
    date: 'Coming soon',
    icon: '✏️',
  },
  {
    title: 'How AI Quizzes Are Built — and Why They\'re Never the Same Twice',
    excerpt: 'A look behind the scenes at how EduSpark generates fresh, curriculum-aligned questions for every subject and grade.',
    date: 'Coming soon',
    icon: '🤖',
  },
]

export default function Blog() {
  return (
    <PublicPageShell title="Blog">
      <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 32, lineHeight: 1.7 }}>
        Tips, guides, and updates for learners, parents, and tutors. We're just getting
        started — check back soon for new posts.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {POSTS.map(p => (
          <div key={p.title} style={{
            display: 'flex', gap: 16, padding: '20px', background: '#f9fafb',
            borderRadius: 14, border: '1px solid #f3f4f6', alignItems: 'flex-start',
          }}>
            <div style={{ fontSize: 28 }}>{p.icon}</div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>{p.title}</h3>
              <p style={{ fontSize: 13.5, color: '#6b7280', lineHeight: 1.6, margin: '0 0 8px' }}>{p.excerpt}</p>
              <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>{p.date}</span>
            </div>
          </div>
        ))}
      </div>
    </PublicPageShell>
  )
}
