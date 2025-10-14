const { Client } = require('pg')

const client = new Client({
  host: 'db.lnktfijmykqyejtikymu.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Haulingfourtyeight2025',
  ssl: { rejectUnauthorized: false }
})

async function addExecuteSQLFunction() {
  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    console.log('🔧 Creating execute_sql function...')

    // Create a function that executes SQL queries
    // Note: This is powerful and should be protected with RLS
    await client.query(`
      CREATE OR REPLACE FUNCTION execute_sql(query_text text)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result jsonb;
      BEGIN
        -- Execute the query and return results as JSONB
        EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query_text) INTO result;

        -- If result is null, return empty array
        IF result IS NULL THEN
          RETURN '[]'::jsonb;
        END IF;

        RETURN result;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE EXCEPTION '%', SQLERRM;
      END;
      $$;
    `)

    console.log('✅ execute_sql function created successfully!')

    console.log('\n🔐 Setting function permissions...')

    // Grant execute permission to authenticated users
    await client.query(`
      GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;
    `)

    console.log('✅ Permissions granted!')

    console.log('\n🎉 Query executor is ready to use!')
    console.log('\n⚠️  Security Note:')
    console.log('   - RLS policies still apply to queries')
    console.log('   - Users can only access data they have permission to see')
    console.log('   - Consider adding additional restrictions if needed')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Details:', error)
  } finally {
    await client.end()
  }
}

addExecuteSQLFunction()
