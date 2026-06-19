// src/components/PromotionBanner.jsx
import { useState, useEffect } from 'react'
import { computePromotionEligibility, recordPromotionDecision } from '../lib/supabase'

const MIN_QUIZZES = 5 // minimum quiz attempts at this grade before we'll evaluate

export default function PromotionBanner({ userId, grade, onResolved }) {
  const [eligibility, setEligibility] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [deciding,    setDeciding]    = useState(false)
  const [resolved,    setResolved]    = useState(false)

  useEffect(() => {
    if (!userId || !grade) return
    computePromotionEligibility(userId, grade)
      .then(setEligibility)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId, grade])

  const handleDecision = async (decision) => {
    setDeciding(true)
    try {
      await recordPromotionDecision({
        userId,
        fromGrade: grade,
        academicYear: new Date().getFullYear(),
        quizAverage: eligibility.quizAverage,
        topicsCoveredPercent: eligibility.topicsCoveredPercent,
        decision, // 'promoted' | 'repeated'
        decidedBy: userId, // student self-decided
        notes: 'Student choice via promotion banner',
      })
      setResolved(true)
      onResolved?.(decision)
    } catch (e) {
      alert('Could not process your choice: ' + e.message)
    }
    setDeciding(false)
  }

  if (loading || !eligibility || resolved) return null
  if (eligibility.quizCount < MIN_QUIZZES) return null   // not enough data yet
  if (!eligibility.eligible) return null                  // hasn't cleared threshold yet — keep practicing, no nag banner

  const nextGrade = grade === 'R' ? '1' : (Number(grade) >= 12 ? '12' : String(Number(grade) + 1))
  const isFinalGrade = grade === '12'

  return (
    <div style={{
      margin: '16px 24px', padding: '20px 22px', borderRadius: 14,
      background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)',
      border: '1.5px solid #86efac',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ fontSize: 32 }}>🎉</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#065f46' }}>
            {isFinalGrade ? "You've mastered Grade 12!" : `You're ready for Grade ${nextGrade}!`}
          </h3>
          <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.5, color: '#047857' }}>
            Quiz average: <strong>{eligibility.quizAverage}%</strong> · Topics covered: <strong>{eligibility.topicsCoveredPercent}%</strong>.
            {isFinalGrade
              ? ' Congratulations on completing your CBC journey on EduSpark!'
              : ` Your performance qualifies you to move up to Grade ${nextGrade}. You can also choose to repeat Grade ${grade} for extra practice if you'd prefer.`}
          </p>
          {!isFinalGrade && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                disabled={deciding}
                onClick={() => handleDecision('promoted')}
                style={{
                  padding: '9px 20px', borderRadius: 8, border: 'none',
                  background: '#059669', color: 'white', fontSize: 14, fontWeight: 600,
                  cursor: deciding ? 'not-allowed' : 'pointer', opacity: deciding ? 0.6 : 1,
                }}
              >
                {deciding ? 'Processing…' : `Move to Grade ${nextGrade}`}
              </button>
              <button
                disabled={deciding}
                onClick={() => handleDecision('repeated')}
                style={{
                  padding: '9px 20px', borderRadius: 8, border: '1.5px solid #d1d5db',
                  background: 'white', color: '#374151', fontSize: 14, fontWeight: 600,
                  cursor: deciding ? 'not-allowed' : 'pointer', opacity: deciding ? 0.6 : 1,
                }}
              >
                Repeat Grade {grade}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
