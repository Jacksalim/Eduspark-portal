import { createClient } from '@supabase/supabase-js'

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim()
}

function authConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  }
}

export async function authenticateRequest(req, allowedRoles = []) {
  const token = getBearerToken(req)
  if (!token) {
    return { ok: false, status: 401, error: 'Authentication required' }
  }

  const { url, anonKey } = authConfig()
  if (!url || !anonKey) {
    return { ok: false, status: 500, error: 'Server authentication is not configured' }
  }

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: userData, error: userError } = await client.auth.getUser(token)
  if (userError || !userData?.user) {
    return { ok: false, status: 401, error: 'Invalid or expired session' }
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, role, email, full_name')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError) {
    return { ok: false, status: 500, error: 'Unable to load authenticated profile' }
  }

  if (!profile) {
    return { ok: false, status: 403, error: 'Authenticated profile not found' }
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
    return { ok: false, status: 403, error: 'Insufficient permissions' }
  }

  return { ok: true, user: userData.user, profile, client }
}