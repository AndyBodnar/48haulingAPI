const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

console.log('🚀 Connecting to PostgreSQL database...')
const client = new Client({
  host: 'db.lnktfijmykqyejtikymu.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Haulingfourtyeight2025',
  ssl: { rejectUnauthorized: false }
})

// Read SQL file
const sqlPath = path.join(__dirname, '..', 'STEP5_api_management.sql')
const sql = fs.readFileSync(sqlPath, 'utf-8')

console.log('📄 SQL file loaded successfully')
console.log('📊 Executing migration...\n')

async function runMigration() {
  try {
    await client.connect()
    console.log('✅ Connected to database')

    console.log('📊 Executing migration SQL...\n')

    // Execute the SQL
    const result = await client.query(sql)
    console.log('✅ Migration executed successfully!')

    // Verify tables were created
    console.log('\n🔍 Verifying tables...')

    const endpointsCheck = await client.query("SELECT COUNT(*) FROM api_endpoints")
    console.log(`✅ api_endpoints table exists with ${endpointsCheck.rows[0].count} rows`)

    const metricsCheck = await client.query("SELECT COUNT(*) FROM api_metrics")
    console.log(`✅ api_metrics table exists with ${metricsCheck.rows[0].count} rows`)

    // List all endpoints
    const endpoints = await client.query("SELECT name, display_name, method FROM api_endpoints ORDER BY name")
    console.log(`\n✅ ${endpoints.rows.length} endpoints created:`)
    endpoints.rows.forEach(ep => console.log(`   - [${ep.method}] ${ep.display_name} (${ep.name})`))

    console.log('\n🎉 Setup complete! Your dashboard is ready at http://localhost:3000')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    if (error.stack) {
      console.error('Stack:', error.stack)
    }
  } finally {
    await client.end()
  }
}

runMigration()
