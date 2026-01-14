/**
 * Alert Service
 * 
 * Handles funnel alert checking and notification
 */

import { supabase } from '../config/supabase'
import { analyzeFunnel } from './funnelService'
import { sendAlertNotification } from './notificationService'

export interface FunnelAlert {
  id: string
  funnel_id: string
  project_id: string
  name: string
  alert_type: 'conversion_drop' | 'step_break' | 'threshold_breach'
  condition_type: 'percentage' | 'absolute' | 'trend'
  threshold_value: number
  comparison_operator: '<' | '>' | '<=' | '>=' | '=='
  step_order?: number
  time_window_hours: number
  enabled: boolean
  notification_channels: string[]
  webhook_url?: string
  email_recipients?: string[]
  last_triggered_at?: string
  created_at: string
  updated_at: string
}

export interface AlertCheckResult {
  triggered: boolean
  alert_value: number
  threshold_value: number
  message: string
  metadata?: any
}

/**
 * Check all enabled alerts for a funnel
 */
export async function checkFunnelAlerts(funnelId: string): Promise<AlertCheckResult[]> {
  try {
    // Get all enabled alerts for this funnel
    const { data: alerts, error } = await supabase
      .from('funnel_alerts')
      .select('*')
      .eq('funnel_id', funnelId)
      .eq('enabled', true)

    if (error) {
      console.error('Error fetching alerts:', error)
      return []
    }

    if (!alerts || alerts.length === 0) {
      return []
    }

    const results: AlertCheckResult[] = []

    // Get recent funnel analysis (last 24 hours by default)
    const endDate = new Date().toISOString()
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Analyze funnel for the time window
    const analysisResult = await analyzeFunnel(
      funnelId,
      startDate,
      endDate,
      false, // includeGeography
      'all', // platformFilter
      undefined, // countryFilter
      undefined, // deviceFilter
      undefined, // appVersionFilter
      false // includeTrendOverTime
    )

    if (!analysisResult) {
      return []
    }

    // Check each alert
    for (const alert of alerts) {
      const result = await checkSingleAlert(alert as FunnelAlert, analysisResult)
      if (result.triggered) {
        results.push(result)
        // Record alert in history
        await recordAlertTrigger(alert.id, result)
        // Update last_triggered_at
        await supabase
          .from('funnel_alerts')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', alert.id)
        
        // Send notifications if configured
        if (alert.notification_channels && alert.notification_channels.length > 0) {
          await sendAlertNotification(
            alert.notification_channels,
            {
              alertName: alert.name,
              alertType: alert.alert_type,
              funnelName: analysisResult.funnel_name,
              message: result.message,
              alertValue: result.alert_value,
              thresholdValue: result.threshold_value,
              metadata: result.metadata
            },
            alert.email_recipients || undefined,
            alert.webhook_url || undefined
          )
        }
      }
    }

    return results
  } catch (error: any) {
    console.error('Error checking funnel alerts:', error)
    return []
  }
}

/**
 * Check a single alert condition
 */
async function checkSingleAlert(
  alert: FunnelAlert,
  analysisResult: any
): Promise<AlertCheckResult> {
  let alertValue: number = 0
  let message: string = ''

  if (alert.alert_type === 'conversion_drop') {
    // Check overall conversion rate
    alertValue = analysisResult.overall_conversion || 0
    message = `Funnel "${analysisResult.funnel_name}" conversion rate is ${alertValue.toFixed(2)}%`
  } else if (alert.alert_type === 'step_break') {
    // Check specific step conversion
    if (alert.step_order !== undefined && analysisResult.steps) {
      const step = analysisResult.steps.find((s: any) => s.order === alert.step_order)
      if (step) {
        alertValue = step.conversion_rate || 0
        message = `Step "${step.name}" conversion rate is ${alertValue.toFixed(2)}%`
      } else {
        return {
          triggered: false,
          alert_value: 0,
          threshold_value: alert.threshold_value,
          message: 'Step not found'
        }
      }
    } else {
      return {
        triggered: false,
        alert_value: 0,
        threshold_value: alert.threshold_value,
        message: 'Step order not specified'
      }
    }
  } else if (alert.alert_type === 'threshold_breach') {
    // Check if total users exceeds threshold
    alertValue = analysisResult.total_users || 0
    message = `Funnel "${analysisResult.funnel_name}" has ${alertValue} total users`
  }

  // Evaluate condition
  const triggered = evaluateCondition(
    alertValue,
    alert.threshold_value,
    alert.comparison_operator
  )

  return {
    triggered,
    alert_value: alertValue,
    threshold_value: alert.threshold_value,
    message: triggered ? `🚨 ALERT: ${message}` : message,
    metadata: {
      alert_name: alert.name,
      alert_type: alert.alert_type,
      step_order: alert.step_order
    }
  }
}

/**
 * Evaluate alert condition
 */
function evaluateCondition(
  value: number,
  threshold: number,
  operator: string
): boolean {
  switch (operator) {
    case '<':
      return value < threshold
    case '>':
      return value > threshold
    case '<=':
      return value <= threshold
    case '>=':
      return value >= threshold
    case '==':
      return Math.abs(value - threshold) < 0.01 // Float comparison
    default:
      return false
  }
}

/**
 * Record alert trigger in history
 */
async function recordAlertTrigger(alertId: string, result: AlertCheckResult) {
  try {
    await supabase
      .from('funnel_alert_history')
      .insert({
        alert_id: alertId,
        alert_value: result.alert_value,
        threshold_value: result.threshold_value,
        message: result.message,
        metadata: result.metadata
      })
  } catch (error) {
    console.error('Error recording alert trigger:', error)
  }
}

/**
 * Get alert history for a funnel
 */
export async function getAlertHistory(funnelId: string, limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from('funnel_alert_history')
      .select(`
        *,
        funnel_alerts!inner(funnel_id, name)
      `)
      .eq('funnel_alerts.funnel_id', funnelId)
      .order('triggered_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    return data
  } catch (error: any) {
    console.error('Error fetching alert history:', error)
    return []
  }
}

/**
 * Create a new alert
 */
export async function createAlert(alertData: Omit<FunnelAlert, 'id' | 'created_at' | 'updated_at' | 'last_triggered_at'>) {
  try {
    const { data, error } = await supabase
      .from('funnel_alerts')
      .insert({
        ...alertData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  } catch (error: any) {
    console.error('Error creating alert:', error)
    throw error
  }
}

/**
 * Update an alert
 */
export async function updateAlert(alertId: string, updates: Partial<FunnelAlert>) {
  try {
    const { data, error } = await supabase
      .from('funnel_alerts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  } catch (error: any) {
    console.error('Error updating alert:', error)
    throw error
  }
}

/**
 * Delete an alert
 */
export async function deleteAlert(alertId: string) {
  try {
    const { error } = await supabase
      .from('funnel_alerts')
      .delete()
      .eq('id', alertId)

    if (error) {
      throw error
    }

    return true
  } catch (error: any) {
    console.error('Error deleting alert:', error)
    throw error
  }
}

/**
 * Get all alerts for a funnel
 */
export async function getFunnelAlerts(funnelId: string) {
  try {
    const { data, error } = await supabase
      .from('funnel_alerts')
      .select('*')
      .eq('funnel_id', funnelId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return data || []
  } catch (error: any) {
    console.error('Error fetching funnel alerts:', error)
    return []
  }
}

