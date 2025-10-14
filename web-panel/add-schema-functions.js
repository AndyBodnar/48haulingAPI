const { Client } = require('pg')

const client = new Client({
  host: 'db.lnktfijmykqyejtikymu.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Haulingfourtyeight2025',
  ssl: { rejectUnauthorized: false }
})

async function addSchemaFunctions() {
  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    console.log('🔧 Creating get_public_tables function...')
    await client.query(`
      CREATE OR REPLACE FUNCTION get_public_tables()
      RETURNS text[]
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        tables text[];
      BEGIN
        SELECT array_agg(tablename::text)
        INTO tables
        FROM pg_tables
        WHERE schemaname = 'public';

        RETURN tables;
      END;
      $$;
    `)
    console.log('✅ get_public_tables created')

    console.log('🔧 Creating get_detailed_schema function...')
    await client.query(`
      CREATE OR REPLACE FUNCTION get_detailed_schema(table_name text)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result jsonb;
      BEGIN
        WITH columns_info AS (
          SELECT
            c.column_name,
            c.data_type,
            c.is_nullable::boolean,
            c.column_default,
            CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
            CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key,
            fk.foreign_table_name,
            fk.foreign_column_name
          FROM information_schema.columns c
          LEFT JOIN (
            SELECT ku.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku
              ON tc.constraint_name = ku.constraint_name
              AND tc.table_schema = ku.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_name = table_name
              AND tc.table_schema = 'public'
          ) pk ON c.column_name = pk.column_name
          LEFT JOIN (
            SELECT
              kcu.column_name,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name = table_name
              AND tc.table_schema = 'public'
          ) fk ON c.column_name = fk.column_name
          WHERE c.table_name = table_name
            AND c.table_schema = 'public'
          ORDER BY c.ordinal_position
        ),
        indexes_info AS (
          SELECT
            i.relname as index_name,
            array_agg(a.attname ORDER BY a.attnum) as columns,
            ix.indisunique as is_unique
          FROM pg_class t
          JOIN pg_index ix ON t.oid = ix.indrelid
          JOIN pg_class i ON i.oid = ix.indexrelid
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
          WHERE t.relname = table_name
            AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
          GROUP BY i.relname, ix.indisunique
        )
        SELECT jsonb_build_object(
          'tableName', table_name,
          'columns', (SELECT jsonb_agg(
            jsonb_build_object(
              'name', column_name,
              'type', data_type,
              'nullable', is_nullable,
              'defaultValue', column_default,
              'isPrimaryKey', is_primary_key,
              'isForeignKey', is_foreign_key,
              'foreignKeyTable', foreign_table_name,
              'foreignKeyColumn', foreign_column_name
            )
          ) FROM columns_info),
          'indexes', (SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'name', index_name,
              'columns', columns,
              'isUnique', is_unique
            )
          ), '[]'::jsonb) FROM indexes_info),
          'constraints', '[]'::jsonb
        ) INTO result;

        RETURN result;
      END;
      $$;
    `)
    console.log('✅ get_detailed_schema created')

    console.log('\n🔐 Setting function permissions...')
    await client.query(`
      GRANT EXECUTE ON FUNCTION get_public_tables() TO authenticated;
      GRANT EXECUTE ON FUNCTION get_detailed_schema(text) TO authenticated;
    `)
    console.log('✅ Permissions granted!')

    console.log('\n🎉 Schema functions are ready to use!')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Details:', error)
  } finally {
    await client.end()
  }
}

addSchemaFunctions()
