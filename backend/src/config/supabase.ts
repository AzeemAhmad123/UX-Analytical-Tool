import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// NEW PROJECT: kkgdxfencpyabcmizytn
// OLD PROJECT: xrvmiyrsxwrruhdljkoz (DO NOT USE)
const supabaseUrl = process.env.SUPABASE_URL || 'https://kkgdxfencpyabcmizytn.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || ''

// Debug logging to verify which Supabase project is being used
console.log('🔍 Backend Supabase Config:', {
  envUrl: process.env.SUPABASE_URL || 'NOT SET',
  usedUrl: supabaseUrl,
  envKey: process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'NOT SET',
  isNewProject: supabaseUrl.includes('kkgdxfencpyabcmizytn'),
  isOldProject: supabaseUrl.includes('xrvmiyrsxwrruhdljkoz')
})

if (supabaseUrl.includes('xrvmiyrsxwrruhdljkoz')) {
  console.error('❌ ERROR: Backend is using OLD Supabase project! Check Vercel environment variables.')
}

if (!supabaseServiceKey) {
  console.warn('⚠️  SUPABASE_SERVICE_KEY not set. Some operations may fail.')
}

// Export URL for debugging
export const SUPABASE_URL = supabaseUrl

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
}// Test connection (non-blocking)
testSupabaseConnection().catch(() => {})

