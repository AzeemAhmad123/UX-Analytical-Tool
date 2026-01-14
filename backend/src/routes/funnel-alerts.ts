import { Router, Request, Response } from 'express'
import { validateProject } from '../middleware/auth'
import {
  createAlert,
  updateAlert,
  deleteAlert,
  getFunnelAlerts,
  getAlertHistory,
  checkFunnelAlerts
} from '../services/alertService'

const router = Router()

/**
 * GET /api/funnels/:projectId/:funnelId/alerts
 * Get all alerts for a funnel
 */
router.get('/:projectId/:funnelId/alerts', validateProject, async (req: Request, res: Response) => {
  try {
    const { funnelId } = req.params
    const alerts = await getFunnelAlerts(String(funnelId))
    res.json({ success: true, alerts })
  } catch (error: any) {
    console.error('Error fetching alerts:', error)
    res.status(500).json({ error: 'Failed to fetch alerts', message: error.message })
  }
})

/**
 * POST /api/funnels/:projectId/:funnelId/alerts
 * Create a new alert
 */
router.post('/:projectId/:funnelId/alerts', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId, funnelId } = req.params
    const alertData = {
      ...req.body,
      funnel_id: String(funnelId),
      project_id: String(projectId)
    }
    const alert = await createAlert(alertData)
    res.json({ success: true, alert })
  } catch (error: any) {
    console.error('Error creating alert:', error)
    res.status(500).json({ error: 'Failed to create alert', message: error.message })
  }
})

/**
 * PUT /api/funnels/:projectId/:funnelId/alerts/:alertId
 * Update an alert
 */
router.put('/:projectId/:funnelId/alerts/:alertId', validateProject, async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params
    const alert = await updateAlert(String(alertId), req.body)
    res.json({ success: true, alert })
  } catch (error: any) {
    console.error('Error updating alert:', error)
    res.status(500).json({ error: 'Failed to update alert', message: error.message })
  }
})

/**
 * DELETE /api/funnels/:projectId/:funnelId/alerts/:alertId
 * Delete an alert
 */
router.delete('/:projectId/:funnelId/alerts/:alertId', validateProject, async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params
    await deleteAlert(String(alertId))
    res.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting alert:', error)
    res.status(500).json({ error: 'Failed to delete alert', message: error.message })
  }
})

/**
 * GET /api/funnels/:projectId/:funnelId/alerts/history
 * Get alert history
 */
router.get('/:projectId/:funnelId/alerts/history', validateProject, async (req: Request, res: Response) => {
  try {
    const { funnelId } = req.params
    const limit = parseInt(req.query.limit as string) || 50
    const history = await getAlertHistory(String(funnelId), limit)
    res.json({ success: true, history })
  } catch (error: any) {
    console.error('Error fetching alert history:', error)
    res.status(500).json({ error: 'Failed to fetch alert history', message: error.message })
  }
})

/**
 * POST /api/funnels/:projectId/:funnelId/alerts/check
 * Manually trigger alert check
 */
router.post('/:projectId/:funnelId/alerts/check', validateProject, async (req: Request, res: Response) => {
  try {
    const { funnelId } = req.params
    const results = await checkFunnelAlerts(String(funnelId))
    res.json({ success: true, results })
  } catch (error: any) {
    console.error('Error checking alerts:', error)
    res.status(500).json({ error: 'Failed to check alerts', message: error.message })
  }
})

export default router

