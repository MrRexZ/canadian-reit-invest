import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface UserDetails {
  user_id: string
  email: string
  name: string
}

export default async function handler(req: Request): Promise<Response> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Get user_ids from request body
    const { user_ids }: { user_ids: string[] } = await req.json()

    if (!user_ids || !Array.isArray(user_ids)) {
      return new Response('user_ids array is required', { status: 400 })
    }

    // Create Supabase client with service role (for accessing auth.users)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Query auth.users for the specified user_ids
    const { data, error } = await supabase
      .from('auth.users')
      .select('id, email, raw_user_meta_data')
      .in('id', user_ids)

    if (error) {
      console.error('Error fetching user details:', error)
      return new Response('Failed to fetch user details', { status: 500 })
    }

    // Transform the data
    const userDetails: UserDetails[] = data.map(user => ({
      user_id: user.id,
      email: user.email || '',
      name: user.raw_user_meta_data?.name || user.raw_user_meta_data?.full_name || ''
    }))

    return new Response(JSON.stringify(userDetails), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}