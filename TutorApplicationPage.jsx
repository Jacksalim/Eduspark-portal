// src/pages/TutorApplicationPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const SUBJECTS = [
  'Mathematics', 'English', 'Kiswahili', 'Science', 'Social Studies',
  'Physics', 'Chemistry', 'Biology', 'History', 'Geography',
  'Business Studies', 'Computer Science', 'Art', 'Music', 'Physical Education',
]

export default function TutorApplicationPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [existingApp, setExistingApp] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState(null)
  const [success,     setSuccess]     = useState(false)

  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    email: profile?.email ?? '',
    phone: '',
    national_id: '',
    qualifications: '',
    subjects: [],
    years_experience: 0,
    certifications: '',
    references: '',
    motivation: '',
    cv_url: '',
    certificates_url: '',
  })

  useEffect(() => {
    async function checkExisting() {
      const { data } = await supabase
        .from('tutor_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (data) setExistingApp(data)
      setLoading(false)
    }
    checkExisting()
  }, [user.id])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const toggleSubject = (subject) => {
    setForm(f => ({
      ...f,
      subjects: f.subjects.includes(subject)
        ? f.subjects.filter(s => s !== subject)
        : [...f.subjects, subject],
    }))
  }

  const validate = () => {
    if (!form.full_name.trim())     return 'Full name is required'
    if (!form.email.trim())         return 'Email is required'
    if (!form.national_id.trim())   return 'National ID / Passport is required'
    if (!form.qualifications.trim()) return 'Qualifications are required'
    if (form.subjects.length === 0) return 'Select at least one subject'
    if (!form.motivation.trim())    return 'Motivation statement is required'
    if (form.motivation.length < 100) return 'Motivation statement should be at least 100 characters'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }

    setError(null)
    setSubmitting(true)

    const { error } = await supabase.from('tutor_applications').insert({
      user_id: user.id,
      ...form,
      years_experience: Number(form.years_experience),
    })

    setSubmitting(false)
    if (error) { setError(error.message); return }
    setSuccess(true)
  }

  if (loading) return <PageShell><p style={{ color: '#6b7280' }}>Loading…</p></PageShell>

  if (existingApp) {
    return (
      <PageShell>
        <StatusCard app={existingApp} onBack={() => navigate('/student')} />
      </PageShell>
    )
  }

  if (success) {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{
            width: 64, height: 64, background: '#f0fdf4', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#16a34a" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            Application submitted!
          </h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
            Our team will review your application and respond within 3–5 business days.
          </p>
          <button onClick={() => navigate('/student')} style={btnStyle}>
            Back to dashboard
          </button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
        Tutor application
      </h1>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28 }}>
        Apply to become an EduSpark tutor. All fields marked * are required.
      </p>

      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '10px 14px', color: '#b91c1c', fontSize: 14, marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Section title="Personal details">
          <Row>
            <Field label="Full name *" name="full_name" value={form.full_name} onChange={handleChange} required />
            <Field label="Email *" name="email" type="email" value={form.email} onChange={handleChange} required />
          </Row>
          <Row>
            <Field label="Phone number" name="phone" type="tel" value={form.phone} onChange={handleChange} />
            <Field label="National ID / Passport *" name="national_id" value={form.national_id} onChange={handleChange} required />
          </Row>
        </Section>

        <Section title="Qualifications">
          <Textarea label="Academic qualifications *" name="qualifications"
            value={form.qualifications} onChange={handleChange}
            placeholder="Degree, diploma, institution, graduation year…" rows={3} required />

          <div>
            <label style={labelStyle}>Teaching subjects * (select all that apply)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {SUBJECTS.map(s => (
                <button key={s} type="button" onClick={() => toggleSubject(s)} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                  border: '1.5px solid',
                  borderColor: form.subjects.includes(s) ? '#6366f1' : '#e5e7eb',
                  background: form.subjects.includes(s) ? '#eef2ff' : 'white',
                  color: form.subjects.includes(s) ? '#4338ca' : '#6b7280',
                  fontWeight: form.subjects.includes(s) ? 600 : 400,
                }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Row>
            <Field label="Years of teaching experience" name="years_experience"
              type="number" value={form.years_experience} onChange={handleChange}
              min={0} max={50} />
            <Field label="Teaching certifications" name="certifications"
              value={form.certifications} onChange={handleChange}
              placeholder="TSC number, KNEC, etc." />
          </Row>
        </Section>

        <Section title="Supporting documents (optional)">
          <Row>
            <Field label="CV / Resume URL" name="cv_url" type="url" value={form.cv_url}
              onChange={handleChange} placeholder="https://drive.google.com/…" />
            <Field label="Certificates URL" name="certificates_url" type="url"
              value={form.certificates_url} onChange={handleChange}
              placeholder="https://drive.google.com/…" />
          </Row>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: -8 }}>
            Upload documents to Google Drive / Dropbox and paste the shareable link above.
          </p>
        </Section>

        <Section title="References & motivation">
          <Textarea label="Professional references" name="references"
            value={form.references} onChange={handleChange}
            placeholder="Name, role, institution, contact info (one per line)" rows={3} />
          <Textarea label="Motivation statement * (min 100 characters)" name="motivation"
            value={form.motivation} onChange={handleChange}
            placeholder="Why do you want to teach on EduSpark? What's your teaching philosophy?" rows={5} required />
          <p style={{ fontSize: 12, color: form.motivation.length < 100 ? '#ef4444' : '#6b7280' }}>
            {form.motivation.length} / 100 characters minimum
          </p>
        </Section>

        <button type="submit" disabled={submitting} style={{
          ...btnStyle, opacity: submitting ? 0.6 : 1,
          cursor: submitting ? 'not-allowed' : 'pointer',
        }}>
          {submitting ? 'Submitting…' : 'Submit application'}
        </button>
      </form>
    </PageShell>
  )
}

// ─── Status card for existing applications ────────────────────────────────────

function StatusCard({ app, onBack }) {
  const STATUS_CONFIG = {
    pending:  { color: '#92400e', bg: '#fffbeb', icon: '⏳', label: 'Under review' },
    approved: { color: '#065f46', bg: '#f0fdf4', icon: '✅', label: 'Approved' },
    rejected: { color: '#991b1b', bg: '#fef2f2', icon: '❌', label: 'Not approved' },
  }
  const cfg = STATUS_CONFIG[app.status]

  return (
    <div>
      <div style={{
        background: cfg.bg, borderRadius: 12, padding: 24, textAlign: 'center',
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{cfg.icon}</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: cfg.color, marginBottom: 8 }}>
          {cfg.label}
        </h2>
        <p style={{ fontSize: 14, color: cfg.color, opacity: 0.8 }}>
          {app.status === 'pending' && 'Your application is being reviewed. You'll receive a notification once a decision is made.'}
          {app.status === 'approved' && 'Congratulations! You now have access to the Tutor Dashboard.'}
          {app.status === 'rejected' && 'Unfortunately your application was not approved at this time.'}
        </p>
        {app.admin_notes && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'white',
            borderRadius: 8, textAlign: 'left', fontSize: 13, color: '#374151' }}>
            <strong>Admin notes:</strong> {app.admin_notes}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ ...btnStyle, flex: 1 }}>
          Back to dashboard
        </button>
        {app.status === 'approved' && (
          <a href="/tutor" style={{
            ...btnStyle, flex: 1, display: 'inline-block', textAlign: 'center',
            textDecoration: 'none', background: '#059669',
          }}>
            Open Tutor Dashboard
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function PageShell({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#f9fafb', padding: '32px 16px',
    }}>
      <div style={{
        maxWidth: 720, margin: '0 auto', background: 'white',
        borderRadius: 16, padding: '36px 32px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      }}>
        {children}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend style={{
        fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 14,
        paddingBottom: 8, borderBottom: '1px solid #f3f4f6', width: '100%',
      }}>
        {title}
      </legend>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </fieldset>
  )
}

function Row({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{children}</div>
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }
const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14,
  border: '1.5px solid #e5e7eb', outline: 'none', boxSizing: 'border-box',
}

function Field({ label, name, type = 'text', value, onChange, required, placeholder, min, max }) {
  return (
    <div>
      <label htmlFor={name} style={labelStyle}>{label}</label>
      <input id={name} name={name} type={type} value={value} onChange={onChange}
        required={required} placeholder={placeholder} min={min} max={max} style={inputStyle} />
    </div>
  )
}

function Textarea({ label, name, value, onChange, required, placeholder, rows = 4 }) {
  return (
    <div>
      <label htmlFor={name} style={labelStyle}>{label}</label>
      <textarea id={name} name={name} value={value} onChange={onChange}
        required={required} placeholder={placeholder} rows={rows}
        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
    </div>
  )
}

const btnStyle = {
  padding: '11px 24px', background: '#6366f1', color: 'white',
  border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
  cursor: 'pointer', textDecoration: 'none',
}
