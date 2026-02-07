import { Router, Request, Response } from 'express'
import { validateDomainForSDK, validateSDKKey } from '../middleware/auth'
import { supabase } from '../config/supabase'

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

/**
 * POST /api/sdk/validate
 * Validate an SDK key (for debugging)
 * 
 * Request body:
 * {
 *   sdk_key: string
 * }
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const sdkKey = req.body?.sdk_key

    if (!sdkKey) {
      return res.status(400).json({
        error: 'SDK key is required',
        message: 'Please provide sdk_key in request body'
      })
    }

    // Test database connection first
    const { data: testData, error: testError } = await supabase
      .from('projects')
      .select('id')
      .limit(1)

    if (testError) {
      return res.status(500).json({
        error: 'Database connection error',
        message: testError.message,
        code: testError.code,
        details: 'Cannot connect to database. Please check your Supabase configuration.'
      })
    }

    // Validate SDK key
    const validation = await validateSDKKey(sdkKey)

    if (!validation.valid) {
      return res.status(401).json({
        error: 'Invalid SDK key',
        message: validation.error || 'The provided SDK key is not valid',
        sdkKeyFormat: {
          provided: sdkKey.substring(0, 10) + '...',
          length: sdkKey.length,
          startsWithUx: sdkKey.startsWith('ux_'),
          expectedFormat: 'Should start with "ux_" and be at least 30 characters'
        }
      })
    }

    res.json({
      success: true,
      valid: true,
      projectId: validation.projectId,
      projectName: validation.projectName,
      allowedDomains: validation.allowedDomains,
      message: 'SDK key is valid'
    })
  } catch (error: any) {
    console.error('Error in /api/sdk/validate:', error)
    res.status(500).json({
      error: 'Validation error',
      message: error.message || 'Unknown error occurred'
    })
  }
})

export default router

