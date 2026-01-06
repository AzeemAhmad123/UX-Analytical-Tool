import { supabase } from './src/config/supabase'
import dotenv from 'dotenv'

dotenv.config()

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n')
  
  try {
    // Test 1: Check if we can query projects table
    console.log('Test 1: Querying projects table...')
    const { data, error } = await supabase
      .from('projects')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Database connection failed:', error.message)
      console.error('   Error details:', error)
      return
    }
    
    console.log('✅ Database connection successful!')
    
    // Test 2: Check if tables exist
    console.log('\nTest 2: Checking tables...')
    const tables = ['projects', 'sessions', 'session_snapshots', 'events']
    
    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('*')
        .limit(0)
      
      if (tableError) {
        console.log(`❌ Table "${table}" not found or not accessible`)
      } else {
        console.log(`✅ Table "${table}" exists`)
      }
    }
    
    console.log('\n🎉 All tests passed!')
    
  } catch (err: any) {
    console.error('❌ Error:', err.message)
    console.error('   Stack:', err.stack)
  }
  
  process.exit(0)
}

testConnection()

