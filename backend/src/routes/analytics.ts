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

// Get analytics overview for a project
router.get('/:projectId/overview', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const { start_date, end_date } = req.query

    // Build date filter
    let dateFilter = ''
    if (start_date && end_date) {
      dateFilter = `AND created_at >= '${start_date}' AND created_at <= '${end_date}'`
    }

    // Get session count
    let sessionQuery = supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
    
    if (start_date) {
      sessionQuery = sessionQuery.gte('created_at', start_date as string)
    }
    if (end_date) {
      sessionQuery = sessionQuery.lte('created_at', end_date as string)
    }
    
    const { count: sessionCount } = await sessionQuery

    // Get total events count
    let eventQuery = supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
    
    if (start_date) {
      eventQuery = eventQuery.gte('created_at', start_date as string)
    }
    if (end_date) {
      eventQuery = eventQuery.lte('created_at', end_date as string)
    }
    
    const { count: eventCount } = await eventQuery

    // Get sessions with replay (have snapshots)
    let snapshotQuery = supabase
      .from('session_snapshots')
      .select('session_id')
      .eq('project_id', projectId)
    
    if (start_date) {
      snapshotQuery = snapshotQuery.gte('created_at', start_date as string)
    }
    if (end_date) {
      snapshotQuery = snapshotQuery.lte('created_at', end_date as string)
    }
    
    const { data: snapshotData } = await snapshotQuery
    const uniqueSessions = new Set(snapshotData?.map((s: any) => s.session_id) || [])
    const sessionsWithReplay = uniqueSessions.size

    // Calculate average session duration
    let durationQuery = supabase
      .from('sessions')
      .select('duration')
      .eq('project_id', projectId)
    
    if (start_date) {
      durationQuery = durationQuery.gte('created_at', start_date as string)
    }
    if (end_date) {
      durationQuery = durationQuery.lte('created_at', end_date as string)
    }
    
    const { data: sessions } = await durationQuery

    const avgDuration = sessions && sessions.length > 0
      ? sessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0) / sessions.length
      : 0

    res.json({
      sessions: {
        total: sessionCount || 0,
        with_replay: sessionsWithReplay || 0,
        average_duration: Math.round(avgDuration)
      },
      events: {
        total: eventCount || 0
      },
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

