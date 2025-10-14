const { Client } = require('pg')
const crypto = require('crypto')

const client = new Client({
  host: 'db.lnktfijmykqyejtikymu.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Haulingfourtyeight2025',
  ssl: { rejectUnauthorized: false }
})

async function createUser() {
  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    const email = 'javier@48hauling.com'
    const password = '48hauling'
    const userId = crypto.randomUUID()

    // Create user in auth.users table
    console.log('Creating auth user...')
    await client.query(`
      INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role
      ) VALUES (
        $1,
        '00000000-0000-0000-0000-000000000000',
        $2,
        crypt($3, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        'authenticated',
        'authenticated'
      )
    `, [userId, email, password])

    console.log('✅ Auth user created with ID:', userId)

    // Create profile
    console.log('Creating profile...')
    await client.query(`
      INSERT INTO public.profiles (id, role, full_name, phone)
      VALUES ($1, 'admin', 'Javier', NULL)
    `, [userId])

    console.log('✅ Profile created with admin role')
    console.log('\n🎉 User created successfully!')
    console.log('Email:', email)
    console.log('Password:', password)
    console.log('Role: admin')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Details:', error)
  } finally {
    await client.end()
  }
}

createUser()
