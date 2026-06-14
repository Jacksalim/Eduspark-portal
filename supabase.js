// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function signUp({ email, password, fullName, role = 'student' }) {
  // Only allow student or parent at signup — never tutor or admin
  const safeRole = role === 'parent' ? 'parent' : 'student'

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role: safeRole },
    },
  })
  return { data, error }
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  return { data, error }
}

export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword })
  return { data, error }
}

// ─── Profile helpers ──────────────────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

export async function updateProfile(userId, updates) {
  // Strip any role field — role changes happen via admin functions only
  const { role: _role, ...safeUpdates } = updates
  const { data, error } = await supabase
    .from('profiles')
    .update(safeUpdates)
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}

// ─── Role verification (reads from DB, not JWT) ───────────────────────────────

export async function getMyRole() {
  const { data } = await supabase.rpc('get_my_role')
  return data
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  return { data, error }
}

export async function markNotificationRead(id) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
  return { error }
}

export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false)
  return { error }
}
