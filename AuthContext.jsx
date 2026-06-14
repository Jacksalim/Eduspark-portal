// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, getProfile } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null)
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    const { data } = await getProfile(userId)
    setProfile(data)
  }, [])

  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      loadProfile(session?.user?.id).finally(() => setLoading(false))
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        await loadProfile(session?.user?.id)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const refreshProfile = () => loadProfile(session?.user?.id)

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    refreshProfile,
    isAuthenticated: !!session,
    // Role helpers — read from DB profile (not JWT) to prevent spoofing
    role: profile?.role ?? null,
    isStudent: profile?.role === 'student',
    isParent:  profile?.role === 'parent',
    isTutor:   profile?.role === 'tutor',
    isAdmin:   profile?.role === 'admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
