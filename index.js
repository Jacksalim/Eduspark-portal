// src/hooks/useNotifications.js
import { useState, useEffect, useCallback } from 'react'
import { supabase, getNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading,        setLoading]       = useState(true)
  const [unreadCount,    setUnreadCount]   = useState(0)

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await getNotifications()
    setNotifications(data ?? [])
    setUnreadCount((data ?? []).filter(n => !n.is_read).length)
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()

    // Real-time subscription
    if (!user) return
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev])
          setUnreadCount(c => c + 1)
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user, load])

  const markRead = async (id) => {
    await markNotificationRead(id)
    setNotifications(n => n.map(x => x.id === id ? { ...x, is_read: true } : x))
    setUnreadCount(c => Math.max(0, c - 1))
  }

  const markAllRead = async () => {
    await markAllNotificationsRead()
    setNotifications(n => n.map(x => ({ ...x, is_read: true })))
    setUnreadCount(0)
  }

  return { notifications, loading, unreadCount, markRead, markAllRead, refresh: load }
}

// ─────────────────────────────────────────────────────────────────────────────

// src/hooks/useParentChildren.js
// Used inside the parent dashboard to load linked children's data
import { supabase } from '../lib/supabase'

export function useParentChildren(parentId) {
  const [children, setChildren] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!parentId) return
    supabase
      .from('parent_student_links')
      .select(`
        id, status, relationship,
        student:profiles!parent_student_links_student_id_fkey (
          id, full_name, email, avatar_url
        )
      `)
      .eq('parent_id', parentId)
      .eq('status', 'approved')
      .then(({ data }) => {
        setChildren((data ?? []).map(l => l.student).filter(Boolean))
        setLoading(false)
      })
  }, [parentId])

  return { children, loading }
}

// ─────────────────────────────────────────────────────────────────────────────

// src/hooks/useTutorApplication.js
// Used in the student dashboard to check application status
export function useTutorApplication(userId) {
  const [application, setApplication] = useState(null)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('tutor_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { setApplication(data); setLoading(false) })
  }, [userId])

  return { application, loading }
}
