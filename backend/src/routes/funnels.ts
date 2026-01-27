import { Router, Request, Response } from 'express'
import { supabase } from '../config/supabase'
import { analyzeFunnel, getFunnelById, FunnelDefinition, FunnelStep } from '../services/funnelService'
import { validateProject } from '../middleware/auth'

const router = Router()

/**
 * POST /api/funnels/:projectId
 * Create a new funnel
 */
router.post('/:projectId', validateProject, async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId
    const { name, description, steps, is_form_funnel, form_url, time_window_hours, track_first_time_users, calculation_mode } = req.body

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'name is required'
      })
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({
        error: 'Invalid steps',
        message: 'steps must be a non-empty array'
      })
    }

    // Validate steps structure
    for (const step of steps) {
      if (!step.order || !step.name || !step.condition) {
        return res.status(400).json({
          error: 'Invalid step',
          message: 'Each step must have order, name, and condition'
        })
      }
    }

    // Insert funnel
    const { data: funnel, error } = await supabase
      .from('funnels')
      .insert({
        project_id: projectId,
        name,
        description: description || null,
        steps: steps as FunnelStep[],
        is_form_funnel: is_form_funnel || false,
        form_url: form_url || null,
        time_window_hours: time_window_hours || null,
        track_first_time_users: track_first_time_users || false,
        calculation_mode: calculation_mode || 'sessions'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating funnel:', error)
      return res.status(500).json({
        error: 'Failed to create funnel',
        message: error.message
      })
    }

    if (!funnel) {
      return res.status(500).json({
        error: 'Failed to create funnel',
        message: 'Funnel was not created - no data returned from database'
      })
    }

    res.status(201).json({
      success: true,
      funnel
    })
  } catch (error: any) {
    console.error('Error in POST /api/funnels/:projectId:', error)
    res.status(500).json({
      error: 'Failed to create funnel',
      message: error.message
    })
  }
})

/**
 * GET /api/funnels/:projectId
 * List all funnels for a project
 */
router.get('/:projectId', validateProject, async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId

    const { data: funnels, error } = await supabase
      .from('funnels')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching funnels:', error)
      return res.status(500).json({
        error: 'Failed to fetch funnels',
        message: error.message
      })
    }

    res.json({
      success: true,
      funnels: funnels || []
    })
  } catch (error: any) {
    console.error('Error in GET /api/funnels/:projectId:', error)
    res.status(500).json({
      error: 'Failed to fetch funnels',
      message: error.message
    })
  }
})

/**
 * GET /api/funnels/:projectId/:funnelId
 * Get funnel details
 */
router.get('/:projectId/:funnelId', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId, funnelId } = req.params
    // Ensure funnelId is a string (req.params can be string | string[])
    const funnel = await getFunnelById(String(funnelId))

    if (!funnel) {
      return res.status(404).json({
        error: 'Funnel not found'
      })
    }

    if (funnel.project_id !== projectId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Funnel does not belong to this project'
      })
    }

    res.json({
      success: true,
      funnel
    })
  } catch (error: any) {
    console.error('Error in GET /api/funnels/:projectId/:funnelId:', error)
    res.status(500).json({
      error: 'Failed to fetch funnel',
      message: error.message
    })
  }
})

/**
 * PUT /api/funnels/:projectId/:funnelId
 * Update funnel
 */
router.put('/:projectId/:funnelId', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId, funnelId } = req.params
    const { 
      name, 
      description, 
      steps, 
      is_form_funnel, 
      form_url,
      time_window_hours,
      track_first_time_users,
      calculation_mode
    } = req.body

    // Verify funnel exists and belongs to project
    const existingFunnel = await getFunnelById(String(funnelId))
    if (!existingFunnel) {
      return res.status(404).json({
        error: 'Funnel not found'
      })
    }

    if (existingFunnel.project_id !== projectId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Funnel does not belong to this project'
      })
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (steps !== undefined) {
      if (!Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({
          error: 'Invalid steps',
          message: 'steps must be a non-empty array'
        })
      }
      updateData.steps = steps
    }
    if (is_form_funnel !== undefined) updateData.is_form_funnel = is_form_funnel
    if (form_url !== undefined) updateData.form_url = form_url
    if (time_window_hours !== undefined) updateData.time_window_hours = time_window_hours
    if (track_first_time_users !== undefined) updateData.track_first_time_users = track_first_time_users
    if (calculation_mode !== undefined) updateData.calculation_mode = calculation_mode || 'sessions'

    const { data: updatedFunnel, error } = await supabase
      .from('funnels')
      .update(updateData)
      .eq('id', funnelId)
      .eq('project_id', projectId)
      .select()
      .single()

    if (error) {
      console.error('Error updating funnel:', error)
      return res.status(500).json({
        error: 'Failed to update funnel',
        message: error.message
      })
    }

    if (!updatedFunnel) {
      return res.status(404).json({
        error: 'Funnel not found',
        message: 'Funnel was not updated or does not exist'
      })
    }

    res.json({
      success: true,
      funnel: updatedFunnel
    })
  } catch (error: any) {
    console.error('Error in PUT /api/funnels/:projectId/:funnelId:', error)
    res.status(500).json({
      error: 'Failed to update funnel',
      message: error.message
    })
  }
})

/**
 * DELETE /api/funnels/:projectId/:funnelId
 * Delete funnel
 */
router.delete('/:projectId/:funnelId', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId, funnelId } = req.params

    // Verify funnel exists and belongs to project
    const existingFunnel = await getFunnelById(String(funnelId))
    if (!existingFunnel) {
      return res.status(404).json({
        error: 'Funnel not found'
      })
    }

    if (existingFunnel.project_id !== projectId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Funnel does not belong to this project'
      })
    }

    const { error } = await supabase
      .from('funnels')
      .delete()
      .eq('id', funnelId)
      .eq('project_id', projectId)

    if (error) {
      console.error('Error deleting funnel:', error)
      return res.status(500).json({
        error: 'Failed to delete funnel',
        message: error.message
      })
    }

    res.json({
      success: true,
      message: 'Funnel deleted successfully'
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/funnels/:projectId/:funnelId:', error)
    res.status(500).json({
      error: 'Failed to delete funnel',
      message: error.message
    })
  }
})

/**
 * POST /api/funnels/:projectId/:funnelId/analyze
 * Analyze funnel
 */
router.post('/:projectId/:funnelId/analyze', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId, funnelId } = req.params
    const funnelIdStr = String(funnelId)
    const { 
      start_date, 
      end_date, 
      include_geography, 
      force_recalculate, 
      platform_filter,
      country_filter,
      device_filter,
      app_version_filter,
      include_trend_over_time,
      cohort_filter
    } = req.body

    // Verify funnel exists and belongs to project
    const existingFunnel = await getFunnelById(funnelIdStr)
    if (!existingFunnel) {
      return res.status(404).json({
        error: 'Funnel not found'
      })
    }

    if (existingFunnel.project_id !== projectId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Funnel does not belong to this project'
      })
    }

    // Set default date range (last 30 days)
    const endDate = end_date || new Date().toISOString()
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Check cache if not forcing recalculation
    if (!force_recalculate) {
      const { data: cachedResult } = await supabase
        .from('funnel_results')
        .select('results, geographic_breakdown, field_breakdown')
        .eq('funnel_id', funnelIdStr)
        .eq('date_range_start', startDate)
        .eq('date_range_end', endDate)
        .single()

      if (cachedResult) {
        return res.json({
          success: true,
          ...cachedResult.results,
          geographic_breakdown: cachedResult.geographic_breakdown,
          field_breakdown: cachedResult.field_breakdown,
          cached: true
        })
      }
    }

    // Perform analysis
    const analysisResult = await analyzeFunnel(
      funnelIdStr,
      startDate,
      endDate,
      include_geography || false,
      platform_filter || 'all',
      country_filter,
      device_filter,
      app_version_filter,
      include_trend_over_time || false
    )

    if (!analysisResult) {
      return res.status(500).json({
        error: 'Failed to analyze funnel'
      })
    }

    // Cache the result
    await supabase
      .from('funnel_results')
      .upsert({
        funnel_id: funnelIdStr,
        project_id: projectId,
        date_range_start: startDate,
        date_range_end: endDate,
        results: analysisResult,
        geographic_breakdown: analysisResult.geographic_breakdown || null,
        field_breakdown: analysisResult.field_breakdown || null,
        calculated_at: new Date().toISOString()
      })

    res.json({
      success: true,
      ...analysisResult,
      cached: false
    })
  } catch (error: any) {
    console.error('Error in POST /api/funnels/:projectId/:funnelId/analyze:', error)
    res.status(500).json({
      error: 'Failed to analyze funnel',
      message: error.message
    })
  }
})

/**
 * POST /api/funnels/:projectId/form-field-events
 * Ingest form field events from SDK
 */
router.post('/:projectId/form-field-events', validateProject, async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId
    const { session_id, form_id, field_name, field_type, action, value } = req.body

    // Validate required fields
    if (!session_id || !form_id || !field_name || !action) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'session_id, form_id, field_name, and action are required'
      })
    }

    // Get session to verify it exists and belongs to project
    const { data: session } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', session_id)
      .eq('project_id', projectId)
      .single()

    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      })
    }

    // Insert form field event
    const { data: event, error } = await supabase
      .from('form_field_events')
      .insert({
        session_id: session_id,
        project_id: projectId,
        form_id,
        field_name,
        field_type: field_type || null,
        action,
        value: value || null,
        is_completed: action === 'blur' || action === 'change' || action === 'submit',
        timestamp: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting form field event:', error)
      
      // Check if table doesn't exist
      if (error.message && error.message.includes('form_field_events') && 
          (error.message.includes('does not exist') || error.message.includes('schema cache'))) {
        return res.status(500).json({
          error: 'Form field events table not found',
          message: 'The form_field_events table does not exist. Please run the migration: create_form_field_events_table.sql',
          migration_required: true
        })
      }
      
      return res.status(500).json({
        error: 'Failed to insert form field event',
        message: error.message
      })
    }

    res.json({
      success: true,
      event
    })
  } catch (error: any) {
    console.error('Error in POST /api/funnels/:projectId/form-field-events:', error)
    res.status(500).json({
      error: 'Failed to ingest form field event',
      message: error.message
    })
  }
})

export default router

