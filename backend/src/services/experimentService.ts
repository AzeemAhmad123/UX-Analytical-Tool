/**
 * Experiment Service
 * 
 * Handles A/B experiment creation, variant assignment, and analysis
 */

import { supabase } from '../config/supabase'

export interface Experiment {
  id: string
  project_id: string
  name: string
  description?: string
  status: 'draft' | 'running' | 'paused' | 'completed'
  traffic_split: Record<string, number> // e.g., {"A": 50, "B": 50}
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
}

export interface ExperimentVariant {
  id: string
  experiment_id: string
  variant_name: string
  description?: string
  traffic_percentage: number
  created_at: string
}

/**
 * Create a new experiment
 */
export async function createExperiment(
  projectId: string,
  experimentData: Omit<Experiment, 'id' | 'project_id' | 'created_at' | 'updated_at'>
): Promise<Experiment> {
  try {
    const { data, error } = await supabase
      .from('experiments')
      .insert({
        project_id: projectId,
        ...experimentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Create variants
    if (experimentData.traffic_split) {
      for (const [variantName, percentage] of Object.entries(experimentData.traffic_split)) {
        await supabase
          .from('experiment_variants')
          .insert({
            experiment_id: data.id,
            variant_name: variantName,
            traffic_percentage: percentage,
            created_at: new Date().toISOString()
          })
      }
    }

    return data
  } catch (error: any) {
    console.error('Error creating experiment:', error)
    throw error
  }
}

/**
 * Get experiment by ID
 */
export async function getExperimentById(experimentId: string): Promise<Experiment | null> {
  try {
    const { data, error } = await supabase
      .from('experiments')
      .select('*')
      .eq('id', experimentId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data || null
  } catch (error: any) {
    console.error('Error getting experiment:', error)
    return null
  }
}

/**
 * Assign user to experiment variant
 */
export async function assignUserToVariant(
  projectId: string,
  experimentId: string,
  userId: string
): Promise<string> {
  try {
    // Check if user already assigned
    const { data: existing } = await supabase
      .from('user_variant_assignments')
      .select('variant_name')
      .eq('project_id', projectId)
      .eq('experiment_id', experimentId)
      .eq('user_id', userId)
      .single()

    if (existing) {
      return existing.variant_name
    }

    // Get experiment and variants
    const experiment = await getExperimentById(experimentId)
    if (!experiment || experiment.status !== 'running') {
      throw new Error('Experiment not found or not running')
    }

    const { data: variants } = await supabase
      .from('experiment_variants')
      .select('variant_name, traffic_percentage')
      .eq('experiment_id', experimentId)
      .order('variant_name')

    if (!variants || variants.length === 0) {
      throw new Error('No variants found for experiment')
    }

    // Calculate assignment based on traffic split
    const random = Math.random() * 100
    let cumulative = 0
    let assignedVariant = variants[0].variant_name

    for (const variant of variants) {
      cumulative += variant.traffic_percentage
      if (random <= cumulative) {
        assignedVariant = variant.variant_name
        break
      }
    }

    // Store assignment
    await supabase
      .from('user_variant_assignments')
      .insert({
        project_id: projectId,
        experiment_id: experimentId,
        user_id: userId,
        variant_name: assignedVariant,
        assigned_at: new Date().toISOString()
      })

    return assignedVariant
  } catch (error: any) {
    console.error('Error assigning user to variant:', error)
    throw error
  }
}

/**
 * Get user's variant for an experiment
 */
export async function getUserVariant(
  projectId: string,
  experimentId: string,
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_variant_assignments')
      .select('variant_name')
      .eq('project_id', projectId)
      .eq('experiment_id', experimentId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data?.variant_name || null
  } catch (error: any) {
    console.error('Error getting user variant:', error)
    return null
  }
}

/**
 * Get all experiments for a project
 */
export async function getProjectExperiments(projectId: string): Promise<Experiment[]> {
  try {
    const { data, error } = await supabase
      .from('experiments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return data || []
  } catch (error: any) {
    console.error('Error getting project experiments:', error)
    return []
  }
}

