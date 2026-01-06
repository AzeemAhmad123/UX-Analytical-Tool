import { supabase } from './src/config/supabase'

async function checkSchema() {
  console.log('🔍 Checking database schema...\n')
  
  try {
    // Check if session_snapshots table exists
    const { data: tables, error: tablesError } = await supabase
      .from('session_snapshots')
      .select('*')
      .limit(0)
    
    if (tablesError) {
      console.error('❌ Error accessing session_snapshots table:', tablesError.message)
      return
    }
    
    console.log('✅ session_snapshots table exists')
    
    // Try to get table structure by attempting a query with the column
    const { error: columnError } = await supabase
      .from('session_snapshots')
      .select('is_initial_snapshot')
      .limit(0)
    
    if (columnError) {
      console.error('❌ Column is_initial_snapshot is MISSING!')
      console.error('Error:', columnError.message)
      console.log('\n📝 Run this SQL to fix it:')
      console.log(`
ALTER TABLE session_snapshots 
ADD COLUMN IF NOT EXISTS is_initial_snapshot BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_snapshots_initial 
ON session_snapshots(session_id, is_initial_snapshot) 
WHERE is_initial_snapshot = true;
      `)
    } else {
      console.log('✅ Column is_initial_snapshot exists')
    }
    
    // Check other required columns
    const requiredColumns = ['id', 'session_id', 'snapshot_data', 'snapshot_count', 'created_at']
    for (const col of requiredColumns) {
      const { error } = await supabase
        .from('session_snapshots')
        .select(col)
        .limit(0)
      
      if (error) {
        console.error(`❌ Column ${col} is MISSING!`)
      } else {
        console.log(`✅ Column ${col} exists`)
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error checking schema:', error.message)
  }
}

checkSchema()

