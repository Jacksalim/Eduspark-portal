import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getProfile, logVisit } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null)
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [profileError, setProfileError] = useState(false)

  useEffect(() => {
    // 1. Check existing session on startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // 2. Listen for sign in / sign out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setProfileError(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    setLoading(true)
    setProfileError(false)
    try {
      const p = await getProfile(userId)
      setProfile(p)
      logVisit(window.location.pathname, userId)
    } catch (e) {
      console.warn('Profile not found for user:', userId, e.message)
      setProfile(null)
      setProfileError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileError, setProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}