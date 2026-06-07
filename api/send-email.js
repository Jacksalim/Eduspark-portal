// api/send-email.js
// Vercel serverless function — sends branded EduSpark emails via Resend API.
// Supported types: 'welcome' | 'confirmed' | 'reset'
//
// Request body: { type, to, name, role, resetLink? }

const FROM = process.env.RESEND_FROM_EMAIL || 'EduSpark <onboarding@resend.dev>'

// ─── HTML Email Templates ─────────────────────────────────────────────────────

function layout(title, previewText, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f3f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;mso-hide:all;">

  <!-- Preview text (shows in inbox preview) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f3f7;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px 60px;">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a1f1f 0%,#1a6b6b 60%,#1f8080 100%);padding:44px 40px 40px;text-align:center;">
              <div style="font-size:40px;margin-bottom:14px;line-height:1;">🎓</div>
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;line-height:1.1;">
                Edu<span style="color:#c9a84c;">Spark</span>
              </div>
              <p style="color:rgba(255,255,255,.55);font-size:13px;margin:8px 0 0;letter-spacing:2px;text-transform:uppercase;">Online Tutoring Portal</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:44px 44px 36px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 44px;">
              <hr style="border:none;border-top:1px solid #e8edf3;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 44px 40px;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;line-height:1.7;margin:0 0 8px;">
                You're receiving this email because you registered on EduSpark.<br/>
                If you didn't create an account, you can safely ignore this email.
              </p>
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} EduSpark · Online Tutoring Portal · Kenya
              </p>
              <p style="margin:12px 0 0;">
                <a href="mailto:support@eduspark.co.ke" style="color:#1a6b6b;font-size:12px;text-decoration:none;">support@eduspark.co.ke</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- End card -->

      </td>
    </tr>
  </table>

</body>
</html>`
}

function ctaButton(href, label, bg = '#1a6b6b') {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
  <tr>
    <td align="center">
      <a href="${href}" target="_blank"
         style="display:inline-block;background:${bg};color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:16px 36px;border-radius:12px;letter-spacing:0.2px;line-height:1.2;">
        ${label}
      </a>
    </td>
  </tr>
</table>`
}

function alertBox(text, bg = '#e6f5f5', border = '#1a6b6b') {
  return `
<div style="background:${bg};border-left:4px solid ${border};border-radius:8px;padding:16px 20px;margin:20px 0;font-size:14px;color:#374151;line-height:1.6;">
  ${text}
</div>`
}

// ── Template: Welcome (sent immediately after sign-up) ────────────────────────
function welcomeTemplate({ name, role }) {
  const firstName = (name || 'there').split(' ')[0]
  const roleLabel = role === 'parent' ? 'Parent' : role === 'admin' ? 'Tutor / Admin' : 'Learner'
  const roleIcon  = role === 'parent' ? '👨‍👩‍👧' : role === 'admin' ? '🖥️' : '📚'
  const roleDesc  = role === 'parent'
    ? "Link your children's accounts and monitor their progress in real time."
    : role === 'admin'
    ? 'Upload lessons, generate AI quizzes, and manage your learners.'
    : 'Access video lessons, take AI-powered quizzes, and track your progress.'

  const body = `
<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#1a2332;margin:0 0 8px;line-height:1.25;">
  Welcome to EduSpark, ${firstName}! 🎉
</h1>
<p style="color:#6b7280;font-size:15px;margin:0 0 24px;line-height:1.65;">
  Your account has been created as a <strong>${roleLabel}</strong>. You're one step away from accessing your dashboard.
</p>

${alertBox(`<strong>📧 One more step:</strong> We've sent a confirmation email to your address. Click the confirmation link to activate your account and start learning.`, '#fffbeb', '#c9a84c')}

<p style="color:#374151;font-size:15px;margin:24px 0 16px;font-weight:600;">As a ${roleLabel} ${roleIcon}, you can:</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  ${['Access curriculum-aligned video lessons', 'Generate AI quizzes powered by Claude', 'Track academic progress across subjects', roleDesc]
    .map(item => `
  <tr>
    <td width="28" valign="top" style="padding:6px 0;">
      <div style="width:22px;height:22px;background:#e6f5f5;border-radius:50%;text-align:center;font-size:12px;line-height:22px;color:#1a6b6b;font-weight:700;">✓</div>
    </td>
    <td style="padding:6px 0 6px 8px;color:#374151;font-size:14px;line-height:1.55;">${item}</td>
  </tr>`).join('')}
</table>

<p style="color:#9ca3af;font-size:13px;margin:28px 0 0;line-height:1.65;text-align:center;">
  Didn't create this account? You can safely ignore this email.
</p>`

  return {
    subject: `Welcome to EduSpark, ${firstName}! — Confirm your email to get started`,
    html: layout(`Welcome to EduSpark, ${firstName}!`, `Your EduSpark account is ready — confirm your email to start learning.`, body)
  }
}

// ── Template: Email Confirmed / Account Activated ─────────────────────────────
function confirmedTemplate({ name, role }) {
  const firstName = (name || 'there').split(' ')[0]
  const roleLabel = role === 'parent' ? 'Parent' : role === 'admin' ? 'Tutor / Admin' : 'Learner'
  const appUrl = process.env.APP_URL || process.env.VITE_SUPABASE_URL?.replace(/supabase\.co.*/, '') || 'https://eduspark.vercel.app'

  const body = `
<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#1a2332;margin:0 0 8px;line-height:1.25;">
  Email Confirmed! You're all set. ✅
</h1>
<p style="color:#6b7280;font-size:15px;margin:0 0 24px;line-height:1.65;">
  Hi ${firstName}, your EduSpark account as a <strong>${roleLabel}</strong> is now fully active. Your learning journey starts now!
</p>

<div style="background:linear-gradient(135deg,#0a1f1f,#1a6b6b);border-radius:14px;padding:28px;margin:0 0 28px;text-align:center;">
  <div style="font-size:36px;margin-bottom:10px;">🚀</div>
  <p style="color:rgba(255,255,255,.9);font-size:16px;font-weight:600;margin:0 0 6px;">Ready to spark your learning?</p>
  <p style="color:rgba(255,255,255,.55);font-size:13px;margin:0;">Sign in to access your personalised dashboard.</p>
</div>

${ctaButton(appUrl, 'Go to My Dashboard →')}

<p style="color:#9ca3af;font-size:13px;margin:8px 0 0;text-align:center;line-height:1.65;">
  Or copy this link: <a href="${appUrl}" style="color:#1a6b6b;">${appUrl}</a>
</p>`

  return {
    subject: `You're in! Welcome to EduSpark, ${firstName} 🎓`,
    html: layout(`Account Confirmed — EduSpark`, `Your EduSpark account is confirmed and ready. Sign in to start learning.`, body)
  }
}

// ── Template: Password Reset ───────────────────────────────────────────────────
function resetTemplate({ name, resetLink }) {
  const firstName = (name || 'there').split(' ')[0]

  const body = `
<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#1a2332;margin:0 0 8px;line-height:1.25;">
  Reset your password 🔐
</h1>
<p style="color:#6b7280;font-size:15px;margin:0 0 24px;line-height:1.65;">
  Hi ${firstName}, we received a request to reset the password for your EduSpark account. Click the button below to choose a new password.
</p>

${ctaButton(resetLink || '#', 'Set New Password →', '#1a6b6b')}

${alertBox(`<strong>⏱ This link expires in 1 hour.</strong> If you didn't request a password reset, you can safely ignore this email — your account remains secure.`, '#fff8e8', '#c9a84c')}

<p style="color:#9ca3af;font-size:13px;margin:20px 0 0;line-height:1.65;">
  If the button above doesn't work, paste this URL into your browser:<br/>
  <span style="color:#1a6b6b;word-break:break-all;font-size:12px;">${resetLink || 'Link included in the Supabase confirmation email'}</span>
</p>`

  return {
    subject: `EduSpark — Reset your password`,
    html: layout(`Reset Your EduSpark Password`, `Click the link to set a new password for your EduSpark account.`, body)
  }
}

// ─── Resend API Caller ────────────────────────────────────────────────────────
async function sendViaResend({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY environment variable is not set')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html })
  })

  const data = await res.json()
  if (!res.ok) {
    const msg = data?.message || data?.name || `Resend error ${res.status}`
    throw new Error(msg)
  }
  return data
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { type, to, name, role, resetLink } = req.body || {}

  if (!type || !to) {
    return res.status(400).json({ error: '`type` and `to` are required' })
  }

  console.log(`[send-email] type=${type} to=${to} name=${name}`)

  let template
  try {
    if (type === 'welcome')   template = welcomeTemplate({ name, role })
    else if (type === 'confirmed') template = confirmedTemplate({ name, role })
    else if (type === 'reset')     template = resetTemplate({ name, resetLink })
    else return res.status(400).json({ error: `Unknown email type: "${type}". Use welcome|confirmed|reset` })
  } catch (err) {
    console.error('[send-email] Template error:', err)
    return res.status(500).json({ error: 'Template generation failed: ' + err.message })
  }

  try {
    const result = await sendViaResend({ to, subject: template.subject, html: template.html })
    console.log(`[send-email] ✅ Sent ${type} email to ${to}. ID: ${result.id}`)
    return res.status(200).json({ success: true, id: result.id, type, to })
  } catch (err) {
    console.error(`[send-email] ❌ Failed to send ${type} to ${to}:`, err.message)
    // Return 200 so the frontend doesn't break — email failure is non-fatal
    return res.status(200).json({ success: false, error: err.message, type, to })
  }
}
