const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Database credentials
const DB_PASSWORD = 'fourtyeighthauling2025'
const PROJECT_REF = 'lnktfijmykqyejtikymu'

// Try different connection string formats for Supabase
const connectionStrings = [
  // Direct connection (port 5432)
  `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  // Pooler connection (port 6543)
  `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  // Alternative pooler
  `postgresql://postgres:${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
]

// Migration files
const migrations = [
  'sql/STEP6_file_upload_system.sql',
  'sql/STEP7_push_notifications.sql',
  'sql/STEP8_gps_location_tracking.sql'
]

async function testConnection(connectionString) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    await client.query('SELECT 1')
    await client.end()
    return true
  } catch (error) {
    return false
  }
}

async function runMigrations() {
  console.log('🔍 Testing database connections...\n')

  let workingConnectionString = null

  for (const connStr of connectionStrings) {
    const shortForm = connStr.substring(0, 80) + '...'
    process.stdout.write(`Testing: ${shortForm} ... `)

    if (await testConnection(connStr)) {
      console.log('✅')
      workingConnectionString = connStr
      break
    } else {
      console.log('❌')
    }
  }

  if (!workingConnectionString) {
    console.error('\n❌ Could not connect to database with any connection string.')
    console.error('Please run migrations manually in Supabase SQL Editor:')
    console.error(`https://${PROJECT_REF}.supabase.co/project/${PROJECT_REF}/sql/new`)
    process.exit(1)
  }

  console.log('\n✅ Found working connection!\n')

  const client = new Client({
    connectionString: workingConnectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('🔗 Connecting to database...')
    await client.connect()
    console.log('✅ Connected successfully!\n')

    for (const migrationFile of migrations) {
      console.log(`${'='.repeat(60)}`)
      console.log(`📄 Running: ${migrationFile}`)
      console.log('='.repeat(60))

      const sqlPath = path.join(__dirname, migrationFile)
      const sql = fs.readFileSync(sqlPath, 'utf-8')

      try {
        await client.query(sql)
        console.log(`✅ Migration completed successfully!\n`)
      } catch (error) {
        console.error(`❌ Error running migration:`, error.message)
        console.error(`   File: ${migrationFile}`)
        if (error.detail) console.error(`   Details:`, error.detail)
        console.log('')
        // Continue with next migration
      }
    }

    console.log(`${'='.repeat(60)}`)
    console.log('📊 All migrations processed!')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n✅ Database connection closed')
  }
}

runMigrations()
