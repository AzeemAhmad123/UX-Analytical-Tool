/**
 * User Segmentation Service
 * 
 * Creates and manages user segments based on behavior and properties
 */

import { supabase } from '../config/supabase'

export interface SegmentCondition {
  field: string // e.g., 'country', 'platform', 'user_property.key'
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: any
}

export interface UserSegment {
  id: string
  project_id: string
  name: string
  description?: string
  conditions: SegmentCondition[]
  user_count: number
  created_by?: string
  created_at: string
  updated_at: string
}

/**
 * Create a new user segment
 */
export async function createUserSegment(
  projectId: string,
  data: {
    name: string
    description?: string
    conditions: SegmentCondition[]
    created_by?: string
  }
): Promise<UserSegment> {
  // Calculate initial user count
  const userCount = await calculateSegmentUserCount(projectId, data.conditions)

  const { data: segment, error } = await supabase
    .from('user_segments')
    .insert({
      project_id: projectId,
      name: data.name,
      description: data.description,
      conditions: data.conditions,
      user_count: userCount,
      created_by: data.created_by
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create user segment: ${error.message}`)
  }

  return segment as UserSegment
}

/**
 * Calculate how many users match segment conditions
 */
async function calculateSegmentUserCount(
  projectId: string,
  conditions: SegmentCondition[]
): Promise<number> {
  if (conditions.length === 0) {
    return 0
  }

  // Get all unique user_ids from events
  const { data: events } = await supabase
    .from('events')
    .select('user_id, session_id')
    .eq('project_id', projectId)
    .not('user_id', 'is', null)
    .limit(10000)

  if (!events || events.length === 0) {
    return 0
  }

  const userIds = Array.from(new Set(events.map(e => e.user_id).filter(Boolean)))
  
  // Get user properties for these users
  const { data: userProps } = await supabase
    .from('user_properties')
    .select('*')
    .eq('project_id', projectId)
    .in('user_id', userIds)

  // Get sessions for additional data
  const sessionIds = Array.from(new Set(events.map(e => e.session_id)))
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('project_id', projectId)
    .in('id', sessionIds)

  // Create user data map
  const userDataMap = new Map<string, any>()
  
  // Add user properties
  userProps?.forEach(up => {
    if (!userDataMap.has(up.user_id)) {
      userDataMap.set(up.user_id, {})
    }
    const userData = userDataMap.get(up.user_id)!
    userData.country = up.country
    userData.device_type = up.device_type
    userData.app_version = up.app_version
    userData.platform = up.platform
    // Add custom properties
    if (up.custom_properties) {
      Object.assign(userData, up.custom_properties)
    }
  })

  // Add session data
  sessions?.forEach(session => {
    const event = events.find(e => e.session_id === session.id)
    if (event?.user_id) {
      if (!userDataMap.has(event.user_id)) {
        userDataMap.set(event.user_id, {})
      }
      const userData = userDataMap.get(event.user_id)!
      if (session.country && !userData.country) {
        userData.country = session.country
      }
      if (session.device_info) {
        userData.device_info = session.device_info
      }
    }
  })

  // Filter users based on conditions
  let matchingUsers = 0

  for (const userId of userIds) {
    const userData = userDataMap.get(userId) || {}
    let matches = true

    for (const condition of conditions) {
      const fieldValue = getNestedValue(userData, condition.field)
      const matchesCondition = evaluateCondition(fieldValue, condition.operator, condition.value)

      if (!matchesCondition) {
        matches = false
        break
      }
    }

    if (matches) {
      matchingUsers++
    }
  }

  return matchingUsers
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.')
  let value = obj
  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = value[part]
    } else {
      return undefined
    }
  }
  return value
}

/**
 * Evaluate a condition
 */
function evaluateCondition(value: any, operator: string, expected: any): boolean {
  switch (operator) {
    case 'equals':
      return value === expected
    case 'not_equals':
      return value !== expected
    case 'contains':
      return String(value || '').toLowerCase().includes(String(expected || '').toLowerCase())
    case 'greater_than':
      return Number(value || 0) > Number(expected || 0)
    case 'less_than':
      return Number(value || 0) < Number(expected || 0)
    case 'in':
      return Array.isArray(expected) && expected.includes(value)
    case 'not_in':
      return Array.isArray(expected) && !expected.includes(value)
    default:
      return false
  }
}

/**
 * Get all segments for a project
 */
export async function getProjectSegments(projectId: string): Promise<UserSegment[]> {
  const { data, error } = await supabase
    .from('user_segments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching segments:', error)
    return []
  }

  return (data || []) as UserSegment[]
}

/**
 * Update a segment
 */
export async function updateSegment(
  segmentId: string,
  updates: Partial<UserSegment>
): Promise<UserSegment> {
  const updateData: any = { ...updates, updated_at: new Date().toISOString() }

  // Recalculate user count if conditions changed
  if (updates.conditions) {
    const { data: segment } = await supabase
      .from('user_segments')
      .select('project_id')
      .eq('id', segmentId)
      .single()

    if (segment) {
      updateData.user_count = await calculateSegmentUserCount(segment.project_id, updates.conditions)
    }
  }

  const { data, error } = await supabase
    .from('user_segments')
    .update(updateData)
    .eq('id', segmentId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update segment: ${error.message}`)
  }

  return data as UserSegment
}

/**
 * Delete a segment
 */
export async function deleteSegment(segmentId: string): Promise<void> {
  const { error } = await supabase
    .from('user_segments')
    .delete()
    .eq('id', segmentId)

  if (error) {
    throw new Error(`Failed to delete segment: ${error.message}`)
  }
}

/**
 * Refresh segment user count
 */
export async function refreshSegmentCount(segmentId: string): Promise<number> {
  const { data: segment } = await supabase
    .from('user_segments')
    .select('project_id, conditions')
    .eq('id', segmentId)
    .single()

  if (!segment) {
    throw new Error('Segment not found')
  }

  const userCount = await calculateSegmentUserCount(segment.project_id, segment.conditions)

  await supabase
    .from('user_segments')
    .update({ user_count: userCount })
    .eq('id', segmentId)

  return userCount
}

