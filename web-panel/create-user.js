const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://lnktfijmykqyejtikymu.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxua3RmaWpteWtxeWVqdGlreW11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwOTU5OSwiZXhwIjoyMDc1MTg1NTk5fQ.q7jjG9yuhhXqeoxXQl6D45TYKv9_4QEi-q49J3zVb1E'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createUser() {
  try {
    console.log('Creating user javier@48hauling.com...\n')

    // Create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'javier@48hauling.com',
      password: '48hauling',
      email_confirm: true // Auto-confirm the email
    })

    if (authError) {
      console.error('❌ Error creating auth user:', authError.message)
      return
    }

    console.log('✅ Auth user created:', authData.user.id)

    // Create the profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        role: 'admin',
        full_name: 'Javier',
        phone: null
      })

    if (profileError) {
      console.error('❌ Error creating profile:', profileError.message)
      return
    }

    console.log('✅ Profile created with admin role')
    console.log('\n🎉 User created successfully!')
    console.log('Email: javier@48hauling.com')
    console.log('Password: 48hauling')
    console.log('Role: admin')

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

createUser()
