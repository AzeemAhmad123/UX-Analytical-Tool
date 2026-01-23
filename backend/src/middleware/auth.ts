import { Request, Response, NextFunction } from 'express'
import { supabase } from '../config/supabase'

/**
 * Validates SDK key and returns project information
 */
export async function validateSDKKey(sdkKey: string): Promise<{
  valid: boolean
  projectId?: string
  projectName?: string
  allowedDomains?: string[]
  error?: string
}> {
  if (!sdkKey || typeof sdkKey !== 'string') {
    return { valid: false, error: 'SDK key is required' }
  }

  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, name, sdk_key, allowed_domains')
      .eq('sdk_key', sdkKey)
      .single()

    if (error) {
      console.error('Supabase error validating SDK key:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        sdkKey: sdkKey.substring(0, 20) + '...'
      })
      
      // Check if it's a connection error
      if (error.message?.includes('520') || error.message?.includes('Web server') || error.code === 'PGRST116') {
        return { valid: false, error: 'Database connection error. Please try again later.' }
      }
      
      return { valid: false, error: 'Invalid SDK key' }
    }
    
    if (!project) {
      console.warn('SDK key not found in database:', sdkKey.substring(0, 20) + '...')
      return { valid: false, error: 'Invalid SDK key' }
    }

    // Parse allowed_domains (stored as JSON array or comma-separated string)
    let allowedDomains: string[] = []
    if (project.allowed_domains) {
      if (typeof project.allowed_domains === 'string') {
        try {
          allowedDomains = JSON.parse(project.allowed_domains)
        } catch {
          // If not JSON, treat as comma-separated
          allowedDomains = project.allowed_domains.split(',').map((d: string) => d.trim()).filter(Boolean)
        }
      } else if (Array.isArray(project.allowed_domains)) {
        allowedDomains = project.allowed_domains
      }
    }

    return {
      valid: true,
      projectId: project.id,
      projectName: project.name,
      allowedDomains
    }
  } catch (err: any) {
    console.error('Error validating SDK key:', {
      error: err.message,
      stack: err.stack,
      name: err.name,
      sdkKey: sdkKey ? sdkKey.substring(0, 20) + '...' : 'MISSING'
    })
    
    // Check for specific error types
    if (err.message?.includes('520') || err.message?.includes('Web server')) {
      return { valid: false, error: 'Database connection error. Please try again later.' }
    }
    
    if (err.message?.includes('timeout') || err.name === 'TimeoutError') {
      return { valid: false, error: 'Database timeout. Please try again.' }
    }
    
    return { valid: false, error: 'Database error: ' + (err.message || 'Unknown error') }
  }
}

/**
 * Validates if a domain is allowed for an SDK key
 */
export async function validateDomainForSDK(sdkKey: string, domain: string): Promise<{
  valid: boolean
  allowedDomains?: string[]
  error?: string
}> {
  const validation = await validateSDKKey(sdkKey)
  
  if (!validation.valid) {
    return { valid: false, error: validation.error }
  }

  const allowedDomains = validation.allowedDomains || []

  // If no domains are set, allow first domain and store it (auto-approve first use)
  if (allowedDomains.length === 0) {
    // Auto-approve and store the first domain
    try {
      await supabase
        .from('projects')
        .update({ allowed_domains: JSON.stringify([domain]) })
        .eq('sdk_key', sdkKey)
      
      return { valid: true, allowedDomains: [domain] }
    } catch (err) {
      console.error('Error storing first domain:', err)
      // Still allow if storage fails (fail open for first use)
      return { valid: true, allowedDomains: [domain] }
    }
  }

  // Check if domain is in allowed list
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, '')
  const isAllowed = allowedDomains.some(allowed => {
    const normalizedAllowed = allowed.toLowerCase().replace(/^www\./, '')
    return normalizedDomain === normalizedAllowed || normalizedDomain.endsWith('.' + normalizedAllowed)
  })

  if (!isAllowed) {
    return {
      valid: false,
      allowedDomains,
      error: `Domain "${domain}" is not authorized for this SDK key. Allowed domains: ${allowedDomains.join(', ')}`
    }
  }

  return { valid: true, allowedDomains }
}

/**
 * Express middleware to authenticate requests using SDK key
 * Expects SDK key in request body as `sdk_key`
 * Also validates domain if provided in request headers or body
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

  // Validate domain if provided
  const origin = req.get('origin') || req.body?.origin
  const domain = req.body?.domain || (origin ? new URL(origin).hostname : null)
  
  if (domain) {
    const domainValidation = await validateDomainForSDK(sdkKey, domain)
    if (!domainValidation.valid) {
      res.status(403).json({
        error: 'Domain not authorized',
        message: domainValidation.error || 'This SDK key cannot be used on this domain',
        allowed_domains: domainValidation.allowedDomains
      })
      return
    }
  }

  // Attach project info to request for use in routes
  ;(req as any).projectId = validation.projectId
  ;(req as any).projectName = validation.projectName
  ;(req as any).sdkKey = sdkKey

  next()
}

/**
 * Express middleware to authenticate users using Supabase JWT token
 * Extracts user_id from Bearer token and attaches it to request
 */
export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid Bearer token in Authorization header'
      })
      return
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is not valid or has expired'
      })
      return
    }

    // Attach user info to request
    ;(req as any).userId = user.id
    ;(req as any).user = user

    next()
  } catch (error: any) {
    console.error('Error authenticating user:', error)
    res.status(500).json({ 
      error: 'Authentication failed',
      message: error.message
    })
  }
}

/**
 * Express middleware to validate that a project exists
 * Used for routes that require Bearer token authentication (dashboard)
 * Validates project exists but doesn't require SDK key
 */
export async function validateProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params
    
    if (!projectId) {
      res.status(400).json({
        error: 'Project ID is required'
      })
      return
    }

    const { data: project, error } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (error || !project) {
      res.status(404).json({ 
        error: 'Project not found',
        message: 'The specified project does not exist'
      })
      return
    }

    // Attach project ID to request
    ;(req as any).projectId = projectId

    next()
  } catch (error: any) {
    console.error('Error validating project:', error)
    res.status(500).json({ 
      error: 'Failed to validate project',
      message: error.message
    })
  }
}

