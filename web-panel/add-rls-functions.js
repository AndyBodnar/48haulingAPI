const { Client } = require('pg')

const client = new Client({
  host: 'db.lnktfijmykqyejtikymu.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Haulingfourtyeight2025',
  ssl: { rejectUnauthorized: false }
})

async function addRLSFunctions() {
  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    console.log('🔧 Creating get_rls_policies function...')
    await client.query(`
      CREATE OR REPLACE FUNCTION get_rls_policies()
      RETURNS TABLE (
        schemaname text,
        tablename text,
        policyname text,
        permissive text,
        roles text[],
        cmd text,
        qual text,
        with_check text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          p.schemaname::text,
          p.tablename::text,
          p.policyname::text,
          p.permissive::text,
          p.roles::text[],
          p.cmd::text,
          p.qual::text,
          p.with_check::text
        FROM pg_policies p
        WHERE p.schemaname = 'public'
        ORDER BY p.tablename, p.policyname;
      END;
      $$;
    `)
    console.log('✅ get_rls_policies created')

    console.log('\n🔐 Setting permissions...')
    await client.query(`
      GRANT EXECUTE ON FUNCTION get_rls_policies() TO authenticated;
    `)
    console.log('✅ Permissions granted!')

    console.log('\n🎉 RLS management features are ready!')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Details:', error)
  } finally {
    await client.end()
  }
}

addRLSFunctions()
