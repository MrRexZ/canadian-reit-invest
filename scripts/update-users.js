import { createClient } from '@supabase/supabase-js'

// This script updates the public users table with email and name from auth.users
// Run with: node scripts/update-users.js

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateUsers() {
  try {
    // Get all users from auth.users
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('id, email, raw_user_meta_data')

    if (authError) {
      console.error('Error fetching auth users:', authError)
      return
    }

    // Update public users table
    for (const authUser of authUsers) {
      const name = authUser.raw_user_meta_data?.name || authUser.raw_user_meta_data?.full_name || ''

      const { error: updateError } = await supabase
        .from('users')
        .update({ email: authUser.email, name })
        .eq('user_id', authUser.id)

      if (updateError) {
        console.error(`Error updating user ${authUser.id}:`, updateError)
      } else {
        console.log(`Updated user ${authUser.id}: ${name} <${authUser.email}>`)
      }
    }

    console.log('User update complete')
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

updateUsers()