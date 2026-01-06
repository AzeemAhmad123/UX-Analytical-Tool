import { Router, Request, Response } from 'express'
import { supabase } from '../config/supabase'
import { generateSDKKey } from '../utils/sdkKeyGenerator'

const router = Router()

/**
 * POST /api/projects
 * Create a new project
 * 
 * Request body:
 * {
 *   name: string (required),
 *   description?: string,
 *   platform?: string (default: 'web'),
 *   user_id?: string (optional, for future auth)
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, platform = 'web', user_id } = req.body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Project name is required'
      })
    }

    // Generate unique SDK key
    let sdkKey = generateSDKKey()
    let attempts = 0
    const maxAttempts = 10

    // Ensure SDK key is unique (retry if collision)
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('projects')
        .select('id')
        .eq('sdk_key', sdkKey)
        .single()

      if (!existing) {
        break // Key is unique
      }

      sdkKey = generateSDKKey()
      attempts++
    }

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique SDK key after multiple attempts')
    }

    // Create project
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        platform: platform,
        sdk_key: sdkKey,
        user_id: user_id || null
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`)
    }

    res.status(201).json({
      success: true,
      project
    })
  } catch (error: any) {
    console.error('Error in POST /api/projects:', error)
    res.status(500).json({
      error: 'Failed to create project',
      message: error.message
    })
  }
})

/**
 * GET /api/projects
 * Get all projects for the authenticated user
 * 
 * Note: This endpoint currently returns all projects.
 * In the future, it should filter by authenticated user_id.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // TODO: Get user_id from authentication token
    // For now, return all projects (will be restricted in production)
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, description, sdk_key, platform, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to retrieve projects: ${error.message}`)
    }

    res.json({
      success: true,
      projects: projects || [],
      count: projects?.length || 0
    })
  } catch (error: any) {
    console.error('Error in /api/projects:', error)
    res.status(500).json({
      error: 'Failed to retrieve projects',
      message: error.message
    })
  }
})

/**
 * GET /api/projects/:id
 * Get a specific project by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id

    const { data: project, error } = await supabase
      .from('projects')
      .select('id, name, description, sdk_key, platform, created_at, updated_at')
      .eq('id', projectId)
      .single()

    if (error || !project) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project ${projectId} not found`
      })
    }

    res.json({
      success: true,
      project
    })
  } catch (error: any) {
    console.error('Error in /api/projects/:id:', error)
    res.status(500).json({
      error: 'Failed to retrieve project',
      message: error.message
    })
  }
})

export default router

