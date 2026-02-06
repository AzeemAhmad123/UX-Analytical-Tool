import { createClient } from '@supabase/supabase-js'

// Supabase configuration
// NEW PROJECT: kkgdxfencpyabcmizytn
// Use environment variables with fallback to default values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kkgdxfencpyabcmizytn.supabase.co'

// Anon key (public key) - Safe to use in frontend/client-side
// Use environment variable with fallback
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZ2R4ZmVuY3B5YWJjbWl6eXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODIxNTMsImV4cCI6MjA4NDc1ODE1M30.6zx9s2QaGVZXAZgliwH3Uvrr9IkQQ9-uvpNG6y5inV0'

// Debug: Log the Supabase URL being used (remove after fixing)
if (typeof window !== 'undefined') {
  console.log('🔍 Supabase Config Debug:', {
    envUrl: import.meta.env.VITE_SUPABASE_URL,
    usedUrl: supabaseUrl,
    envKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
    isNewProject: supabaseUrl.includes('kkgdxfencpyabcmizytn'),
    isOldProject: supabaseUrl.includes('xrvmiyrsxwrruhdljkoz')
  })
  
  if (supabaseUrl.includes('xrvmiyrsxwrruhdljkoz')) {
    console.error('❌ ERROR: Still using OLD Supabase project! Check Vercel environment variables.')
  }
}

// ⚠️ IMPORTANT: DO NOT use the secret key (sb_secret_...) in the frontend!
// The secret key is ONLY for backend/server-side operations and should NEVER
// be exposed in client-side code. Keep it secure in your backend environment variables.

// Custom fetch with increased timeout for Supabase requests
const customFetch = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    // If it's a timeout, throw a more descriptive error
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please check your internet connection')
    }
    throw error
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Increase timeout for slow connections
    flowType: 'pkce'
  },
  // Add global fetch options for better error handling
  global: {
    headers: {
      'x-client-info': 'uxcam-frontend'
    },
    fetch: customFetch // Use custom fetch with timeout
  },
  // Configure realtime and storage options
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Auth helper functions
export const auth = {
  signUp: async (email: string, password: string, metadata = {}) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
  },

  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password
    })
  },

  signOut: async () => {
    return await supabase.auth.signOut()
  },

  resetPassword: async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
  },

  getUser: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  updateEmail: async (newEmail: string) => {
    return await supabase.auth.updateUser({
      email: newEmail
    })
  },

  updatePassword: async (newPassword: string) => {
    return await supabase.auth.updateUser({
      password: newPassword
    })
  },

  updateUser: async (updates: { email?: string; password?: string; data?: any }) => {
    return await supabase.auth.updateUser(updates)
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

