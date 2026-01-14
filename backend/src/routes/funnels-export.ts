/**
 * Export & Reports Routes for Funnels
 */

import { Router, Request, Response } from 'express'
import { validateProject } from '../middleware/auth'
import { getFunnelById, analyzeFunnel } from '../services/funnelService'
import { supabase } from '../config/supabase'
import {
  createShareLink,
  getShareLinkByToken,
  verifyShareLinkPassword,
  recordShareLinkView,
  getFunnelShareLinks,
  revokeShareLink,
  deleteShareLink
} from '../services/shareLinkService'

const router = Router()

/**
 * GET /api/funnels/:projectId/:funnelId/export/csv
 * Export funnel analysis as CSV
 */
router.get('/:projectId/:funnelId/export/csv', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId, funnelId } = req.params
    const { start_date, end_date, platform_filter } = req.query

    // Verify funnel exists
    const funnel = await getFunnelById(String(funnelId))
    if (!funnel || funnel.project_id !== projectId) {
      return res.status(404).json({ error: 'Funnel not found' })
    }

    // Set default date range
    const endDate = (end_date as string) || new Date().toISOString()
    const startDate = (start_date as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Perform analysis
    // Convert 'mobile' to 'all' since analyzeFunnel doesn't support 'mobile' directly
    // (mobile filtering would need to be done by checking both android and ios)
    let platformFilter: 'all' | 'web' | 'android' | 'ios' = 'all'
    if (platform_filter === 'web') {
      platformFilter = 'web'
    } else if (platform_filter === 'android') {
      platformFilter = 'android'
    } else if (platform_filter === 'ios') {
      platformFilter = 'ios'
    }
    // 'mobile' and 'all' both default to 'all' - mobile filtering would require separate logic
    
    const analysisResult = await analyzeFunnel(
      String(funnelId),
      startDate,
      endDate,
      false,
      platformFilter
    )

    if (!analysisResult) {
      return res.status(500).json({ error: 'Failed to analyze funnel' })
    }

    // Generate CSV
    let csv = `Funnel: ${funnel.name}\n`
    csv += `Date Range: ${startDate} to ${endDate}\n`
    csv += `Total Users: ${analysisResult.total_users}\n`
    csv += `Overall Conversion: ${analysisResult.overall_conversion.toFixed(2)}%\n\n`
    csv += `Step,Name,Users,Sessions,Conversion Rate,Drop-off Rate\n`

    for (const step of analysisResult.steps) {
      csv += `${step.order},"${step.name}",${step.users},${step.sessions},${step.conversion_rate.toFixed(2)}%,${step.drop_off_rate.toFixed(2)}%\n`
    }

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="funnel-${funnelId}-${Date.now()}.csv"`)
    res.send(csv)
  } catch (error: any) {
    console.error('Error exporting funnel CSV:', error)
    res.status(500).json({
      error: 'Failed to export funnel',
      message: error.message
    })
  }
})

/**
 * POST /api/funnels/:projectId/:funnelId/share
 * Generate shareable link for funnel analysis
 */
router.post('/:projectId/:funnelId/share', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId, funnelId } = req.params
    const {
      expires_in_days,
      max_views,
      password,
      start_date,
      end_date,
      platform_filter,
      country_filter,
      device_filter,
      app_version_filter
    } = req.body

    // Verify funnel exists
    const funnel = await getFunnelById(String(funnelId))
    if (!funnel || funnel.project_id !== projectId) {
      return res.status(404).json({ error: 'Funnel not found' })
    }

    // Get user ID from auth (if available)
    // Note: validateProject middleware doesn't set req.user
    // If you need user authentication, add proper auth middleware
    // For now, created_by is optional
    const userId = (req as any).user?.id || undefined

    // Convert platform_filter for shareLinkService (it expects 'mobile' not 'android'/'ios')
    let sharePlatformFilter: 'all' | 'web' | 'mobile' | undefined = undefined
    if (platform_filter === 'web') {
      sharePlatformFilter = 'web'
    } else if (platform_filter === 'android' || platform_filter === 'ios') {
      sharePlatformFilter = 'mobile' // Share link service uses 'mobile' for both
    } else {
      sharePlatformFilter = 'all'
    }

    const shareLink = await createShareLink(String(funnelId), String(projectId), {
      expires_in_days,
      max_views,
      password,
      share_params: {
        start_date,
        end_date,
        platform_filter: sharePlatformFilter,
        country_filter,
        device_filter,
        app_version_filter
      },
      created_by: userId
    })

    res.json({
      success: true,
      share_link: shareLink
    })
  } catch (error: any) {
    console.error('Error creating share link:', error)
    res.status(500).json({
      error: 'Failed to create share link',
      message: error.message
    })
  }
})

/**
 * GET /api/funnels/:projectId/:funnelId/share-links
 * Get all share links for a funnel
 */
router.get('/:projectId/:funnelId/share-links', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId, funnelId } = req.params

    // Verify funnel exists
    const funnel = await getFunnelById(String(funnelId))
    if (!funnel || funnel.project_id !== projectId) {
      return res.status(404).json({ error: 'Funnel not found' })
    }

    const shareLinks = await getFunnelShareLinks(String(funnelId))

    res.json({
      success: true,
      share_links: shareLinks
    })
  } catch (error: any) {
    console.error('Error fetching share links:', error)
    res.status(500).json({
      error: 'Failed to fetch share links',
      message: error.message
    })
  }
})

/**
 * DELETE /api/funnels/:projectId/:funnelId/share-links/:shareLinkId
 * Delete a share link
 */
router.delete('/:projectId/:funnelId/share-links/:shareLinkId', validateProject, async (req: Request, res: Response) => {
  try {
    const { shareLinkId } = req.params

    await deleteShareLink(String(shareLinkId))

    res.json({
      success: true,
      message: 'Share link deleted'
    })
  } catch (error: any) {
    console.error('Error deleting share link:', error)
    res.status(500).json({
      error: 'Failed to delete share link',
      message: error.message
    })
  }
})

/**
 * PATCH /api/funnels/:projectId/:funnelId/share-links/:shareLinkId/revoke
 * Revoke a share link
 */
router.patch('/:projectId/:funnelId/share-links/:shareLinkId/revoke', validateProject, async (req: Request, res: Response) => {
  try {
    const { shareLinkId } = req.params

    await revokeShareLink(String(shareLinkId))

    res.json({
      success: true,
      message: 'Share link revoked'
    })
  } catch (error: any) {
    console.error('Error revoking share link:', error)
    res.status(500).json({
      error: 'Failed to revoke share link',
      message: error.message
    })
  }
})


export default router

