const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Get SQL file path from command line argument
const sqlFilePath = process.argv[2]

if (!sqlFilePath) {
  console.error('❌ Error: Please provide SQL file path as argument')
  console.log('Usage: node run-migration.js <path-to-sql-file>')
  console.log('Example: node run-migration.js sql/STEP6_file_upload_system.sql')
  process.exit(1)
}

// Read from .env.local
const envPath = path.join(__dirname, 'web-panel', '.env.local')

if (!fs.existsSync(envPath)) {
  console.error('❌ Error: .env.local file not found at:', envPath)
  console.log('\nPlease create web-panel/.env.local with:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=your-url')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key')
  process.exit(1)
}

const envContent = fs.readFileSync(envPath, 'utf-8')

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)

if (!urlMatch || !keyMatch) {
  console.error('❌ Error: Could not find SUPABASE_URL or SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const SUPABASE_URL = urlMatch[1].trim()
const SUPABASE_KEY = keyMatch[1].trim()

console.log('🔗 Connecting to Supabase...')
console.log('📍 URL:', SUPABASE_URL)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Read SQL file
const resolvedSqlPath = path.resolve(__dirname, sqlFilePath)

if (!fs.existsSync(resolvedSqlPath)) {
  console.error('❌ Error: SQL file not found:', resolvedSqlPath)
  process.exit(1)
}

console.log('📄 Reading SQL file:', resolvedSqlPath)
const sql = fs.readFileSync(resolvedSqlPath, 'utf-8')

// Split into individual statements (basic splitting - may need refinement)
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--') && s.length > 5)

console.log(`📋 Found ${statements.length} SQL statements to execute...\n`)

async function runMigration() {
  let successCount = 0
  let errorCount = 0
  const errors = []

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    if (!stmt) continue

    try {
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`)

      // Show first 100 chars of statement
      const preview = stmt.substring(0, 100).replace(/\n/g, ' ')
      console.log(`   ${preview}${stmt.length > 100 ? '...' : ''}`)

      // Try to execute via RPC function if it exists
      const { data, error } = await supabase.rpc('execute_sql', { query_text: stmt + ';' })

      if (error) {
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          console.log(`⚠️  Note: execute_sql RPC function not available. Statement may need manual execution.`)
          console.log(`   Please run this in Supabase Dashboard > SQL Editor`)
        } else {
          throw error
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully\n`)
        successCount++
        continue
      }
    } catch (error) {
      console.error(`❌ Error on statement ${i + 1}:`, error.message)
      errors.push({ statement: i + 1, error: error.message, sql: stmt })
      errorCount++
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 Migration Summary`)
  console.log(`${'='.repeat(60)}`)
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${errorCount}`)

  if (errorCount > 0 || successCount === 0) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`⚠️  MANUAL EXECUTION REQUIRED`)
    console.log(`${'='.repeat(60)}`)
    console.log(`\nThe migration script requires service_role key privileges.`)
    console.log(`Please run the SQL file manually in Supabase Dashboard:\n`)
    console.log(`1. Go to: ${SUPABASE_URL.replace(/\.supabase\.co.*/, '.supabase.co')}/project/${SUPABASE_URL.match(/https:\/\/([^.]+)/)[1]}/sql/new`)
    console.log(`2. Copy the contents of: ${sqlFilePath}`)
    console.log(`3. Paste into the SQL Editor`)
    console.log(`4. Click "Run"\n`)

    console.log(`Or use Supabase CLI:`)
    console.log(`  supabase db push --db-url "your-connection-string"\n`)
  } else {
    console.log(`\n🎉 Migration completed successfully!`)
  }

  if (errors.length > 0) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📝 Error Details`)
    console.log(`${'='.repeat(60)}`)
    errors.forEach(({ statement, error }) => {
      console.log(`\nStatement ${statement}: ${error}`)
    })
  }
}

runMigration().catch((error) => {
  console.error('\n❌ Fatal error:', error.message)
  process.exit(1)
})
