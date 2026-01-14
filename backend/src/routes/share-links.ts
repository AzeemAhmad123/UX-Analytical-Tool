/**
 * Share Links Routes (Public)
 * 
 * Public endpoints for accessing shared funnel reports
 */

import { Router, Request, Response } from 'express'
import {
  getShareLinkByToken,
  verifyShareLinkPassword,
  recordShareLinkView
} from '../services/shareLinkService'
import { getFunnelById, analyzeFunnel } from '../services/funnelService'

const router = Router()

/**
 * GET /api/funnel-share/:token
 * Public endpoint to get share link data (no auth required)
 */
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params
    const { password } = req.query

    const shareLink = await getShareLinkByToken(token)

    if (!shareLink) {
      return res.status(404).json({ error: 'Share link not found or expired' })
    }

    // Check password if required
    if (shareLink.password_hash) {
      if (!password) {
        return res.status(401).json({
          error: 'Password required',
          requires_password: true
        })
      }

      const isValid = await verifyShareLinkPassword(token, password as string)
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid password' })
      }
    }

    // Record view
    await recordShareLinkView(shareLink.id, {
      ip_address: req.ip,
      user_agent: req.get('user-agent') || undefined,
      referer: req.get('referer') || undefined
    })

    // Get funnel data
    const funnel = await getFunnelById(shareLink.funnel_id)
    if (!funnel) {
      return res.status(404).json({ error: 'Funnel not found' })
    }

    // Perform analysis with share link parameters
    const endDate = shareLink.share_params.end_date || new Date().toISOString()
    const startDate = shareLink.share_params.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Convert platform_filter for analyzeFunnel (it expects 'all' | 'web' | 'android' | 'ios')
    let platformFilter: 'all' | 'web' | 'android' | 'ios' = 'all'
    const sharePlatformFilter = shareLink.share_params.platform_filter
    if (sharePlatformFilter === 'web') {
      platformFilter = 'web'
    } else if (sharePlatformFilter === 'android') {
      platformFilter = 'android'
    } else if (sharePlatformFilter === 'ios') {
      platformFilter = 'ios'
    }
    // 'mobile' and 'all' both default to 'all'

    const analysisResult = await analyzeFunnel(
      shareLink.funnel_id,
      startDate,
      endDate,
      false,
      platformFilter,
      shareLink.share_params.country_filter,
      shareLink.share_params.device_filter,
      shareLink.share_params.app_version_filter,
      false
    )

    if (!analysisResult) {
      return res.status(500).json({
        error: 'Failed to analyze funnel',
        message: 'Could not generate analysis for this funnel'
      })
    }

    res.json({
      success: true,
      share_link: {
        id: shareLink.id,
        funnel_name: funnel.name,
        expires_at: shareLink.expires_at,
        view_count: shareLink.view_count + 1, // +1 because we just recorded a view
        max_views: shareLink.max_views
      },
      analysis: analysisResult
    })
  } catch (error: any) {
    console.error('Error fetching share link data:', error)
    res.status(500).json({
      error: 'Failed to fetch share link data',
      message: error.message
    })
  }
})

export default router

