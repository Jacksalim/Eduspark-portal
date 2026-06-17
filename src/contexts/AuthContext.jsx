// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Normalise role: existing DB uses 'learner'; new system uses 'student'
// Both are treated as student-level access
function normaliseRole(role) {
  if (role === 'learner') return 'student'
  return role ?? 'student'
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export function AuthProvider({ children }) {
  const [session,  setSession]  = useState(null)
  const [profile,  setProfile]  = useState(null)
  const [loading,  setLoading]  = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    try {
      const data = await fetchProfile(userId)
      setProfile(data)
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      loadProfile(session?.user?.id).finally(() => setLoading(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        await loadProfile(session?.user?.id)
        setLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [loadProfile])

  const refreshProfile = async () => {
    const { data } = await getProfile(session?.user?.id)
    setProfile(data)
    return data
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
