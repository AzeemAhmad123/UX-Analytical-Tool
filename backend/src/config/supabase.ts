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
  }
})

