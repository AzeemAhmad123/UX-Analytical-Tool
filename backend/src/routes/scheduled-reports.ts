/**
 * Scheduled Reports Routes
 * 
 * API endpoints for managing scheduled email reports
 */

import { Router, Request, Response } from 'express'
import { validateProject } from '../middleware/auth'
import {
  createScheduledReport,
  getFunnelScheduledReports,
  updateScheduledReport,
  deleteScheduledReport,
  getDueReports,
  sendScheduledReport,
  type ScheduledReport
} from '../services/scheduledReportsService'
import { getFunnelById } from '../services/funnelService'

const router = Router()

/**
 * GET /api/funnels/:projectId/:funnelId/scheduled-reports
 * Get all scheduled reports for a funnel
 */
router.get('/:projectId/:funnelId/scheduled-reports', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId, funnelId } = req.params

    // Verify funnel exists
    const funnel = await getFunnelById(funnelId)
    if (!funnel || funnel.project_id !== projectId) {
      return res.status(404).json({ error: 'Funnel not found' })
    }

    const reports = await getFunnelScheduledReports(funnelId)

    res.json({
      success: true,
      reports
    })
  } catch (error: any) {
    console.error('Error fetching scheduled reports:', error)
    res.status(500).json({
      error: 'Failed to fetch scheduled reports',
      message: error.message
    })
  }
})

/**
 * POST /api/funnels/:projectId/:funnelId/scheduled-reports
 * Create a new scheduled report
 */
router.post('/:projectId/:funnelId/scheduled-reports', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId, funnelId } = req.params
    const {
      name,
      schedule_type,
      schedule_config,
      recipients,
      report_format,
      include_charts,
      report_params
    } = req.body

    // Verify funnel exists
    const funnel = await getFunnelById(funnelId)
    if (!funnel || funnel.project_id !== projectId) {
      return res.status(404).json({ error: 'Funnel not found' })
    }

    // Validate required fields
    if (!name || !schedule_type || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'name, schedule_type, and recipients are required'
      })
    }

    const userId = (req as any).user?.id

    const report = await createScheduledReport(funnelId, projectId, {
      name: name as string,
      schedule_type: schedule_type as 'daily' | 'weekly' | 'monthly',
      schedule_config: schedule_config || {},
      recipients: recipients as string[],
      report_format: (report_format || 'html') as 'html' | 'pdf' | 'csv',
      include_charts: include_charts !== undefined ? include_charts : true,
      report_params: report_params || {},
      enabled: true,
      created_by: userId || undefined,
      funnel_id: funnelId,
      project_id: projectId
    } as any)

    res.json({
      success: true,
      report
    })
  } catch (error: any) {
    console.error('Error creating scheduled report:', error)
    res.status(500).json({
      error: 'Failed to create scheduled report',
      message: error.message
    })
  }
})

/**
 * PUT /api/funnels/:projectId/:funnelId/scheduled-reports/:reportId
 * Update a scheduled report
 */
router.put('/:projectId/:funnelId/scheduled-reports/:reportId', validateProject, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params

    const report = await updateScheduledReport(reportId, req.body)

    res.json({
      success: true,
      report
    })
  } catch (error: any) {
    console.error('Error updating scheduled report:', error)
    res.status(500).json({
      error: 'Failed to update scheduled report',
      message: error.message
    })
  }
})

/**
 * DELETE /api/funnels/:projectId/:funnelId/scheduled-reports/:reportId
 * Delete a scheduled report
 */
router.delete('/:projectId/:funnelId/scheduled-reports/:reportId', validateProject, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params

    await deleteScheduledReport(reportId)

    res.json({
      success: true,
      message: 'Scheduled report deleted'
    })
  } catch (error: any) {
    console.error('Error deleting scheduled report:', error)
    res.status(500).json({
      error: 'Failed to delete scheduled report',
      message: error.message
    })
  }
})

/**
 * POST /api/scheduled-reports/process
 * Process due reports (called by cron job or scheduler)
 * Note: This endpoint should be protected with an API key or internal auth
 */
router.post('/process', async (req: Request, res: Response) => {
  try {
    // Optional: Add API key authentication for cron jobs
    const apiKey = req.headers['x-api-key']
    if (process.env.CRON_API_KEY && apiKey !== process.env.CRON_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const dueReports = await getDueReports()
    const results = []

    for (const report of dueReports) {
      const sent = await sendScheduledReport(report)
      results.push({
        report_id: report.id,
        report_name: report.name,
        sent
      })
    }

    res.json({
      success: true,
      processed: dueReports.length,
      results
    })
  } catch (error: any) {
    console.error('Error processing scheduled reports:', error)
    res.status(500).json({
      error: 'Failed to process scheduled reports',
      message: error.message
    })
  }
})

export default router

