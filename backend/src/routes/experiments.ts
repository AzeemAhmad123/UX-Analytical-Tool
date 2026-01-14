import { Router, Request, Response } from 'express'
import { validateProject } from '../middleware/auth'
import {
  createExperiment,
  getExperimentById,
  getProjectExperiments,
  assignUserToVariant,
  getUserVariant
} from '../services/experimentService'

const router = Router()

/**
 * GET /api/projects/:projectId/experiments
 * Get all experiments for a project
 */
router.get('/:projectId/experiments', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const experiments = await getProjectExperiments(String(projectId))
    res.json({ success: true, experiments })
  } catch (error: any) {
    console.error('Error fetching experiments:', error)
    res.status(500).json({ error: 'Failed to fetch experiments', message: error.message })
  }
})

/**
 * POST /api/projects/:projectId/experiments
 * Create a new experiment
 */
router.post('/:projectId/experiments', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const experiment = await createExperiment(String(projectId), req.body)
    res.json({ success: true, experiment })
  } catch (error: any) {
    console.error('Error creating experiment:', error)
    res.status(500).json({ error: 'Failed to create experiment', message: error.message })
  }
})

/**
 * GET /api/projects/:projectId/experiments/:experimentId
 * Get experiment by ID
 */
router.get('/:projectId/experiments/:experimentId', validateProject, async (req: Request, res: Response) => {
  try {
    const { experimentId } = req.params
    const experiment = await getExperimentById(String(experimentId))
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' })
    }
    res.json({ success: true, experiment })
  } catch (error: any) {
    console.error('Error fetching experiment:', error)
    res.status(500).json({ error: 'Failed to fetch experiment', message: error.message })
  }
})

/**
 * POST /api/projects/:projectId/experiments/:experimentId/assign
 * Assign user to variant (called by SDK)
 */
router.post('/:projectId/experiments/:experimentId/assign', async (req: Request, res: Response) => {
  try {
    const { projectId, experimentId } = req.params
    const { user_id } = req.body

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    const variant = await assignUserToVariant(String(projectId), String(experimentId), user_id)
    res.json({ success: true, variant })
  } catch (error: any) {
    console.error('Error assigning user to variant:', error)
    res.status(500).json({ error: 'Failed to assign variant', message: error.message })
  }
})

/**
 * GET /api/projects/:projectId/experiments/:experimentId/variant
 * Get user's variant for an experiment
 */
router.get('/:projectId/experiments/:experimentId/variant', async (req: Request, res: Response) => {
  try {
    const { projectId, experimentId } = req.params
    const { user_id } = req.query

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    const variant = await getUserVariant(String(projectId), String(experimentId), user_id as string)
    res.json({ success: true, variant })
  } catch (error: any) {
    console.error('Error getting user variant:', error)
    res.status(500).json({ error: 'Failed to get variant', message: error.message })
  }
})

export default router

