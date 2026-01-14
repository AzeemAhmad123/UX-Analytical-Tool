import { Router, Request, Response } from 'express'
import { validateDomainForSDK } from '../middleware/auth'

const router = Router()

/**
 * POST /api/sdk/validate-domain
 * Validates if a domain is allowed for an SDK key
 * Used by SDK before initialization
 * 
 * Request body:
 * {
 *   sdk_key: string,
 *   domain: string,
 *   origin: string (optional)
 * }
 */
router.post('/validate-domain', async (req: Request, res: Response) => {
  try {
    const { sdk_key, domain, origin } = req.body

    if (!sdk_key) {
      return res.status(400).json({
        error: 'SDK key is required',
        message: 'Please provide sdk_key in request body'
      })
    }

    if (!domain) {
      return res.status(400).json({
        error: 'Domain is required',
        message: 'Please provide domain in request body'
      })
    }

    const validation = await validateDomainForSDK(sdk_key, domain)

    if (validation.valid) {
      res.json({
        valid: true,
        domain: domain,
        allowed_domains: validation.allowedDomains || []
      })
    } else {
      res.status(403).json({
        valid: false,
        error: validation.error || 'Domain not authorized',
        allowed_domains: validation.allowedDomains || []
      })
    }
  } catch (error: any) {
    console.error('Error validating domain:', error)
    res.status(500).json({
      error: 'Failed to validate domain',
      message: error.message
    })
  }
})

export default router

