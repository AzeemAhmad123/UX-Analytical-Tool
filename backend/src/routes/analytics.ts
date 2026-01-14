import { Router, Request, Response, NextFunction } from 'express'
import { supabase } from '../config/supabase'

const router = Router()

// Middleware to validate project exists (no auth required for analytics - public stats)
async function validateProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params
    
    const { data: project, error } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (error || !project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    next()
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate project' })
  }
}

/**
 * Detect platform from device_info
 */
function detectPlatform(deviceInfo: any): 'mobile' | 'web' {
  if (!deviceInfo) return 'web'
  
  const viewportWidth = deviceInfo.viewportWidth || deviceInfo.screenWidth || 0
  const userAgent = deviceInfo.userAgent || ''
  
  // Check viewport width first
  if (viewportWidth > 0 && viewportWidth < 768) {
    return 'mobile'
  }
  
  // Check user agent as fallback
  if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
    return 'mobile'
  }
  
  return 'web'
}

// Get analytics overview for a project
router.get('/:projectId/overview', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const { start_date, end_date, platform_filter } = req.query
    const platformFilter = (platform_filter as 'all' | 'mobile' | 'web') || 'all'

    // Get all sessions first (we'll filter by platform after fetching)
    let sessionQuery = supabase
      .from('sessions')
      .select('*')
      .eq('project_id', projectId)
    
    if (start_date) {
      sessionQuery = sessionQuery.gte('created_at', start_date as string)
    }
    if (end_date) {
      sessionQuery = sessionQuery.lte('created_at', end_date as string)
    }
    
    const { data: allSessions, error: sessionError } = await sessionQuery
    
    if (sessionError) {
      throw new Error(`Failed to fetch sessions: ${sessionError.message}`)
    }

    // Filter sessions by platform if needed
    let filteredSessions = allSessions || []
    if (platformFilter !== 'all') {
      filteredSessions = filteredSessions.filter(s => {
        const platform = detectPlatform(s.device_info)
        return platform === platformFilter
      })
    }
    
    const sessionCount = filteredSessions.length

    // Get session IDs for filtered sessions
    const filteredSessionIds = filteredSessions.map(s => s.id)
    
    // Get total events count (only for filtered sessions)
    let eventCount = 0
    if (filteredSessionIds.length > 0) {
      let eventQuery = supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .in('session_id', filteredSessionIds)
      
      if (start_date) {
        eventQuery = eventQuery.gte('created_at', start_date as string)
      }
      if (end_date) {
        eventQuery = eventQuery.lte('created_at', end_date as string)
      }
      
      const { count } = await eventQuery
      eventCount = count || 0
    }

    // Get sessions with replay (have snapshots) - only for filtered sessions
    let sessionsWithReplay = 0
    if (filteredSessionIds.length > 0) {
      let snapshotQuery = supabase
        .from('session_snapshots')
        .select('session_id')
        .in('session_id', filteredSessionIds)
      
      if (start_date) {
        snapshotQuery = snapshotQuery.gte('created_at', start_date as string)
      }
      if (end_date) {
        snapshotQuery = snapshotQuery.lte('created_at', end_date as string)
      }
      
      const { data: snapshotData } = await snapshotQuery
      const uniqueSessions = new Set(snapshotData?.map((s: any) => s.session_id) || [])
      sessionsWithReplay = uniqueSessions.size
    }

    // Calculate average session duration from filtered sessions
    const avgDuration = filteredSessions.length > 0
      ? filteredSessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0) / filteredSessions.length
      : 0

    // Calculate unique users (cross-platform: same user on mobile+web = one user)
    const uniqueUsers = new Set(
      filteredSessions.map(s => {
        const deviceInfo = s.device_info || {}
        if (deviceInfo.userId) {
          return `user_${deviceInfo.userId}`
        }
        if (deviceInfo.anonymousId) {
          return `anon_${deviceInfo.anonymousId}`
        }
        const sessionId = s.session_id || s.id
        return `session_${sessionId.split('_')[0] || sessionId}`
      })
    )
    const activeUsers = uniqueUsers.size

    res.json({
      sessions: sessionCount || 0,
      active_users: activeUsers,
      total_events: eventCount || 0,
      avg_session_duration: Math.round(avgDuration / 1000) || 0, // Convert to seconds
      sessions_with_replay: sessionsWithReplay || 0,
      platform_filter: platformFilter,
      period: {
        start_date: start_date || null,
        end_date: end_date || null
      }
    })
  } catch (error: any) {
    console.error('Error fetching analytics overview:', error)
    res.status(500).json({ error: 'Failed to fetch analytics overview' })
  }
})

export default router

