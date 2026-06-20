// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, getProfile } from '../lib/supabase'

const AuthContext = createContext(null)

// Normalise role: existing DB uses 'learner'; new system uses 'student'
// Both are treated as student-level access
function normaliseRole(role) {
  if (role === 'learner') return 'student'
  return role ?? 'student'
}

export function AuthProvider({ children }) {
  const [session,  setSession]  = useState(null)
  const [profile,  setProfile]  = useState(null)
  const [loading,  setLoading]  = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    try {
      const data = await getProfile(userId)
      setProfile(data ?? null)
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    // Safety net: if Supabase's getSession() ever hangs or rejects without
    // us catching it, this guarantees the loading screen still clears after
    // 5s instead of trapping the user on "Verifying access…" forever.
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 5000)

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return
        setSession(session)
        return loadProfile(session?.user?.id)
      })
      .catch((err) => {
        console.warn('[auth] getSession failed, treating as signed out:', err?.message)
        if (!cancelled) setSession(null)
      })
      .finally(() => {
        clearTimeout(safetyTimer)
        if (!cancelled) setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (cancelled) return
        setSession(session)
        await loadProfile(session?.user?.id)
        setLoading(false)
      }
    )

    return () => {
      cancelled = true
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = async () => {
    if (!session?.user?.id) return null
    try {
      const data = await getProfile(session.user.id)
      setProfile(data ?? null)
      return data
    } catch {
      return null
    }
  }

  // role is normalised so 'learner' becomes 'student'
  const role = normaliseRole(profile?.role)

  const value = {
    session,
    user:            session?.user ?? null,
    profile,
    loading,
    refreshProfile,
    isAuthenticated: !!session,
    role,
    isStudent: role === 'student',
    isParent:  role === 'parent',
    isTutor:   role === 'tutor',
    isAdmin:   role === 'admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
