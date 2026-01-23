import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || 'https://xrvmiyrsxwrruhdljkoz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || ''

if (!supabaseServiceKey) {
  console.warn('⚠️  SUPABASE_SERVICE_KEY not set. Some operations may fail.')
}

// Use service role key for backend operations (bypasses RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-client-info': 'uxcam-backend'
    }
  }
})

// Test Supabase connection on startup
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('projects').select('id').limit(1)
    if (error) {
      console.error('❌ Supabase connection test failed:', error.message)
    } else {
      console.log('✅ Supabase connection test successful')
    }
  } catch (err: any) {
    console.error('❌ Supabase connection error:', err.message)
  }
}

// Test connection (non-blocking)
testSupabaseConnection().catch(() => {})