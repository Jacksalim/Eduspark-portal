// src/pages/dashboards/StudentDashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import LearnerPortal from '../LearnerPortal'
import PromotionBanner from '../../components/PromotionBanner'

export default function StudentDashboard() {
  const { profile, user, refreshProfile } = useAuth()
  const [pendingLinks, setPendingLinks] = useState([])

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('parent_student_links')
      .select('*, parent:profiles!parent_student_links_parent_id_fkey(full_name, email)')
      .eq('student_id', user.id)
      .eq('status', 'pending')
      .then(({ data }) => setPendingLinks(data ?? []))
  }, [user?.id])

  const approveLink = async (linkId) => {
    await supabase.rpc('approve_parent_link', { link_id: linkId, approver_id: user.id })
    setPendingLinks(l => l.filter(x => x.id !== linkId))
  }

  const rejectLink = async (linkId) => {
    await supabase.from('parent_student_links').update({ status: 'rejected' }).eq('id', linkId)
    setPendingLinks(l => l.filter(x => x.id !== linkId))
  }

  return (
    <div>
      {pendingLinks.length > 0 && (
        <div style={{ padding: '16px 24px', background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
          {pendingLinks.map(link => (
            <div key={link.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, marginBottom: 8, flexWrap: 'wrap',
            }}>
              <p style={{ margin: 0, fontSize: 14, color: '#92400e' }}>
                <strong>{link.parent?.full_name}</strong> ({link.parent?.email}) wants to monitor your learning progress.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => approveLink(link.id)} style={{
                  padding: '6px 14px', background: '#059669', color: 'white',
                  border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                }}>Approve</button>
                <button onClick={() => rejectLink(link.id)} style={{
                  padding: '6px 14px', background: '#f3f4f6', color: '#374151',
                  border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                }}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <PromotionBanner userId={user?.id} grade={profile?.grade} onResolved={() => refreshProfile()} />
      <LearnerPortal profile={profile} />
    </div>
  )
}
