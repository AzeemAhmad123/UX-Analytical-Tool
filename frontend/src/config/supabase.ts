import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = 'https://xrvmiyrsxwrruhdljkoz.supabase.co'

// Anon key (public key) - Safe to use in frontend/client-side
// This is the legacy anon key from Supabase API settings
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhydm1peXJzeHdycnVoZGxqa296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NTI0MjQsImV4cCI6MjA4MzAyODQyNH0.sMA-J-RFzvsVLbaf504jAYQ_zOmEMAwMnata7EscOqw'

// ⚠️ IMPORTANT: DO NOT use the secret key (sb_secret_...) in the frontend!
// The secret key is ONLY for backend/server-side operations and should NEVER
// be exposed in client-side code. Keep it secure in your backend environment variables.

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
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

