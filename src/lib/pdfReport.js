const TEAL   = [26, 107, 107]
const GOLD   = [201, 168, 76]
const INK    = [18, 30, 30]
const MIST   = [232, 237, 243]
const WHITE  = [255, 255, 255]
const ROSE   = [163, 60, 60]
const PURPLE = [107, 79, 160]

function hex(r, g, b) { return [r, g, b] }

function pill(doc, x, y, label, color) {
  const w = doc.getTextWidth(label) + 10
  doc.setFillColor(...color)
  doc.roundedRect(x, y - 4.5, w, 6.5, 2, 2, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text(label, x + 5, y)
  doc.setTextColor(...INK)
}

function progressBar(doc, x, y, value, color, width = 120) {
  const h = 5
  doc.setFillColor(...MIST)
  doc.roundedRect(x, y, width, h, 2, 2, 'F')
  if (value > 0) {
    doc.setFillColor(...color)
    doc.roundedRect(x, y, Math.max(4, (value / 100) * width), h, 2, 2, 'F')
  }
}

function scoreColor(pct) {
  if (pct >= 70) return [37, 102, 37]
  if (pct >= 50) return [180, 122, 0]
  return [...ROSE]
}

export async function generateProgressReport({ child, progress, quizzes }) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 18

  // ── Cover band ──────────────────────────────────────────────────────────────
  doc.setFillColor(...INK)
  doc.rect(0, 0, W, 36, 'F')

  doc.setTextColor(...GOLD)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('EduSpark', margin, 16)

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Online Tutoring Portal', margin, 23)

  doc.setTextColor(180, 180, 180)
  doc.setFontSize(8)
  doc.text(`Generated ${new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}`, W - margin, 23, { align: 'right' })

  // ── Learner identity card ────────────────────────────────────────────────────
  let y = 46
  doc.setFillColor(...TEAL)
  doc.roundedRect(margin, y, W - margin * 2, 22, 3, 3, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(child.name || 'Learner', margin + 8, y + 9)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.text(`Grade ${child.grade || '—'}  ·  ${child.email || ''}`, margin + 8, y + 16)

  doc.setTextColor(...INK)

  // ── Summary stats ────────────────────────────────────────────────────────────
  y += 32
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', margin, y)

  const avgScore = quizzes.length
    ? Math.round(quizzes.reduce((a, q) => a + q.percent, 0) / quizzes.length)
    : 0
  const overallProgress = progress.length
    ? Math.round(progress.reduce((a, p) => a + p.percent, 0) / progress.length)
    : 0

  y += 6
  const statW = (W - margin * 2) / 3 - 4
  const stats = [
    { label: 'Overall Progress', value: `${overallProgress}%`, color: TEAL },
    { label: 'Quizzes Taken',    value: String(quizzes.length), color: PURPLE },
    { label: 'Average Score',    value: `${avgScore}%`,         color: GOLD },
  ]

  stats.forEach((s, i) => {
    const sx = margin + i * (statW + 4)
    doc.setFillColor(...MIST)
    doc.roundedRect(sx, y, statW, 18, 3, 3, 'F')
    doc.setTextColor(...s.color)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(s.value, sx + statW / 2, y + 10, { align: 'center' })
    doc.setTextColor(120, 120, 120)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(s.label, sx + statW / 2, y + 15.5, { align: 'center' })
  })

  doc.setTextColor(...INK)

  // ── Subject Progress ─────────────────────────────────────────────────────────
  if (progress.length > 0) {
    y += 28
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Subject Progress', margin, y)

    const subjectColors = {
      'Mathematics':      TEAL,
      'English':          [45, 122, 45],
      'Business Studies': PURPLE,
      'Natural Sciences': [180, 122, 0],
    }

    y += 5
    progress.forEach(p => {
      y += 9
      const color = subjectColors[p.subject] || TEAL
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...INK)
      doc.text(p.subject, margin, y)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...color)
      doc.text(`${p.percent}%`, W - margin, y, { align: 'right' })
      doc.setTextColor(...INK)

      y += 2.5
      progressBar(doc, margin, y, p.percent, color, W - margin * 2)
    })
  }

  // ── Quiz History ─────────────────────────────────────────────────────────────
  if (quizzes.length > 0) {
    y += 14
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INK)
    doc.text('Recent Quiz Results', margin, y)

    y += 5
    const cols = [margin, margin + 54, margin + 90, margin + 118, margin + 142]
    const headers = ['Subject', 'Grade', 'Score', 'Result', 'Date']

    doc.setFillColor(...INK)
    doc.rect(margin, y, W - margin * 2, 7, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    headers.forEach((h, i) => doc.text(h, cols[i] + 2, y + 4.8))

    doc.setFont('helvetica', 'normal')
    quizzes.slice(0, 12).forEach((q, idx) => {
      y += 7
      if (y > 265) {
        doc.addPage()
        y = margin
      }
      doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 250 : 255)
      doc.rect(margin, y, W - margin * 2, 7, 'F')

      doc.setTextColor(...INK)
      doc.setFontSize(7.5)
      doc.text(q.subject, cols[0] + 2, y + 4.8)
      doc.text(`Grade ${q.grade}`, cols[1] + 2, y + 4.8)
      doc.text(`${q.score}/${q.total}`, cols[2] + 2, y + 4.8)

      const pctLabel = `${q.percent}%`
      pill(doc, cols[3] + 2, y + 4.8, pctLabel, scoreColor(q.percent))

      doc.setTextColor(150, 150, 150)
      doc.text(new Date(q.created_at).toLocaleDateString('en-ZA'), cols[4] + 2, y + 4.8)
      doc.setTextColor(...INK)
    })
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFillColor(...MIST)
    doc.rect(0, 284, W, 13, 'F')
    doc.setTextColor(150, 150, 150)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('EduSpark Online Tutoring Portal  ·  Confidential learner report', margin, 291)
    doc.text(`Page ${i} of ${pageCount}`, W - margin, 291, { align: 'right' })
  }

  const filename = `EduSpark_Report_${(child.name || 'Learner').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}
