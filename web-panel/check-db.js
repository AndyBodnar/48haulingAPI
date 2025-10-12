const { Client } = require('pg')

const client = new Client({
  host: 'db.lnktfijmykqyejtikymu.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Haulingfourtyeight2025',
  ssl: { rejectUnauthorized: false }
})

async function checkDatabase() {
  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    // Check endpoints
    const endpoints = await client.query("SELECT name, display_name, method, is_active FROM api_endpoints ORDER BY name")
    console.log(`📊 API Endpoints (${endpoints.rows.length} total):`)
    endpoints.rows.forEach(ep => console.log(`   ${ep.is_active ? '✅' : '❌'} [${ep.method}] ${ep.display_name} (${ep.name})`))

    // Check metrics
    const metrics = await client.query("SELECT COUNT(*) FROM api_metrics")
    console.log(`\n📈 API Metrics: ${metrics.rows[0].count} records`)

    // Check tables exist
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('api_endpoints', 'api_metrics', 'endpoint_parameters', 'middleware_config')
      ORDER BY table_name
    `)
    console.log(`\n📁 Tables created:`)
    tables.rows.forEach(t => console.log(`   ✅ ${t.table_name}`))

    console.log('\n🎉 Database is ready! Go to http://localhost:3000')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.end()
  }
}

checkDatabase()
