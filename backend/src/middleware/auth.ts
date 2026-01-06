import { Request, Response, NextFunction } from 'express'
import { supabase } from '../config/supabase'

/**
 * Validates SDK key and returns project information
 */
export async function validateSDKKey(sdkKey: string): Promise<{
  valid: boolean
  projectId?: string
  projectName?: string
  error?: string
}> {
  if (!sdkKey || typeof sdkKey !== 'string') {
    return { valid: false, error: 'SDK key is required' }
  }

  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, name, sdk_key')
      .eq('sdk_key', sdkKey)
      .single()

    if (error || !project) {
      return { valid: false, error: 'Invalid SDK key' }
    }

    return {
      valid: true,
      projectId: project.id,
      projectName: project.name
    }
  } catch (err: any) {
    console.error('Error validating SDK key:', err)
    return { valid: false, error: 'Database error' }
  }
}

/**
 * Express middleware to authenticate requests using SDK key
 * Expects SDK key in request body as `sdk_key`
 */
export async function authenticateSDK(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sdkKey = req.body?.sdk_key

  if (!sdkKey) {
    res.status(401).json({
      error: 'SDK key is required',
      message: 'Please provide sdk_key in request body'
    })
    return
  }

  const validation = await validateSDKKey(sdkKey)

  if (!validation.valid) {
    res.status(401).json({
      error: 'Invalid SDK key',
      message: validation.error || 'The provided SDK key is not valid'
    })
    return
  }

  // Attach project info to request for use in routes
  ;(req as any).projectId = validation.projectId
  ;(req as any).projectName = validation.projectName
  ;(req as any).sdkKey = sdkKey

  next()
}

