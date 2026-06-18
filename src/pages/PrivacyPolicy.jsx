// src/pages/PrivacyPolicy.jsx
import { useNavigate } from 'react-router-dom'

export function PrivacyPolicy({ modal = false, onClose }) {
  const navigate = useNavigate()
  const close = onClose || (() => navigate(-1))

  const content = (
    <div style={{ fontFamily: 'inherit', color: '#374151', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 28 }}>Last updated: June 2026 · EduSpark (eduspark.ink)</p>

      <Section title="1. Who We Are">
        EduSpark is an online learning platform operated by Jack Abuya, based in Kenya. We provide
        CBC-aligned educational content, AI-powered quizzes, and learning progress tracking for
        students, parents, and tutors across Kenya. Contact us at eduspark.portal@gmail.com.
      </Section>

      <Section title="2. Information We Collect">
        <b>Account information:</b> When you register, we collect your full name, email address,
        phone number, and role (student, parent, or tutor). Students may optionally provide their
        grade level.<br /><br />
        <b>Learning data:</b> We collect quiz scores, lesson watch history, progress milestones,
        and leaderboard participation to power your learning experience.<br /><br />
        <b>Tutor application data:</b> Applicants submit qualifications, National ID/Passport
        number, teaching experience, certifications, professional references, and a motivation
        statement. Document links (CV, certificates) are stored as URLs you provide.<br /><br />
        <b>Technical data:</b> We log page visits, session timestamps, and device information
        to maintain platform security and improve performance.
      </Section>

      <Section title="3. How We Use Your Information">
        We use your data to: provide and personalise your learning experience; track progress and
        generate reports for students and linked parents; process and review tutor applications;
        send notifications about your account activity; maintain platform security; and comply
        with applicable Kenyan law including the Data Protection Act, 2019.
      </Section>

      <Section title="4. Data Sharing">
        We do not sell your personal data. We share data only:<br />
        • With Supabase (our database provider) under strict data processing terms;<br />
        • With Google (Gemini AI) and Anthropic (Claude AI) solely to generate quiz questions —
          no personally identifiable information is sent to AI providers;<br />
        • With parents who are approved and linked to a student account (learning data only);<br />
        • With platform administrators for moderation and support purposes;<br />
        • Where required by Kenyan law or lawful court order.
      </Section>

      <Section title="5. Data Retention">
        We retain your account data for as long as your account is active. If you delete your
        account, personal data is removed within 30 days, except where we are required by law
        to retain certain records. Audit logs are retained for 12 months for security purposes.
      </Section>

      <Section title="6. Your Rights">
        Under the Kenya Data Protection Act, 2019, you have the right to: access your personal
        data; correct inaccurate data; request deletion of your data; object to processing;
        and withdraw consent at any time. To exercise these rights, email
        eduspark.portal@gmail.com. We will respond within 21 days.
      </Section>

      <Section title="7. Children's Privacy">
        EduSpark is designed for learners of all ages including minors. Students under 18 should
        have parental awareness of their account. Parents can link to their child's account to
        monitor activity. We do not knowingly collect data from children for commercial purposes.
      </Section>

      <Section title="8. Security">
        We use Supabase Row Level Security, encrypted connections (HTTPS/TLS), and
        role-based access controls to protect your data. No system is completely secure;
        please use a strong, unique password for your account.
      </Section>

      <Section title="9. Cookies">
        We use essential session cookies to keep you logged in. We do not use advertising
        or tracking cookies. You can clear cookies via your browser settings, but this will
        log you out of EduSpark.
      </Section>

      <Section title="10. Changes to This Policy">
        We may update this policy from time to time. We will notify registered users of
        material changes via email or an in-app notification. Continued use of EduSpark
        after changes constitutes acceptance of the updated policy.
      </Section>

      <Section title="11. Contact">
        Questions about this policy? Contact us at:<br />
        📧 eduspark.portal@gmail.com<br />
        📞 +254 759 666 992<br />
        🌐 eduspark.ink
      </Section>
    </div>
  )

  if (modal) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}>
        <div style={{
          background: 'white', borderRadius: 16, width: '100%', maxWidth: 640,
          maxHeight: '85vh', overflowY: 'auto', padding: '32px 28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}>
          {content}
          <button onClick={close} style={{
            marginTop: 24, width: '100%', padding: '11px 0', background: '#6366f1',
            color: 'white', border: 'none', borderRadius: 8, fontSize: 15,
            fontWeight: 600, cursor: 'pointer',
          }}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{
        maxWidth: 720, margin: '0 auto', background: 'white',
        borderRadius: 16, padding: '40px 36px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      }}>
        {content}
        <button onClick={close} style={{
          marginTop: 32, padding: '10px 24px', background: '#f3f4f6',
          color: '#374151', border: 'none', borderRadius: 8,
          fontSize: 14, cursor: 'pointer',
        }}>← Go back</button>
      </div>
    </div>
  )
}

export function TermsAndConditions({ modal = false, onClose }) {
  const navigate = useNavigate()
  const close = onClose || (() => navigate(-1))

  const content = (
    <div style={{ fontFamily: 'inherit', color: '#374151', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Terms and Conditions</h1>
      <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 28 }}>Last updated: June 2026 · EduSpark (eduspark.ink)</p>

      <Section title="1. Acceptance of Terms">
        By creating an account on EduSpark, you agree to these Terms and Conditions in full.
        If you do not agree, please do not use the platform. These terms form a binding
        agreement between you and EduSpark (operated by Jack Abuya, Kenya).
      </Section>

      <Section title="2. Eligibility">
        EduSpark is open to learners, parents, and qualified tutors in Kenya and beyond.
        Users under 18 are welcome as learners. Tutor applicants must be at least 18 years
        old and hold valid academic qualifications. By registering, you confirm the information
        you provide is accurate and complete.
      </Section>

      <Section title="3. Account Responsibilities">
        You are responsible for maintaining the confidentiality of your password and for all
        activity under your account. Do not share your login credentials. Notify us immediately
        at eduspark.portal@gmail.com if you suspect unauthorised access to your account.
        Accounts found sharing credentials may be suspended.
      </Section>

      <Section title="4. Acceptable Use">
        You agree not to:<br />
        • Use the platform for any unlawful purpose;<br />
        • Upload or share harmful, offensive, or misleading content;<br />
        • Attempt to access accounts, data, or systems you are not authorised to use;<br />
        • Interfere with platform security, performance, or other users' experience;<br />
        • Impersonate another person or entity;<br />
        • Use automated tools to scrape or extract content without permission.
      </Section>

      <Section title="5. Tutor Conduct">
        Approved tutors agree to: provide accurate qualifications; upload only original or
        properly licensed educational content; interact professionally with students and parents;
        maintain their profile information accurately. EduSpark reserves the right to revoke
        tutor status and remove content that violates these terms.
      </Section>

      <Section title="6. Parent-Student Linking">
        Parents may request to monitor linked students' learning data. Students must approve
        all parent link requests. Linked parents may only view learning progress, quiz results,
        and activity data — they cannot modify student account settings or take actions on
        behalf of the student.
      </Section>

      <Section title="7. AI-Generated Content">
        EduSpark uses AI (Google Gemini and Anthropic Claude) to generate quiz questions.
        AI-generated content is provided for educational purposes and may occasionally contain
        errors. EduSpark does not guarantee the accuracy of AI-generated quiz questions and
        recommends students verify information with their teachers or textbooks.
      </Section>

      <Section title="8. Intellectual Property">
        All platform content, design, branding, and code is the property of EduSpark unless
        otherwise stated. Tutor-uploaded educational materials remain the property of the
        uploading tutor, who grants EduSpark a non-exclusive licence to display and distribute
        the content to registered learners. You may not reproduce, distribute, or sell
        EduSpark content without written permission.
      </Section>

      <Section title="9. Termination">
        EduSpark may suspend or terminate your account at any time for violation of these terms,
        fraudulent activity, or at our discretion with reasonable notice. You may delete your
        account at any time by contacting eduspark.portal@gmail.com.
      </Section>

      <Section title="10. Disclaimer of Warranties">
        EduSpark is provided "as is" without warranties of any kind. We do not guarantee
        uninterrupted access, error-free operation, or specific learning outcomes. Educational
        content is supplementary and does not replace formal schooling or qualified tutoring.
      </Section>

      <Section title="11. Limitation of Liability">
        To the maximum extent permitted by Kenyan law, EduSpark and its operators shall not
        be liable for indirect, incidental, or consequential damages arising from your use of
        the platform, including loss of data, loss of progress records, or reliance on
        AI-generated content.
      </Section>

      <Section title="12. Governing Law">
        These terms are governed by the laws of Kenya. Any disputes shall be subject to the
        jurisdiction of the Kenyan courts. We encourage resolution of disputes through
        direct communication before pursuing legal action.
      </Section>

      <Section title="13. Contact">
        Questions about these terms? Contact us at:<br />
        📧 eduspark.portal@gmail.com<br />
        📞 +254 759 666 992<br />
        🌐 eduspark.ink
      </Section>
    </div>
  )

  if (modal) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}>
        <div style={{
          background: 'white', borderRadius: 16, width: '100%', maxWidth: 640,
          maxHeight: '85vh', overflowY: 'auto', padding: '32px 28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}>
          {content}
          <button onClick={close} style={{
            marginTop: 24, width: '100%', padding: '11px 0', background: '#6366f1',
            color: 'white', border: 'none', borderRadius: 8, fontSize: 15,
            fontWeight: 600, cursor: 'pointer',
          }}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px' }}>
      <div style={{
        maxWidth: 720, margin: '0 auto', background: 'white',
        borderRadius: 16, padding: '40px 36px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      }}>
        {content}
        <button onClick={close} style={{
          marginTop: 32, padding: '10px 24px', background: '#f3f4f6',
          color: '#374151', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer',
        }}>← Go back</button>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 14 }}>{children}</p>
    </div>
  )
}
