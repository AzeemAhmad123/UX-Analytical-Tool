import { supabase } from '../config/supabase'

export interface DeviceInfo {
  userAgent?: string
  platform?: string
  language?: string
  screenWidth?: number
  screenHeight?: number
  timezone?: string
  [key: string]: any
}

export interface SessionData {
  id: string
  project_id: string
  session_id: string
  device_info: DeviceInfo
  start_time: string
  last_activity_time: string
  duration?: number
  event_count: number
  created_at: string
  updated_at: string
}

/**
 * Find or create a session
 * Returns the session database ID (UUID)
 */
export async function findOrCreateSession(
  projectId: string,
  sessionId: string,
  deviceInfo: DeviceInfo = {}
): Promise<{ session: SessionData; created: boolean }> {
  try {
    console.log('🔍 Looking for existing session:', {
      projectId,
      sessionId,
      sessionIdLength: sessionId?.length,
      sessionIdType: typeof sessionId
    })
    
    // First, try to find existing session
    const { data: existingSession, error: findError } = await supabase
      .from('sessions')
      .select('*')
      .eq('project_id', projectId)
      .eq('session_id', sessionId)
      .single()

    if (existingSession && !findError) {
      // Session exists, return it
      console.log('✅ Found existing session - reusing for continuous recording:', {
        sessionId: existingSession.session_id,
        dbId: existingSession.id,
        startTime: existingSession.start_time,
        eventCount: existingSession.event_count
      })
      return {
        session: existingSession as SessionData,
        created: false
      }
    }
    
    if (findError && findError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected for new sessions
      console.warn('⚠️ Error finding session (not "not found"):', findError)
    } else {
      console.log('📝 No existing session found - creating new one:', {
        sessionId,
        projectId
      })
    }

    // Session doesn't exist, create new one
    const now = new Date().toISOString()
    
    // Ensure device_info contains location data
    // Location should be stored in device_info JSONB, not separate columns
    const enhancedDeviceInfo = {
      ...deviceInfo,
      // Ensure city and country are in device_info
      city: deviceInfo?.city || null,
      country: deviceInfo?.country || null,
      region: deviceInfo?.region || null,
    }
    
    const newSession = {
      project_id: projectId,
      session_id: sessionId,
      device_info: enhancedDeviceInfo, // Store location in device_info JSONB
      start_time: now,
      last_activity_time: now,
      event_count: 0,
      duration: 0 // Will be updated when session ends
    }

    const { data: createdSession, error: createError } = await supabase
      .from('sessions')
      .insert(newSession)
      .select()
      .single()

    if (createError || !createdSession) {
      throw new Error(`Failed to create session: ${createError?.message || 'Unknown error'}`)
    }

    return {
      session: createdSession as SessionData,
      created: true
    }
  } catch (error: any) {
    console.error('Error in findOrCreateSession:', error)
    throw error
  }
}

/**
 * Update session activity (last activity time and event count)
 */
export async function updateSessionActivity(
  sessionId: string,
  eventCount?: number
): Promise<void> {
  try {
    const updateData: any = {
      last_activity_time: new Date().toISOString()
    }

    if (eventCount !== undefined) {
      updateData.event_count = eventCount
    }

    const { error } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`)
    }
  } catch (error: any) {
    console.error('Error in updateSessionActivity:', error)
    throw error
  }
}

/**
 * Get session by database ID
 */
export async function getSessionById(sessionDbId: string): Promise<SessionData | null> {
  try {
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionDbId)
      .single()

    if (error || !session) {
      return null
    }

    return session as SessionData
  } catch (error: any) {
    console.error('Error in getSessionById:', error)
    return null
  }
}

/**
 * Get session by project ID and session ID (from SDK)
 */
export async function getSessionByProjectAndSessionId(
  projectId: string,
  sessionId: string
): Promise<SessionData | null> {
  try {
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('project_id', projectId)
      .eq('session_id', sessionId)
      .single()

    if (error || !session) {
      return null
    }

    return session as SessionData
  } catch (error: any) {
    console.error('Error in getSessionByProjectAndSessionId:', error)
    return null
  }
}

/**
 * Get all sessions for a project
 */
export async function getSessionsByProject(
  projectId: string,
  options?: {
    limit?: number
    offset?: number
    startDate?: string
    endDate?: string
  }
): Promise<{ sessions: SessionData[]; total: number }> {
  try {
    let query = supabase
      .from('sessions')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .order('start_time', { ascending: false })

    if (options?.limit) {
      const offset = options.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    }

    if (options?.startDate) {
      query = query.gte('start_time', options.startDate)
    }

    if (options?.endDate) {
      query = query.lte('start_time', options.endDate)
    }

    const { data: sessions, error, count } = await query

    if (error) {
      throw new Error(`Failed to retrieve sessions: ${error.message}`)
    }

    return {
      sessions: (sessions || []) as SessionData[],
      total: count || 0
    }
  } catch (error: any) {
    console.error('Error in getSessionsByProject:', error)
    throw error
  }
}

/**
 * Check if a session should be filtered out (doesn't meet minimum criteria)
 * Sessions are filtered if:
 * - Duration < 10 seconds (if duration is set)
 * - No snapshots (snapshot_count === 0)
 * - Insufficient events (event_count < 2)
 * 
 * Note: Duration check is optional - sessions without duration set are not filtered by duration alone
 */
export async function shouldFilterSession(sessionDbId: string): Promise<boolean> {
  try {
    // Get session with all necessary data
    const session = await getSessionById(sessionDbId)
    if (!session) {
      return true // Filter out non-existent sessions
    }

    // Check snapshot count first (most important - no snapshots = no replay)
    const { count: snapshotCount } = await supabase
      .from('session_snapshots')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionDbId)

    if ((snapshotCount || 0) === 0) {
      console.log(`🚫 Session ${sessionDbId} filtered: no snapshots`)
      return true
    }

    // Check event count < 2 (insufficient activity - user interactions like clicks, scrolls, inputs)
    const eventCount = session.event_count || 0
    if (eventCount < 2) {
      console.log(`🚫 Session ${sessionDbId} filtered: event_count ${eventCount} < 2`)
      return true
    }

    // Check duration < 10 seconds
    // Calculate duration: use stored duration, or calculate from timestamps for active sessions
    let duration = (session.duration || 0) / 1000 // Convert to seconds
    
    // If duration is 0 or missing, calculate from timestamps (for active sessions)
    if (duration === 0 && session.start_time && session.last_activity_time) {
      const startTime = new Date(session.start_time).getTime()
      const lastActivityTime = new Date(session.last_activity_time).getTime()
      const calculatedDuration = (lastActivityTime - startTime) / 1000 // Convert to seconds
      if (calculatedDuration > 0) {
        duration = calculatedDuration
      }
    }
    
    if (duration < 10) {
      console.log(`🚫 Session ${sessionDbId} filtered: duration ${duration.toFixed(1)}s < 10s`)
      return true
    }

    return false // Session meets all criteria
  } catch (error: any) {
    console.error('Error checking if session should be filtered:', error)
    // On error, don't filter (safer to keep session than delete it)
    return false
  }
}

/**
 * Delete a session and all related data (snapshots, events, videos)
 * This is used to clean up sessions that don't meet minimum criteria
 */
export async function deleteSessionAndRelatedData(sessionDbId: string): Promise<void> {
  try {
    console.log('🗑️ Deleting session ' + sessionDbId + ' and all related data')

    // Delete related data first (foreign key constraints)
    // Note: If CASCADE is set up, deleting the session will automatically delete related data
    // But we'll delete explicitly to be safe and for logging

    // Delete snapshots
    const { error: snapshotError } = await supabase
      .from('session_snapshots')
      .delete()
      .eq('session_id', sessionDbId)

    if (snapshotError) {
      console.warn('Error deleting snapshots (may not exist):', snapshotError.message)
    }

    // Delete events
    const { error: eventError } = await supabase
      .from('events')
      .delete()
      .eq('session_id', sessionDbId)

    if (eventError) {
      console.warn('Error deleting events (may not exist):', eventError.message)
    }

    // Delete videos
    const { error: videoError } = await supabase
      .from('session_videos')
      .delete()
      .eq('session_id', sessionDbId)

    if (videoError) {
      console.warn('Error deleting videos (may not exist):', videoError.message)
    }

    // Finally, delete the session itself
    const { error: sessionError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionDbId)

    if (sessionError) {
      throw new Error('Failed to delete session: ' + sessionError.message)
    }

    console.log('✅ Successfully deleted session ' + sessionDbId + ' and all related data')
  } catch (error: any) {
    console.error('Error deleting session and related data:', error)
    throw error
  }
}
