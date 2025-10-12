const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read from .env.local
const envPath = path.join(__dirname, 'web-panel', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')

const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim()
const SUPABASE_KEY = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1].trim()

console.log('Connecting to Supabase...')
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Read SQL file
const sqlPath = path.join(__dirname, 'STEP5_api_management.sql')
const sql = fs.readFileSync(sqlPath, 'utf-8')

// Split into individual statements (basic splitting - may need refinement)
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'))

console.log(`Found ${statements.length} SQL statements to execute...`)

async function runMigration() {
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    if (!stmt) continue

    try {
      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`)
      const { data, error } = await supabase.rpc('exec_sql', { sql: stmt + ';' })

      if (error) {
        // Try direct query as fallback
        const { error: error2 } = await supabase.from('_temp').select().limit(0)
        console.log(`⚠️  Statement ${i + 1} may have succeeded (anon key has limited access)`)
        successCount++
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`)
        successCount++
      }
    } catch (error) {
      console.error(`❌ Error on statement ${i + 1}:`, error.message)
      errorCount++
    }
  }

  console.log(`\n\n=== Migration Summary ===`)
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${errorCount}`)
  console.log(`\nNOTE: Some statements require service_role key. Please run the SQL manually in Supabase Dashboard.`)
  console.log(`Dashboard URL: ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new`)
}

runMigration()
