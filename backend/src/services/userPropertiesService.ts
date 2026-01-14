/**
 * User Properties Service
 * 
 * Manages user properties, cohorts, and filtering
 */

import { supabase } from '../config/supabase'

export interface UserProperties {
  id: string
  project_id: string
  user_id: string
  properties: Record<string, any>
  country?: string
  platform?: string
  app_version?: string
  device_type?: string
  acquisition_source?: string
  first_seen: string
  last_seen: string
  is_new_user: boolean
  created_at: string
  updated_at: string
}

export interface CohortFilter {
  country?: string
  platform?: 'web' | 'android' | 'ios' | 'all'
  app_version?: string
  device_type?: string
  acquisition_source?: string
  is_new_user?: boolean
  custom_properties?: Record<string, any>
}

/**
 * Get or create user properties
 */
export async function getOrCreateUserProperties(
  projectId: string,
  userId: string,
  initialProperties?: Partial<UserProperties>
): Promise<UserProperties> {
  try {
    // Try to get existing
    const { data: existing, error: fetchError } = await supabase
      .from('user_properties')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    if (existing && !fetchError) {
      // Update last_seen
      const { data: updated } = await supabase
        .from('user_properties')
        .update({
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(initialProperties && {
            country: initialProperties.country || existing.country,
            platform: initialProperties.platform || existing.platform,
            app_version: initialProperties.app_version || existing.app_version,
            device_type: initialProperties.device_type || existing.device_type,
            acquisition_source: initialProperties.acquisition_source || existing.acquisition_source,
            properties: { ...existing.properties, ...(initialProperties.properties || {}) }
          })
        })
        .eq('id', existing.id)
        .select()
        .single()

      return updated || existing
    }

    // Create new
    const now = new Date().toISOString()
    const { data: created, error: createError } = await supabase
      .from('user_properties')
      .insert({
        project_id: projectId,
        user_id: userId,
        country: initialProperties?.country,
        platform: initialProperties?.platform,
        app_version: initialProperties?.app_version,
        device_type: initialProperties?.device_type,
        acquisition_source: initialProperties?.acquisition_source,
        properties: initialProperties?.properties || {},
        first_seen: now,
        last_seen: now,
        is_new_user: true,
        created_at: now,
        updated_at: now
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    return created
  } catch (error: any) {
    console.error('Error getting/creating user properties:', error)
    throw error
  }
}

/**
 * Update user properties
 */
export async function updateUserProperties(
  projectId: string,
  userId: string,
  updates: Partial<UserProperties>
): Promise<UserProperties> {
  try {
    const { data, error } = await supabase
      .from('user_properties')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        last_seen: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  } catch (error: any) {
    console.error('Error updating user properties:', error)
    throw error
  }
}

/**
 * Get user IDs matching cohort filter
 */
export async function getCohortUserIds(
  projectId: string,
  filter: CohortFilter
): Promise<string[]> {
  try {
    let query = supabase
      .from('user_properties')
      .select('user_id')
      .eq('project_id', projectId)

    if (filter.country) {
      query = query.eq('country', filter.country)
    }

    if (filter.platform && filter.platform !== 'all') {
      query = query.eq('platform', filter.platform)
    }

    if (filter.app_version) {
      query = query.eq('app_version', filter.app_version)
    }

    if (filter.device_type) {
      query = query.eq('device_type', filter.device_type)
    }

    if (filter.acquisition_source) {
      query = query.eq('acquisition_source', filter.acquisition_source)
    }

    if (filter.is_new_user !== undefined) {
      query = query.eq('is_new_user', filter.is_new_user)
    }

    // Custom properties filtering (basic implementation)
    if (filter.custom_properties) {
      for (const [key, value] of Object.entries(filter.custom_properties)) {
        query = query.contains('properties', { [key]: value })
      }
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return (data || []).map(u => u.user_id)
  } catch (error: any) {
    console.error('Error getting cohort user IDs:', error)
    return []
  }
}

/**
 * Get user properties by user ID
 */
export async function getUserProperties(
  projectId: string,
  userId: string
): Promise<UserProperties | null> {
  try {
    const { data, error } = await supabase
      .from('user_properties')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data || null
  } catch (error: any) {
    console.error('Error getting user properties:', error)
    return null
  }
}

