/**
 * Advanced Analytics Routes
 * 
 * API endpoints for rage clicks, heatmaps, performance monitoring, and user segmentation
 */

import { Router, Request, Response } from 'express'
import { validateProject } from '../middleware/auth'
import {
  detectRageClicks,
  detectDeadTaps,
  getSessionRageClicks,
  getSessionDeadTaps,
  getRageClicksSummary
} from '../services/rageClickDetectionService'
import {
  generateHeatmap,
  getHeatmap,
  getProjectHeatmaps
} from '../services/heatmapService'
import {
  recordPerformanceMetric,
  getPerformanceSummary,
  getPerformanceTrends
} from '../services/performanceMonitoringService'
import {
  createUserSegment,
  getProjectSegments,
  updateSegment,
  deleteSegment,
  refreshSegmentCount
} from '../services/userSegmentationService'

const router = Router()

// ==================== Rage Clicks & Dead Taps ====================

/**
 * POST /api/advanced-analytics/:projectId/rage-clicks/detect
 * Detect rage clicks from session events
 */
router.post('/:projectId/rage-clicks/detect', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const { session_id, click_events } = req.body

    if (!session_id || !click_events || !Array.isArray(click_events)) {
      return res.status(400).json({ error: 'session_id and click_events array are required' })
    }

    const rageClicks = await detectRageClicks(String(projectId), session_id, click_events)

    res.json({
      success: true,
      rage_clicks_detected: rageClicks.length,
      rage_clicks: rageClicks
    })
  } catch (error: any) {
    console.error('Error detecting rage clicks:', error)
    res.status(500).json({ error: 'Failed to detect rage clicks', message: error.message })
  }
})

/**
 * POST /api/advanced-analytics/:projectId/dead-taps/detect
 * Detect dead taps from session events
 */
router.post('/:projectId/dead-taps/detect', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const { session_id, tap_events } = req.body

    if (!session_id || !tap_events || !Array.isArray(tap_events)) {
      return res.status(400).json({ error: 'session_id and tap_events array are required' })
    }

    const deadTaps = await detectDeadTaps(String(projectId), session_id, tap_events)

    res.json({
      success: true,
      dead_taps_detected: deadTaps.length,
      dead_taps: deadTaps
    })
  } catch (error: any) {
    console.error('Error detecting dead taps:', error)
    res.status(500).json({ error: 'Failed to detect dead taps', message: error.message })
  }
})

/**
 * GET /api/advanced-analytics/:projectId/rage-clicks/session/:sessionId
 * Get rage clicks for a session
 */
router.get('/:projectId/rage-clicks/session/:sessionId', validateProject, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const rageClicks = await getSessionRageClicks(String(sessionId))

    res.json({ success: true, rage_clicks: rageClicks })
  } catch (error: any) {
    console.error('Error fetching rage clicks:', error)
    res.status(500).json({ error: 'Failed to fetch rage clicks', message: error.message })
  }
})

/**
 * GET /api/advanced-analytics/:projectId/rage-clicks/summary
 * Get rage clicks summary
 */
router.get('/:projectId/rage-clicks/summary', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const { start_date, end_date } = req.query

    const summary = await getRageClicksSummary(
      String(projectId),
      start_date as string,
      end_date as string
    )

    res.json({ success: true, summary })
  } catch (error: any) {
    console.error('Error fetching rage clicks summary:', error)
    res.status(500).json({ error: 'Failed to fetch summary', message: error.message })
  }
})

// ==================== Heatmaps ====================

/**
 * POST /api/advanced-analytics/:projectId/heatmaps/generate
 * Generate a heatmap
 */
router.post('/:projectId/heatmaps/generate', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const {
      page_url,
      heatmap_type,
      start_date,
      end_date,
      viewport_width,
      viewport_height
    } = req.body

    if (!page_url || !heatmap_type || !start_date || !end_date) {
      return res.status(400).json({
        error: 'page_url, heatmap_type, start_date, and end_date are required'
      })
    }

    const heatmap = await generateHeatmap(
      String(projectId),
      page_url,
      heatmap_type,
      start_date,
      end_date,
      viewport_width,
      viewport_height
    )

    if (!heatmap) {
      return res.status(404).json({ error: 'No data available for heatmap generation' })
    }

    res.json({ success: true, heatmap })
  } catch (error: any) {
    console.error('Error generating heatmap:', error)
    res.status(500).json({ error: 'Failed to generate heatmap', message: error.message })
  }
})

/**
 * GET /api/advanced-analytics/:projectId/heatmaps
 * Get heatmaps for a project
 */
router.get('/:projectId/heatmaps', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const { page_url } = req.query

    const heatmaps = await getProjectHeatmaps(String(projectId), page_url as string)

    res.json({ success: true, heatmaps })
  } catch (error: any) {
    console.error('Error fetching heatmaps:', error)
    res.status(500).json({ error: 'Failed to fetch heatmaps', message: error.message })
  }
})

// ==================== Performance Monitoring ====================

/**
 * POST /api/advanced-analytics/:projectId/performance/record
 * Record a performance metric
 */
router.post('/:projectId/performance/record', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const {
      session_id,
      page_url,
      metric_type,
      value,
      device_type,
      connection_type,
      metadata
    } = req.body

    if (!session_id || !page_url || !metric_type || value === undefined) {
      return res.status(400).json({
        error: 'session_id, page_url, metric_type, and value are required'
      })
    }

    const metric = await recordPerformanceMetric(session_id, String(projectId), {
      page_url,
      metric_type,
      value,
      device_type,
      connection_type,
      metadata
    })

    if (!metric) {
      return res.status(500).json({ error: 'Failed to record metric' })
    }

    res.json({ success: true, metric })
  } catch (error: any) {
    console.error('Error recording performance metric:', error)
    res.status(500).json({ error: 'Failed to record metric', message: error.message })
  }
})

/**
 * GET /api/advanced-analytics/:projectId/performance/summary
 * Get performance summary
 */
router.get('/:projectId/performance/summary', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const { start_date, end_date, page_url } = req.query

    const summary = await getPerformanceSummary(
      String(projectId),
      start_date as string,
      end_date as string,
      page_url as string
    )

    res.json({ success: true, summary })
  } catch (error: any) {
    console.error('Error fetching performance summary:', error)
    res.status(500).json({ error: 'Failed to fetch summary', message: error.message })
  }
})

/**
 * GET /api/advanced-analytics/:projectId/performance/trends
 * Get performance trends
 */
router.get('/:projectId/performance/trends', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const { metric_type, start_date, end_date, granularity } = req.query

    if (!metric_type || !start_date || !end_date) {
      return res.status(400).json({
        error: 'metric_type, start_date, and end_date are required'
      })
    }

    const trends = await getPerformanceTrends(
      String(projectId),
      metric_type as any,
      start_date as string,
      end_date as string,
      (granularity as 'daily' | 'weekly') || 'daily'
    )

    res.json({ success: true, trends })
  } catch (error: any) {
    console.error('Error fetching performance trends:', error)
    res.status(500).json({ error: 'Failed to fetch trends', message: error.message })
  }
})

// ==================== User Segmentation ====================

/**
 * GET /api/advanced-analytics/:projectId/segments
 * Get all segments for a project
 */
router.get('/:projectId/segments', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const segments = await getProjectSegments(String(projectId))

    res.json({ success: true, segments })
  } catch (error: any) {
    console.error('Error fetching segments:', error)
    res.status(500).json({ error: 'Failed to fetch segments', message: error.message })
  }
})

/**
 * POST /api/advanced-analytics/:projectId/segments
 * Create a new segment
 */
router.post('/:projectId/segments', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const { name, description, conditions } = req.body

    if (!name || !conditions || !Array.isArray(conditions)) {
      return res.status(400).json({
        error: 'name and conditions array are required'
      })
    }

    const userId = (req as any).user?.id

    const segment = await createUserSegment(String(projectId), {
      name,
      description,
      conditions,
      created_by: userId
    })

    res.json({ success: true, segment })
  } catch (error: any) {
    console.error('Error creating segment:', error)
    res.status(500).json({ error: 'Failed to create segment', message: error.message })
  }
})

/**
 * PUT /api/advanced-analytics/:projectId/segments/:segmentId
 * Update a segment
 */
router.put('/:projectId/segments/:segmentId', validateProject, async (req: Request, res: Response) => {
  try {
    const { segmentId } = req.params
    const segment = await updateSegment(String(segmentId), req.body)

    res.json({ success: true, segment })
  } catch (error: any) {
    console.error('Error updating segment:', error)
    res.status(500).json({ error: 'Failed to update segment', message: error.message })
  }
})

/**
 * DELETE /api/advanced-analytics/:projectId/segments/:segmentId
 * Delete a segment
 */
router.delete('/:projectId/segments/:segmentId', validateProject, async (req: Request, res: Response) => {
  try {
    const { segmentId } = req.params
    await deleteSegment(String(segmentId))

    res.json({ success: true, message: 'Segment deleted' })
  } catch (error: any) {
    console.error('Error deleting segment:', error)
    res.status(500).json({ error: 'Failed to delete segment', message: error.message })
  }
})

/**
 * POST /api/advanced-analytics/:projectId/segments/:segmentId/refresh
 * Refresh segment user count
 */
router.post('/:projectId/segments/:segmentId/refresh', validateProject, async (req: Request, res: Response) => {
  try {
    const { segmentId } = req.params
    const userCount = await refreshSegmentCount(String(segmentId))

    res.json({ success: true, user_count: userCount })
  } catch (error: any) {
    console.error('Error refreshing segment:', error)
    res.status(500).json({ error: 'Failed to refresh segment', message: error.message })
  }
})

export default router

