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
    // First, try to find existing session
    const { data: existingSession, error: findError } = await supabase
      .from('sessions')
      .select('*')
      .eq('project_id', projectId)
      .eq('session_id', sessionId)
      .single()

    if (existingSession && !findError) {
      // Session exists, return it
      return {
        session: existingSession as SessionData,
        created: false
      }
    }

    // Session doesn't exist, create new one
    const now = new Date().toISOString()
    const newSession = {
      project_id: projectId,
      session_id: sessionId,
      device_info: deviceInfo,
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

