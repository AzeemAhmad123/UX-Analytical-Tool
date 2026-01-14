/**
 * Anomaly Detection Service
 * 
 * Detects drop-off anomalies in funnels by comparing current conversion rates
 * to historical baselines and identifying significant deviations.
 */

import { supabase } from '../config/supabase'
import { analyzeFunnel, FunnelAnalysisResult, StepResult } from './funnelService'

export interface FunnelAnomaly {
  id: string
  funnel_id: string
  project_id: string
  step_order: number
  detected_at: string
  baseline_conversion: number
  current_conversion: number
  deviation_percentage: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'resolved' | 'false_positive'
  metadata?: any
  created_at: string
}

export interface AnomalyDetectionConfig {
  baselineDays?: number // Number of days to use for baseline (default: 7)
  deviationThreshold?: number // Minimum deviation % to trigger (default: 20%)
  minUsersForDetection?: number // Minimum users needed for reliable detection (default: 50)
}

/**
 * Detect anomalies for a funnel by comparing current performance to baseline
 */
export async function detectFunnelAnomalies(
  funnelId: string,
  config: AnomalyDetectionConfig = {}
): Promise<FunnelAnomaly[]> {
  const {
    baselineDays = 7,
    deviationThreshold = 20,
    minUsersForDetection = 50
  } = config

  try {
    // Get funnel info
    const { data: funnel, error: funnelError } = await supabase
      .from('funnels')
      .select('id, project_id, name, steps')
      .eq('id', funnelId)
      .single()

    if (funnelError || !funnel) {
      throw new Error('Funnel not found')
    }

    // Calculate date ranges
    const endDate = new Date()
    const currentStartDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000) // Last 24 hours
    const baselineEndDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000) // 1 day ago
    const baselineStartDate = new Date(baselineEndDate.getTime() - baselineDays * 24 * 60 * 60 * 1000)

    // Get current analysis (last 24 hours)
    const currentAnalysis = await analyzeFunnel(
      funnelId,
      currentStartDate.toISOString(),
      endDate.toISOString(),
      false, // includeGeography
      'all', // platformFilter
      undefined, // countryFilter
      undefined, // deviceFilter
      undefined, // appVersionFilter
      false // includeTrendOverTime
    )

    if (!currentAnalysis || currentAnalysis.total_users < minUsersForDetection) {
      // Not enough data for reliable detection
      return []
    }

    // Get baseline analysis (previous N days before current period)
    const baselineAnalysis = await analyzeFunnel(
      funnelId,
      baselineStartDate.toISOString(),
      baselineEndDate.toISOString(),
      false,
      'all',
      undefined,
      undefined,
      undefined,
      false
    )

    if (!baselineAnalysis || baselineAnalysis.steps.length === 0) {
      // No baseline data available
      return []
    }

    // Detect anomalies for each step
    const anomalies: FunnelAnomaly[] = []

    for (let i = 0; i < currentAnalysis.steps.length; i++) {
      const currentStep = currentAnalysis.steps[i]
      const baselineStep = baselineAnalysis.steps.find(s => s.order === currentStep.order)

      if (!baselineStep) {
        continue
      }

      // Calculate deviation
      const baselineConversion = baselineStep.conversion_rate || 0
      const currentConversion = currentStep.conversion_rate || 0
      const deviation = baselineConversion > 0
        ? ((baselineConversion - currentConversion) / baselineConversion) * 100
        : 0

      // Only flag as anomaly if:
      // 1. Deviation exceeds threshold
      // 2. Current conversion is lower than baseline (drop-off)
      // 3. Both have sufficient users
      if (
        deviation >= deviationThreshold &&
        currentConversion < baselineConversion &&
        currentStep.users >= minUsersForDetection &&
        baselineStep.users >= minUsersForDetection
      ) {
        // Determine severity based on deviation
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
        if (deviation >= 50) {
          severity = 'critical'
        } else if (deviation >= 35) {
          severity = 'high'
        } else if (deviation >= 25) {
          severity = 'medium'
        }

        // Check if similar anomaly already exists (within last 6 hours)
        const recentAnomaly = await checkRecentAnomaly(
          funnelId,
          currentStep.order,
          6 * 60 * 60 * 1000 // 6 hours
        )

        if (!recentAnomaly) {
          // Create new anomaly record
          const anomaly = await createAnomaly({
            funnel_id: funnelId,
            project_id: funnel.project_id,
            step_order: currentStep.order,
            baseline_conversion: baselineConversion,
            current_conversion: currentConversion,
            deviation_percentage: deviation,
            severity,
            metadata: {
              current_users: currentStep.users,
              baseline_users: baselineStep.users,
              step_name: currentStep.name,
              funnel_name: funnel.name
            }
          })

          if (anomaly) {
            anomalies.push(anomaly)
          }
        }
      }
    }

    return anomalies
  } catch (error: any) {
    console.error('Error detecting funnel anomalies:', error)
    return []
  }
}

/**
 * Check if a similar anomaly was recently detected
 */
async function checkRecentAnomaly(
  funnelId: string,
  stepOrder: number,
  timeWindowMs: number
): Promise<FunnelAnomaly | null> {
  const cutoffTime = new Date(Date.now() - timeWindowMs)

  const { data, error } = await supabase
    .from('funnel_anomalies')
    .select('*')
    .eq('funnel_id', funnelId)
    .eq('step_order', stepOrder)
    .eq('status', 'open')
    .gte('detected_at', cutoffTime.toISOString())
    .order('detected_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data as FunnelAnomaly
}

/**
 * Create a new anomaly record
 */
async function createAnomaly(data: {
  funnel_id: string
  project_id: string
  step_order: number
  baseline_conversion: number
  current_conversion: number
  deviation_percentage: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  metadata?: any
}): Promise<FunnelAnomaly | null> {
  const { data: anomaly, error } = await supabase
    .from('funnel_anomalies')
    .insert({
      funnel_id: data.funnel_id,
      project_id: data.project_id,
      step_order: data.step_order,
      baseline_conversion: data.baseline_conversion,
      current_conversion: data.current_conversion,
      deviation_percentage: data.deviation_percentage,
      severity: data.severity,
      status: 'open',
      metadata: data.metadata || {}
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating anomaly:', error)
    return null
  }

  return anomaly as FunnelAnomaly
}

/**
 * Get all anomalies for a funnel
 */
export async function getFunnelAnomalies(
  funnelId: string,
  options: {
    status?: 'open' | 'investigating' | 'resolved' | 'false_positive'
    severity?: 'low' | 'medium' | 'high' | 'critical'
    limit?: number
  } = {}
): Promise<FunnelAnomaly[]> {
  const { status, severity, limit = 50 } = options

  let query = supabase
    .from('funnel_anomalies')
    .select('*')
    .eq('funnel_id', funnelId)
    .order('detected_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (severity) {
    query = query.eq('severity', severity)
  }

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching anomalies:', error)
    return []
  }

  return (data || []) as FunnelAnomaly[]
}

/**
 * Update anomaly status
 */
export async function updateAnomalyStatus(
  anomalyId: string,
  status: 'open' | 'investigating' | 'resolved' | 'false_positive'
): Promise<boolean> {
  const { error } = await supabase
    .from('funnel_anomalies')
    .update({ status })
    .eq('id', anomalyId)

  if (error) {
    console.error('Error updating anomaly status:', error)
    return false
  }

  return true
}

/**
 * Get anomaly statistics for a project
 */
export async function getAnomalyStats(projectId: string): Promise<{
  total: number
  open: number
  critical: number
  high: number
  by_severity: Record<string, number>
}> {
  const { data, error } = await supabase
    .from('funnel_anomalies')
    .select('severity, status')
    .eq('project_id', projectId)

  if (error) {
    console.error('Error fetching anomaly stats:', error)
    return {
      total: 0,
      open: 0,
      critical: 0,
      high: 0,
      by_severity: {}
    }
  }

  const stats = {
    total: data?.length || 0,
    open: data?.filter(a => a.status === 'open').length || 0,
    critical: data?.filter(a => a.severity === 'critical').length || 0,
    high: data?.filter(a => a.severity === 'high').length || 0,
    by_severity: {
      critical: data?.filter(a => a.severity === 'critical').length || 0,
      high: data?.filter(a => a.severity === 'high').length || 0,
      medium: data?.filter(a => a.severity === 'medium').length || 0,
      low: data?.filter(a => a.severity === 'low').length || 0
    }
  }

  return stats
}

