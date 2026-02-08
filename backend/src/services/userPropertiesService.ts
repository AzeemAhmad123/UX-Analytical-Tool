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
// Track if device_type column exists (cache to avoid repeated failures)
let deviceTypeColumnExists: boolean | null = null

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
      // Build update object, excluding device_type if not in schema
      const updateData: any = {
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(initialProperties && {
          country: initialProperties.country || existing.country,
          platform: initialProperties.platform || existing.platform,
          app_version: initialProperties.app_version || existing.app_version,
          acquisition_source: initialProperties.acquisition_source || existing.acquisition_source,
          properties: { ...existing.properties, ...(initialProperties.properties || {}) }
        })
      }
      
      // Only include device_type if we know the column exists AND it's provided
      // Skip device_type entirely if we've previously detected it doesn't exist
      if (deviceTypeColumnExists !== false && (initialProperties?.device_type || existing.device_type)) {
        updateData.device_type = initialProperties?.device_type || existing.device_type
      }
      
      // Try to update - if device_type column doesn't exist, retry without it
      let { data: updated, error: updateError } = await supabase
        .from('user_properties')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single()

      // Check if error is about device_type column not existing
      const isDeviceTypeError = updateError && (
        updateError.code === 'PGRST204' || 
        (typeof updateError.message === 'string' && (
          updateError.message.includes('device_type') || 
          updateError.message.includes('Could not find') ||
          updateError.message.includes('schema cache')
        ))
      )
      
      if (isDeviceTypeError) {
        console.warn('⚠️ device_type column not found, retrying update without device_type')
        deviceTypeColumnExists = false // Cache that column doesn't exist
        
        // Remove device_type from update data and retry
        const { device_type, ...updateDataWithoutDeviceType } = updateData
        const retryResult = await supabase
          .from('user_properties')
          .update(updateDataWithoutDeviceType)
          .eq('id', existing.id)
          .select()
          .single()
        
        updated = retryResult.data
        updateError = retryResult.error
        
        // If retry succeeded, return the updated record
        if (!updateError && updated) {
          return updated
        }
        // If retry failed, return existing record (don't throw error)
        if (updateError) {
          console.warn('⚠️ Retry without device_type failed, returning existing record')
          return existing
        }
      } else if (!updateError && deviceTypeColumnExists === null && updateData.device_type !== undefined) {
        // If update succeeded and we included device_type, column exists
        deviceTypeColumnExists = true
      }

      // Only throw non-device_type errors
      if (updateError && updateError.code !== 'PGRST116' && !isDeviceTypeError) {
        throw updateError
      }

      return updated || existing
    }

    // Create new
    const now = new Date().toISOString()
    
    // Build insert object, excluding device_type if not provided (column may not exist in schema)
    const insertData: any = {
      project_id: projectId,
      user_id: userId,
      country: initialProperties?.country,
      platform: initialProperties?.platform,
      app_version: initialProperties?.app_version,
      acquisition_source: initialProperties?.acquisition_source,
      properties: initialProperties?.properties || {},
      first_seen: now,
      last_seen: now,
      is_new_user: true,
      created_at: now,
      updated_at: now
    }
    
    // Only include device_type if we know the column exists AND it's provided
    // Skip device_type entirely if we've previously detected it doesn't exist
    if (deviceTypeColumnExists !== false && initialProperties?.device_type) {
      insertData.device_type = initialProperties.device_type
    }
    
    // Try to insert - if device_type column doesn't exist, retry without it
    let { data: created, error: createError } = await supabase
      .from('user_properties')
      .insert(insertData)
      .select()
      .single()

    // If error is about device_type column not existing, retry without it and cache the result
    if (createError && (createError.code === 'PGRST204' || createError.message?.includes('device_type'))) {
      console.warn('⚠️ device_type column not found, retrying insert without device_type')
      deviceTypeColumnExists = false // Cache that column doesn't exist
      
      // Remove device_type from insert data and retry
      const { device_type, ...insertDataWithoutDeviceType } = insertData
      const retryResult = await supabase
        .from('user_properties')
        .insert(insertDataWithoutDeviceType)
        .select()
        .single()
      
      created = retryResult.data
      createError = retryResult.error
    } else if (!createError && deviceTypeColumnExists === null) {
      // If insert succeeded and we included device_type, column exists
      if (insertData.device_type !== undefined) {
        deviceTypeColumnExists = true
      }
    }

    if (createError) {
      throw createError
    }

    return created
  } catch (error: any) {
    // Check if this is a device_type error - handle gracefully without breaking the request
    const isDeviceTypeError = error && (
      error.code === 'PGRST204' || 
      (typeof error.message === 'string' && (
        error.message.includes('device_type') || 
        error.message.includes('Could not find') ||
        error.message.includes('schema cache')
      ))
    )
    
    if (isDeviceTypeError) {
      // Log as warning, not error - this is expected when column doesn't exist
      console.warn('⚠️ device_type column not found in user_properties table - skipping device_type update')
      deviceTypeColumnExists = false // Cache that column doesn't exist
      // Don't throw - return null to indicate failure without breaking the request
      // The calling code in events.ts already handles this gracefully with .catch()
      return null as any
    }
    
    // For other errors, log and throw
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

