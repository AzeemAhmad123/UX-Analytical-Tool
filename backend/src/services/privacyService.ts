/**
 * Privacy Service
 * 
 * Handles privacy settings, GDPR consent, and data masking
 */

import { supabase } from '../config/supabase'

export interface PrivacySettings {
  id: string
  project_id: string
  mask_sensitive_fields: boolean
  sensitive_field_selectors: string[]
  gdpr_enabled: boolean
  gdpr_consent_required: boolean
  sampling_enabled: boolean
  sampling_rate: number
  ip_anonymization: boolean
  data_retention_days: number
  created_at: string
  updated_at: string
}

export interface GDPRConsent {
  id: string
  project_id: string
  session_id?: string
  user_id?: string
  consent_type: 'analytics' | 'marketing' | 'functional' | 'all'
  consented: boolean
  consent_method?: string
  ip_address?: string
  user_agent?: string
  created_at: string
  updated_at: string
}

/**
 * Get privacy settings for a project
 */
export async function getPrivacySettings(projectId: string): Promise<PrivacySettings | null> {
  try {
    const { data, error } = await supabase
      .from('privacy_settings')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error
    }

    // If no settings exist, return default settings
    if (!data) {
      return {
        id: '',
        project_id: projectId,
        mask_sensitive_fields: true,
        sensitive_field_selectors: ['input[type="password"]', 'input[name*="password"]', 'input[name*="credit"]', 'input[name*="ssn"]'],
        gdpr_enabled: false,
        gdpr_consent_required: false,
        sampling_enabled: false,
        sampling_rate: 1.0,
        ip_anonymization: false,
        data_retention_days: 365,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }

    return data
  } catch (error: any) {
    console.error('Error fetching privacy settings:', error)
    return null
  }
}

/**
 * Update privacy settings for a project
 */
export async function updatePrivacySettings(
  projectId: string,
  settings: Partial<PrivacySettings>
): Promise<PrivacySettings> {
  try {
    // Check if settings exist
    const existing = await getPrivacySettings(projectId)

    if (existing && existing.id) {
      // Update existing
      const { data, error } = await supabase
        .from('privacy_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    } else {
      // Create new
      const { data, error } = await supabase
        .from('privacy_settings')
        .insert({
          project_id: projectId,
          ...settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    }
  } catch (error: any) {
    console.error('Error updating privacy settings:', error)
    throw error
  }
}

/**
 * Check if user has given consent
 */
export async function hasConsent(
  projectId: string,
  sessionId: string,
  consentType: 'analytics' | 'marketing' | 'functional' | 'all' = 'analytics'
): Promise<boolean> {
  try {
    const settings = await getPrivacySettings(projectId)
    
    // If GDPR is not enabled or consent is not required, allow tracking
    if (!settings?.gdpr_enabled || !settings?.gdpr_consent_required) {
      return true
    }

    // Check for consent
    const { data, error } = await supabase
      .from('gdpr_consents')
      .select('consented')
      .eq('project_id', projectId)
      .eq('session_id', sessionId)
      .in('consent_type', [consentType, 'all'])
      .eq('consented', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking consent:', error)
      return false // Default to no consent on error
    }

    return data?.consented === true
  } catch (error: any) {
    console.error('Error checking consent:', error)
    return false
  }
}

/**
 * Record GDPR consent
 */
export async function recordConsent(
  projectId: string,
  consentData: {
    session_id?: string
    user_id?: string
    consent_type: 'analytics' | 'marketing' | 'functional' | 'all'
    consented: boolean
    consent_method?: string
    ip_address?: string
    user_agent?: string
  }
): Promise<GDPRConsent> {
  try {
    const { data, error } = await supabase
      .from('gdpr_consents')
      .insert({
        project_id: projectId,
        ...consentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  } catch (error: any) {
    console.error('Error recording consent:', error)
    throw error
  }
}

/**
 * Check if event should be sampled (based on sampling rate)
 */
export function shouldSample(samplingRate: number): boolean {
  if (samplingRate >= 1.0) {
    return true // Always sample if rate is 100%
  }
  if (samplingRate <= 0.0) {
    return false // Never sample if rate is 0%
  }
  // Random sampling based on rate
  return Math.random() < samplingRate
}

/**
 * Mask sensitive data in event properties
 */
export function maskSensitiveData(
  data: any,
  sensitiveFieldSelectors: string[]
): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  const masked = { ...data }

  // Common sensitive field patterns
  const sensitivePatterns = [
    /password/i,
    /credit.*card/i,
    /ssn/i,
    /social.*security/i,
    /cvv/i,
    /cvc/i,
    /pin/i,
    /secret/i,
    /token/i,
    /api.*key/i,
    /authorization/i
  ]

  for (const key in masked) {
    const value = masked[key]
    
    // Check if key matches sensitive patterns
    const isSensitive = sensitivePatterns.some(pattern => pattern.test(key))
    
    // Check if key is in sensitive selectors
    const isInSelectors = sensitiveFieldSelectors.some(selector => {
      // Support both CSS selectors and field names
      if (selector.includes('[') || selector.includes('#')) {
        // CSS selector - for now, just check if key matches
        return false // Would need DOM parsing for full support
      }
      return key.toLowerCase().includes(selector.toLowerCase())
    })

    if (isSensitive || isInSelectors) {
      masked[key] = '***MASKED***'
    } else if (typeof value === 'object' && value !== null) {
      // Recursively mask nested objects
      masked[key] = maskSensitiveData(value, sensitiveFieldSelectors)
    }
  }

  return masked
}

/**
 * Anonymize IP address
 */
export function anonymizeIP(ip: string): string {
  if (!ip) return ip

  // IPv4: Remove last octet
  if (ip.includes('.')) {
    const parts = ip.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`
    }
  }

  // IPv6: Remove last 64 bits (simplified)
  if (ip.includes(':')) {
    const parts = ip.split(':')
    if (parts.length > 4) {
      return `${parts.slice(0, 4).join(':')}::`
    }
  }

  return ip
}

/**
 * Get consent history for a project
 */
export async function getConsentHistory(
  projectId: string,
  limit: number = 100
): Promise<GDPRConsent[]> {
  try {
    const { data, error } = await supabase
      .from('gdpr_consents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    return data || []
  } catch (error: any) {
    console.error('Error fetching consent history:', error)
    return []
  }
}

/**
 * Clean up old data based on retention policy
 */
export async function cleanupOldData(projectId: string): Promise<{
  events_deleted: number
  sessions_deleted: number
  snapshots_deleted: number
}> {
  try {
    const settings = await getPrivacySettings(projectId)
    if (!settings) {
      return { events_deleted: 0, sessions_deleted: 0, snapshots_deleted: 0 }
    }

    const retentionDays = settings.data_retention_days || 365
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

    // Delete old events
    const { count: eventsCount } = await supabase
      .from('events')
      .delete()
      .eq('project_id', projectId)
      .lt('timestamp', cutoffDate.toISOString())
      .select('*', { count: 'exact', head: true })

    // Delete old sessions
    const { count: sessionsCount } = await supabase
      .from('sessions')
      .delete()
      .eq('project_id', projectId)
      .lt('start_time', cutoffDate.toISOString())
      .select('*', { count: 'exact', head: true })

    // Delete old snapshots
    const { count: snapshotsCount } = await supabase
      .from('snapshots')
      .delete()
      .eq('project_id', projectId)
      .lt('timestamp', cutoffDate.toISOString())
      .select('*', { count: 'exact', head: true })

    return {
      events_deleted: eventsCount || 0,
      sessions_deleted: sessionsCount || 0,
      snapshots_deleted: snapshotsCount || 0
    }
  } catch (error: any) {
    console.error('Error cleaning up old data:', error)
    return { events_deleted: 0, sessions_deleted: 0, snapshots_deleted: 0 }
  }
}

