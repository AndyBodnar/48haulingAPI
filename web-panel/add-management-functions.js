const { Client } = require('pg')

const client = new Client({
  host: 'db.lnktfijmykqyejtikymu.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Haulingfourtyeight2025',
  ssl: { rejectUnauthorized: false }
})

async function addManagementFunctions() {
  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    console.log('🔧 Creating get_table_sizes function...')
    await client.query(`
      CREATE OR REPLACE FUNCTION get_table_sizes()
      RETURNS TABLE (
        table_name text,
        row_count bigint,
        total_size text,
        table_size text,
        indexes_size text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          t.tablename::text,
          (SELECT count(*) FROM (SELECT 1 FROM ONLY public.table LIMIT 1000000) sub)::bigint as row_count,
          pg_size_pretty(pg_total_relation_size(quote_ident(t.tablename)::regclass)) as total_size,
          pg_size_pretty(pg_relation_size(quote_ident(t.tablename)::regclass)) as table_size,
          pg_size_pretty(pg_total_relation_size(quote_ident(t.tablename)::regclass) -
                        pg_relation_size(quote_ident(t.tablename)::regclass)) as indexes_size
        FROM pg_tables t
        WHERE t.schemaname = 'public'
        ORDER BY pg_total_relation_size(quote_ident(t.tablename)::regclass) DESC;
      END;
      $$;
    `)
    console.log('✅ get_table_sizes created')

    console.log('🔧 Creating migrations table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW(),
        success BOOLEAN DEFAULT true
      );
    `)
    console.log('✅ migrations table created')

    console.log('🔧 Creating audit_logs table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMP DEFAULT NOW(),
        action VARCHAR(50) NOT NULL,
        table_name VARCHAR(100),
        user_id UUID REFERENCES auth.users(id),
        details TEXT
      );
    `)
    console.log('✅ audit_logs table created')

    console.log('\n🔐 Setting permissions...')
    await client.query(`
      GRANT EXECUTE ON FUNCTION get_table_sizes() TO authenticated;
      GRANT SELECT, INSERT ON migrations TO authenticated;
      GRANT SELECT ON audit_logs TO authenticated;
    `)
    console.log('✅ Permissions granted!')

    console.log('\n🔧 Creating RLS policies for migrations...')
    await client.query(`
      ALTER TABLE migrations ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Anyone can view migrations" ON migrations;
      CREATE POLICY "Anyone can view migrations"
        ON migrations FOR SELECT
        TO authenticated
        USING (true);

      DROP POLICY IF EXISTS "Anyone can insert migrations" ON migrations;
      CREATE POLICY "Anyone can insert migrations"
        ON migrations FOR INSERT
        TO authenticated
        WITH CHECK (true);
    `)
    console.log('✅ RLS policies created for migrations')

    console.log('\n🔧 Creating RLS policies for audit_logs...')
    await client.query(`
      ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Anyone can view audit logs" ON audit_logs;
      CREATE POLICY "Anyone can view audit logs"
        ON audit_logs FOR SELECT
        TO authenticated
        USING (true);
    `)
    console.log('✅ RLS policies created for audit_logs')

    console.log('\n🎉 Database management features are ready!')
    console.log('\nCreated:')
    console.log('  - get_table_sizes() function')
    console.log('  - migrations table')
    console.log('  - audit_logs table')
    console.log('  - RLS policies')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Details:', error)
  } finally {
    await client.end()
  }
}

addManagementFunctions()
