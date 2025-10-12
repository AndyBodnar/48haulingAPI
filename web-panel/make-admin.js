const { Client } = require('pg')

const client = new Client({
  host: 'db.lnktfijmykqyejtikymu.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Haulingfourtyeight2025',
  ssl: { rejectUnauthorized: false }
})

async function makeAdmin() {
  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    const email = 'craftedinno@gmail.com'

    // Find the user
    const userResult = await client.query(
      "SELECT id, email FROM auth.users WHERE email = $1",
      [email]
    )

    if (userResult.rows.length === 0) {
      console.log('❌ User not found with email:', email)
      return
    }

    const userId = userResult.rows[0].id
    console.log('📧 Found user:', email)
    console.log('🆔 User ID:', userId)

    // Update the profile to admin
    const updateResult = await client.query(
      "UPDATE profiles SET role = 'admin' WHERE id = $1 RETURNING id, role",
      [userId]
    )

    if (updateResult.rows.length > 0) {
      console.log('✅ User promoted to admin!')
      console.log('   Role:', updateResult.rows[0].role)
    } else {
      console.log('⚠️  Profile not found, creating one...')

      // Create profile if it doesn't exist
      await client.query(
        "INSERT INTO profiles (id, role) VALUES ($1, 'admin')",
        [userId]
      )
      console.log('✅ Profile created with admin role!')
    }

    // Verify
    const verifyResult = await client.query(
      "SELECT p.id, u.email, p.role FROM profiles p JOIN auth.users u ON p.id = u.id WHERE u.email = $1",
      [email]
    )

    console.log('\n🔍 Verification:')
    console.log('   Email:', verifyResult.rows[0].email)
    console.log('   Role:', verifyResult.rows[0].role)
    console.log('\n🎉 Done! You can now login with admin privileges.')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.end()
  }
}

makeAdmin()
