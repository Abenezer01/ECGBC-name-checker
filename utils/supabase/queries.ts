import { createClient } from './server'

export async function getUserRole() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    if (userError) console.error("getUserRole error fetching user:", userError)
    return null
  }

  // Try to get role from profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role_name')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.warn("Could not fetch profile role, falling back to app_metadata:", profileError.message)
    // Fallback to app_metadata or default
    return user.app_metadata?.role ?? 'viewer'
  }
  
  return profile?.role_name ?? 'viewer'
}
