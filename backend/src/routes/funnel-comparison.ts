import { Router, Request, Response } from 'express'
import { validateProject } from '../middleware/auth'
import {
  compareFunnels,
  compareFunnelVariants,
  compareFunnelByVariants
} from '../services/funnelComparisonService'

const router = Router()

/**
 * POST /api/funnels/:projectId/compare
 * Compare multiple funnels with different filters
 */
router.post('/:projectId/compare', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const { funnel_ids, start_date, end_date, filters } = req.body

    if (!funnel_ids || !Array.isArray(funnel_ids) || funnel_ids.length === 0) {
      return res.status(400).json({ error: 'funnel_ids array is required' })
    }

    const endDate = end_date || new Date().toISOString()
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const comparisons = await compareFunnels(funnel_ids, startDate, endDate, filters || [])
    res.json({ success: true, comparisons })
  } catch (error: any) {
    console.error('Error comparing funnels:', error)
    res.status(500).json({ error: 'Failed to compare funnels', message: error.message })
  }
})

/**
 * POST /api/funnels/:projectId/:funnelId/compare-variants
 * Compare same funnel with different filters (e.g., Android vs iOS)
 */
router.post('/:projectId/:funnelId/compare-variants', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId, funnelId } = req.params
    const { start_date, end_date, variant_filters } = req.body

    if (!variant_filters || !Array.isArray(variant_filters) || variant_filters.length === 0) {
      return res.status(400).json({ error: 'variant_filters array is required' })
    }

    const endDate = end_date || new Date().toISOString()
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const comparisons = await compareFunnelVariants(String(funnelId), startDate, endDate, variant_filters)
    res.json({ success: true, comparisons })
  } catch (error: any) {
    console.error('Error comparing funnel variants:', error)
    res.status(500).json({ error: 'Failed to compare funnel variants', message: error.message })
  }
})

/**
 * POST /api/funnels/:projectId/:funnelId/compare-experiment
 * Compare funnel by experiment variants
 */
router.post('/:projectId/:funnelId/compare-experiment', validateProject, async (req: Request, res: Response) => {
  try {
    const { projectId, funnelId } = req.params
    const { experiment_id, start_date, end_date } = req.body

    if (!experiment_id) {
      return res.status(400).json({ error: 'experiment_id is required' })
    }

    const endDate = end_date || new Date().toISOString()
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const comparisons = await compareFunnelByVariants(String(funnelId), experiment_id, startDate, endDate)
    res.json({ success: true, comparisons })
  } catch (error: any) {
    console.error('Error comparing funnel by experiment:', error)
    res.status(500).json({ error: 'Failed to compare funnel by experiment', message: error.message })
  }
})

export default router

