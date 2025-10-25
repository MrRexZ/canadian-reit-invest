/**
 * Fetches user profiles (email, name) from auth.users for given user IDs
 * Uses direct HTTP call to Supabase API with service role key
 */
export async function getUserProfiles(userIds: string[]) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

  console.log('[DEBUG] getUserProfiles called with userIds:', userIds)
  console.log('[DEBUG] supabaseUrl:', supabaseUrl)
  console.log('[DEBUG] serviceRoleKey exists:', !!serviceRoleKey)

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[WARN] Missing credentials - cannot fetch user profiles')
    return []
  }

  try {
    console.log('[DEBUG] Making direct API call to auth/admin/users')
    
    const response = await fetch(
      `${supabaseUrl}/auth/v1/admin/users`,
      {
        method: 'GET',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    )

    if (!response.ok) {
      console.error('[ERROR] API response not ok:', response.status, response.statusText)
      return []
    }

    const responseData = await response.json()
    console.log('[DEBUG] Raw API response:', responseData)

    // Response structure: { users: Array, aud: string }
    const users = responseData.users
    if (!Array.isArray(users)) {
      console.error('[ERROR] Response users is not an array:', responseData)
      return []
    }

    // Filter and map the response
    const result = users
      .filter((u: any) => userIds.includes(u.id))
      .map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name || u.user_metadata?.full_name || '',
      }))

    console.log('[DEBUG] Returning user profiles:', result)
    return result
  } catch (error) {
    console.error('[ERROR] Error fetching user profiles:', error)
    return []
  }
}