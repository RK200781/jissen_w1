import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTestUser() {
  try {
    // Create test user
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'test@gmail.com',
      password: 'test',
      email_confirm: true,
    })

    if (error) {
      console.error('Error creating user:', error)
      process.exit(1)
    }

    console.log('✅ テストユーザーを作成しました!')
    console.log('Email: test@gmail.com')
    console.log('Password: test')
    console.log('User ID:', data.user.id)
  } catch (err) {
    console.error('Fatal error:', err)
    process.exit(1)
  }
}

createTestUser()
