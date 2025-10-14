const { Client } = require('pg')

const client = new Client({
  host: 'db.lnktfijmykqyejtikymu.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Haulingfourtyeight2025',
  ssl: { rejectUnauthorized: false }
})

async function fixAllProfilesPolicies() {
  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    // Drop ALL existing policies
    console.log('🔧 Dropping all existing policies...')
    await client.query(`
      DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
      DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
      DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
      DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
      DROP POLICY IF EXISTS "Service role has full access" ON profiles;
    `)

    // Create simple, non-recursive policies
    console.log('✨ Creating new non-recursive policies...')
    await client.query(`
      -- Allow users to view their own profile (simple, no recursion)
      CREATE POLICY "Users can view own profile"
        ON profiles
        FOR SELECT
        USING (auth.uid() = id);

      -- Allow users to update their own profile (simple, no recursion)
      CREATE POLICY "Users can update own profile"
        ON profiles
        FOR UPDATE
        USING (auth.uid() = id);

      -- Allow service role to do anything
      CREATE POLICY "Service role has full access"
        ON profiles
        FOR ALL
        USING (
          current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
        );
    `)

    console.log('✅ Policies updated successfully!')
    console.log('\n📋 New policy structure:')
    console.log('   1. Users can view their own profile (auth.uid() = id)')
    console.log('   2. Users can update their own profile (auth.uid() = id)')
    console.log('   3. Service role has full access')
    console.log('\n🎉 The infinite recursion issue should be completely fixed now.')
    console.log('\n⚠️  Note: Admin-specific policies removed to prevent recursion.')
    console.log('   Use the service role key for admin operations if needed.')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.end()
  }
}

fixAllProfilesPolicies()
