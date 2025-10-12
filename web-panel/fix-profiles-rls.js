const { Client } = require('pg')

const client = new Client({
  host: 'db.lnktfijmykqyejtikymu.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Haulingfourtyeight2025',
  ssl: { rejectUnauthorized: false }
})

async function fixProfilesRLS() {
  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    // Drop existing policies that cause recursion
    console.log('🔧 Dropping old policies...')
    await client.query(`
      DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
      DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    `)

    // Create simple, non-recursive policies
    console.log('✨ Creating new policies...')
    await client.query(`
      -- Allow users to view their own profile
      CREATE POLICY "Users can view own profile"
        ON profiles
        FOR SELECT
        USING (auth.uid() = id);

      -- Allow users to update their own profile
      CREATE POLICY "Users can update own profile"
        ON profiles
        FOR UPDATE
        USING (auth.uid() = id);

      -- Allow service role to do anything
      CREATE POLICY "Service role has full access"
        ON profiles
        FOR ALL
        USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
    `)

    console.log('✅ Policies updated successfully!')
    console.log('\n🎉 The infinite recursion issue should be fixed now.')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.end()
  }
}

fixProfilesRLS()
