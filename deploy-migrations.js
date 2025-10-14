const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Get Supabase credentials
const envPath = path.join(__dirname, 'web-panel', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')

const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim()
const SUPABASE_ANON_KEY = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1].trim()

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)/)[1]
const DB_PASSWORD = 'fourtyeighthauling2025'

// Database connection string
const connectionString = `postgresql://postgres.${projectRef}:${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

console.log('🔗 Connecting to Supabase database...')
console.log('📍 Project:', projectRef)

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Migration files to run
const migrations = [
  'sql/STEP6_file_upload_system.sql',
  'sql/STEP7_push_notifications.sql',
  'sql/STEP8_gps_location_tracking.sql'
]

async function runMigrations() {
  console.log('\n📋 Running migrations...\n')

  for (const migrationFile of migrations) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📄 Running: ${migrationFile}`)
    console.log('='.repeat(60))

    const sqlPath = path.join(__dirname, migrationFile)
    const sql = fs.readFileSync(sqlPath, 'utf-8')

    try {
      // For now, we'll use the Supabase client to execute via RPC
      // This requires the execute_sql function to be available
      const { data, error } = await supabase.rpc('execute_sql', { query_text: sql })

      if (error) {
        console.log(`⚠️  Could not execute via RPC: ${error.message}`)
        console.log(`\n📝 Please run this migration manually in Supabase SQL Editor:`)
        console.log(`   ${SUPABASE_URL}/project/${projectRef}/sql/new`)
        console.log(`   Copy contents of: ${migrationFile}`)
      } else {
        console.log(`✅ Migration completed successfully!`)
      }
    } catch (err) {
      console.error(`❌ Error:`, err.message)
      console.log(`\n📝 Please run this migration manually in Supabase SQL Editor:`)
      console.log(`   ${SUPABASE_URL}/project/${projectRef}/sql/new`)
      console.log(`   Copy contents of: ${migrationFile}`)
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 Migration Summary')
  console.log('='.repeat(60))
  console.log('\nNote: If migrations need manual execution, please:')
  console.log('1. Go to Supabase SQL Editor')
  console.log('2. Copy each SQL file contents')
  console.log('3. Paste and run in the editor')
  console.log(`\nSQL Editor URL: ${SUPABASE_URL}/project/${projectRef}/sql/new`)
}

runMigrations().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
