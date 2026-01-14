/**
 * Funnel Anomalies Routes
 * 
 * API endpoints for detecting and managing funnel drop-off anomalies
 */

import { Router, Request, Response } from 'express'
import { validateProject } from '../middleware/auth'
import { supabase } from '../config/supabase'
import {
  detectFunnelAnomalies,
  getFunnelAnomalies,
  updateAnomalyStatus,
  getAnomalyStats,
  AnomalyDetectionConfig
} from '../services/anomalyDetectionService'

const router = Router()

/**
 * POST /api/funnel-anomalies/:projectId/:funnelId/detect
 * Manually trigger anomaly detection for a funnel
 */
router.post('/:projectId/:funnelId/detect', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId, funnelId } = req.params
    const {
      baseline_days,
      deviation_threshold,
      min_users_for_detection
    } = req.body

    // Verify funnel belongs to project
    const { data: funnel, error: funnelError } = await supabase
      .from('funnels')
      .select('id, project_id')
      .eq('id', funnelId)
      .eq('project_id', projectId)
      .single()

    if (funnelError || !funnel) {
      return res.status(404).json({ error: 'Funnel not found' })
    }

    const config: AnomalyDetectionConfig = {
      baselineDays: baseline_days || 7,
      deviationThreshold: deviation_threshold || 20,
      minUsersForDetection: min_users_for_detection || 50
    }

    const anomalies = await detectFunnelAnomalies(funnelId, config)

    res.json({
      success: true,
      anomalies_detected: anomalies.length,
      anomalies
    })
  } catch (error: any) {
    console.error('Error detecting anomalies:', error)
    res.status(500).json({
      error: 'Failed to detect anomalies',
      message: error.message
    })
  }
})

/**
 * GET /api/funnel-anomalies/:projectId/:funnelId
 * Get all anomalies for a funnel
 */
router.get('/:projectId/:funnelId', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId, funnelId } = req.params
    const { status, severity, limit } = req.query

    // Verify funnel belongs to project
    const { data: funnel, error: funnelError } = await supabase
      .from('funnels')
      .select('id, project_id')
      .eq('id', funnelId)
      .eq('project_id', projectId)
      .single()

    if (funnelError || !funnel) {
      return res.status(404).json({ error: 'Funnel not found' })
    }

    const anomalies = await getFunnelAnomalies(funnelId, {
      status: status as any,
      severity: severity as any,
      limit: limit ? parseInt(limit as string) : undefined
    })

    res.json({
      success: true,
      count: anomalies.length,
      anomalies
    })
  } catch (error: any) {
    console.error('Error fetching anomalies:', error)
    res.status(500).json({
      error: 'Failed to fetch anomalies',
      message: error.message
    })
  }
})

/**
 * PATCH /api/funnel-anomalies/:projectId/:anomalyId/status
 * Update anomaly status
 */
router.patch('/:projectId/:anomalyId/status', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId, anomalyId } = req.params
    const { status } = req.body

    if (!status || !['open', 'investigating', 'resolved', 'false_positive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    // Verify anomaly belongs to project
    const { data: anomaly, error: anomalyError } = await supabase
      .from('funnel_anomalies')
      .select('id, project_id')
      .eq('id', anomalyId)
      .eq('project_id', projectId)
      .single()

    if (anomalyError || !anomaly) {
      return res.status(404).json({ error: 'Anomaly not found' })
    }

    const success = await updateAnomalyStatus(anomalyId, status as any)

    if (!success) {
      return res.status(500).json({ error: 'Failed to update anomaly status' })
    }

    res.json({
      success: true,
      message: 'Anomaly status updated'
    })
  } catch (error: any) {
    console.error('Error updating anomaly status:', error)
    res.status(500).json({
      error: 'Failed to update anomaly status',
      message: error.message
    })
  }
})

/**
 * GET /api/funnel-anomalies/:projectId/stats
 * Get anomaly statistics for a project
 */
router.get('/:projectId/stats', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params

    const stats = await getAnomalyStats(projectId)

    res.json({
      success: true,
      stats
    })
  } catch (error: any) {
    console.error('Error fetching anomaly stats:', error)
    res.status(500).json({
      error: 'Failed to fetch anomaly stats',
      message: error.message
    })
  }
})

export default router

