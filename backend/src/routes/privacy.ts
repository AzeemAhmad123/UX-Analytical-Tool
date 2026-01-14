import { Router, Request, Response } from 'express'
import { validateProject } from '../middleware/auth'
import {
  getPrivacySettings,
  updatePrivacySettings,
  recordConsent,
  getConsentHistory,
  hasConsent
} from '../services/privacyService'

const router = Router()

/**
 * GET /api/projects/:projectId/privacy
 * Get privacy settings for a project
 */
router.get('/:projectId/privacy', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const settings = await getPrivacySettings(projectId)
    res.json({ success: true, settings })
  } catch (error: any) {
    console.error('Error fetching privacy settings:', error)
    res.status(500).json({ error: 'Failed to fetch privacy settings', message: error.message })
  }
})

/**
 * PUT /api/projects/:projectId/privacy
 * Update privacy settings for a project
 */
router.put('/:projectId/privacy', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const settings = await updatePrivacySettings(projectId, req.body)
    res.json({ success: true, settings })
  } catch (error: any) {
    console.error('Error updating privacy settings:', error)
    res.status(500).json({ error: 'Failed to update privacy settings', message: error.message })
  }
})

/**
 * POST /api/projects/:projectId/privacy/consent
 * Record GDPR consent
 */
router.post('/:projectId/privacy/consent', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const consent = await recordConsent(projectId, {
      ...req.body,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    })
    res.json({ success: true, consent })
  } catch (error: any) {
    console.error('Error recording consent:', error)
    res.status(500).json({ error: 'Failed to record consent', message: error.message })
  }
})

/**
 * GET /api/projects/:projectId/privacy/consent
 * Check if user has consent
 */
router.get('/:projectId/privacy/consent', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const { session_id, consent_type } = req.query
    
    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' })
    }

    const consented = await hasConsent(
      projectId,
      session_id as string,
      (consent_type as any) || 'analytics'
    )
    
    res.json({ success: true, consented })
  } catch (error: any) {
    console.error('Error checking consent:', error)
    res.status(500).json({ error: 'Failed to check consent', message: error.message })
  }
})

/**
 * GET /api/projects/:projectId/privacy/consent/history
 * Get consent history
 */
router.get('/:projectId/privacy/consent/history', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const limit = parseInt(req.query.limit as string) || 100
    const history = await getConsentHistory(String(projectId), limit)
    res.json({ success: true, history })
  } catch (error: any) {
    console.error('Error fetching consent history:', error)
    res.status(500).json({ error: 'Failed to fetch consent history', message: error.message })
  }
})

export default router

