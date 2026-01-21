import { Router, Request, Response } from 'express'
import { supabase } from '../config/supabase'
import { generateSDKKey } from '../utils/sdkKeyGenerator'
import { authenticateUser } from '../middleware/auth'

const router = Router()

/**
 * POST /api/projects
 * Create a new project
 * 
 * Request body:
 * {
 *   name: string (required),
 *   description?: string,
 *   platform?: string (default: 'all', options: 'all', 'web', 'mobile')
 * }
 * 
 * Requires: Bearer token in Authorization header
 */
router.post('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId // Get user_id from authenticated token
    const { name, description, platform = 'all' } = req.body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Project name is required'
      })
    }

    // Validate platform value
    const validPlatforms = ['all', 'web', 'mobile']
    const platformValue = platform || 'all'
    if (!validPlatforms.includes(platformValue)) {
      return res.status(400).json({
        error: 'Validation error',
        message: `Platform must be one of: ${validPlatforms.join(', ')}`
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

    // Create project (default to active)
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        platform: platformValue,
        sdk_key: sdkKey,
        user_id: userId, // Use authenticated user's ID
        is_active: true // New projects are active by default
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error creating project:', error)
      throw new Error(`Database error: ${error.message || error.code || 'Unknown database error'}`)
    }

    if (!project) {
      throw new Error('Project was not created - no data returned from database')
    }

    res.status(201).json({
      success: true,
      project
    })
  } catch (error: any) {
    console.error('Error in POST /api/projects:', error)
    const errorMessage = error.message || 'Unknown error occurred'
    res.status(500).json({
      error: 'Failed to create project',
      message: errorMessage
    })
  }
})

/**
 * GET /api/projects
 * Get all projects for the authenticated user
 * 
 * Requires: Bearer token in Authorization header
 * Returns: Only projects belonging to the authenticated user
 */
router.get('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId // Get user_id from authenticated token
    
    // Filter projects by user_id
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, description, sdk_key, platform, is_active, created_at, updated_at')
      .eq('user_id', userId) // Only return projects for this user
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
 * PATCH /api/projects/:id/toggle-active
 * Toggle project active/inactive status
 * 
 * This allows users to turn projects on/off without deleting them.
 * Inactive projects won't appear in data views but are preserved.
 * 
 * Requires: Bearer token in Authorization header
 * NOTE: This route MUST come before router.get('/:id') to avoid route conflicts
 */
router.patch('/:id/toggle-active', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId // Get user_id from authenticated token
    const projectId = req.params.id

    if (!projectId) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'Project ID is required'
      })
    }

    // Get current project status and verify ownership
    const { data: project, error: findError } = await supabase
      .from('projects')
      .select('id, name, is_active, user_id')
      .eq('id', projectId)
      .single()

    if (findError || !project) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project ${projectId} not found`
      })
    }

    // Verify the project belongs to the authenticated user
    if (project.user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to modify this project'
      })
    }

    // Toggle is_active status
    const newStatus = !project.is_active

    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({ is_active: newStatus, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update project: ${updateError.message}`)
    }

    res.json({
      success: true,
      project: updatedProject,
      message: `Project "${project.name}" is now ${newStatus ? 'active' : 'inactive'}`
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/projects/:id/toggle-active:', error)
    res.status(500).json({
      error: 'Failed to toggle project status',
      message: error.message
    })
  }
})

/**
 * GET /api/projects/:id
 * Get a specific project by ID
 * 
 * Requires: Bearer token in Authorization header
 * Returns: Project only if it belongs to the authenticated user
 */
router.get('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId // Get user_id from authenticated token
    const projectId = req.params.id

    const { data: project, error } = await supabase
      .from('projects')
      .select('id, name, description, sdk_key, platform, is_active, created_at, updated_at, user_id')
      .eq('id', projectId)
      .single()

    if (error || !project) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project ${projectId} not found`
      })
    }

    // Verify the project belongs to the authenticated user
    if (project.user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this project'
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

/**
 * DELETE /api/projects/:id
 * Delete a project and all its associated data
 * 
 * Note: This will cascade delete all sessions, snapshots, events, and funnels
 * associated with this project due to foreign key constraints.
 * 
 * Requires: Bearer token in Authorization header
 */
router.delete('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId // Get user_id from authenticated token
    const projectId = req.params.id

    if (!projectId) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'Project ID is required'
      })
    }

    // First, verify the project exists and belongs to the user
    const { data: project, error: findError } = await supabase
      .from('projects')
      .select('id, name, user_id')
      .eq('id', projectId)
      .single()

    if (findError || !project) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project ${projectId} not found`
      })
    }

    // Verify the project belongs to the authenticated user
    if (project.user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this project'
      })
    }

    // Delete the project (cascade will delete all related data)
    // Due to foreign key constraints with ON DELETE CASCADE:
    // - All sessions will be deleted
    // - All session_snapshots will be deleted
    // - All events will be deleted
    // - All funnels will be deleted (if funnel table has project_id foreign key)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (deleteError) {
      throw new Error(`Failed to delete project: ${deleteError.message}`)
    }

    res.json({
      success: true,
      message: `Project "${project.name}" deleted successfully`
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/projects/:id:', error)
    res.status(500).json({
      error: 'Failed to delete project',
      message: error.message
    })
  }
})

export default router

