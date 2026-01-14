/**
 * Performance Monitoring Service
 * 
 * Tracks and analyzes Web Vitals and performance metrics
 */

import { supabase } from '../config/supabase'

export interface PerformanceMetric {
  id: string
  session_id: string
  project_id: string
  page_url: string
  metric_type: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  device_type?: string
  connection_type?: string
  timestamp: string
  metadata?: any
}

/**
 * Web Vitals thresholds (in milliseconds or score)
 */
const VITALS_THRESHOLDS: Record<string, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
  FID: { good: 100, poor: 300 }, // First Input Delay (ms)
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift (score)
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
  INP: { good: 200, poor: 500 } // Interaction to Next Paint (ms)
}

/**
 * Rate a metric value
 */
function rateMetric(metricType: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = VITALS_THRESHOLDS[metricType]
  if (!thresholds) return 'needs-improvement'

  if (value <= thresholds.good) {
    return 'good'
  } else if (value <= thresholds.poor) {
    return 'needs-improvement'
  } else {
    return 'poor'
  }
}

/**
 * Record a performance metric
 */
export async function recordPerformanceMetric(
  sessionId: string,
  projectId: string,
  metricData: {
    page_url: string
    metric_type: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP'
    value: number
    device_type?: string
    connection_type?: string
    metadata?: any
  }
): Promise<PerformanceMetric | null> {
  try {
    const rating = rateMetric(metricData.metric_type, metricData.value)

    const { data, error } = await supabase
      .from('performance_metrics')
      .insert({
        session_id: sessionId,
        project_id: projectId,
        page_url: metricData.page_url,
        metric_type: metricData.metric_type,
        value: metricData.value,
        rating,
        device_type: metricData.device_type,
        connection_type: metricData.connection_type,
        metadata: metricData.metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error recording performance metric:', error)
      return null
    }

    return data as PerformanceMetric
  } catch (error: any) {
    console.error('Error recording performance metric:', error)
    return null
  }
}

/**
 * Get performance summary for a project
 */
export async function getPerformanceSummary(
  projectId: string,
  startDate?: string,
  endDate?: string,
  pageUrl?: string
): Promise<{
  metrics: Array<{
    metric_type: string
    average: number
    p50: number
    p75: number
    p95: number
    good_count: number
    needs_improvement_count: number
    poor_count: number
  }>
  by_page: Array<{
    page_url: string
    metrics: Record<string, number>
  }>
}> {
  let query = supabase
    .from('performance_metrics')
    .select('*')
    .eq('project_id', projectId)

  if (startDate) {
    query = query.gte('timestamp', startDate)
  }
  if (endDate) {
    query = query.lte('timestamp', endDate)
  }
  if (pageUrl) {
    query = query.eq('page_url', pageUrl)
  }

  const { data, error } = await query

  // Log query details for debugging
  console.log('[Performance] Query details:', {
    projectId,
    startDate,
    endDate,
    pageUrl,
    dataCount: data?.length || 0,
    error: error?.message
  })

  if (error) {
    console.error('[Performance] Query error:', error)
    return { metrics: [], by_page: [] }
  }

  if (!data || data.length === 0) {
    console.log('[Performance] No performance metrics found for:', {
      projectId,
      startDate,
      endDate,
      pageUrl: pageUrl || 'all pages'
    })
    return { metrics: [], by_page: [] }
  }

  console.log('[Performance] Found', data.length, 'performance metrics')

  // Group by metric type
  const metricGroups = new Map<string, PerformanceMetric[]>()
  const pageGroups = new Map<string, PerformanceMetric[]>()

  for (const metric of data as PerformanceMetric[]) {
    // Group by metric type
    if (!metricGroups.has(metric.metric_type)) {
      metricGroups.set(metric.metric_type, [])
    }
    metricGroups.get(metric.metric_type)!.push(metric)

    // Group by page
    if (!pageGroups.has(metric.page_url)) {
      pageGroups.set(metric.page_url, [])
    }
    pageGroups.get(metric.page_url)!.push(metric)
  }

  // Calculate statistics for each metric type
  const metrics = Array.from(metricGroups.entries()).map(([type, values]) => {
    const sorted = values.map(v => v.value).sort((a, b) => a - b)
    const sum = sorted.reduce((a, b) => a + b, 0)
    const average = sum / sorted.length
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0
    const p75 = sorted[Math.floor(sorted.length * 0.75)] || 0
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0

    const goodCount = values.filter(v => v.rating === 'good').length
    const needsImprovementCount = values.filter(v => v.rating === 'needs-improvement').length
    const poorCount = values.filter(v => v.rating === 'poor').length

    return {
      metric_type: type,
      average: Math.round(average * 100) / 100,
      p50: Math.round(p50 * 100) / 100,
      p75: Math.round(p75 * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
      good_count: goodCount,
      needs_improvement_count: needsImprovementCount,
      poor_count: poorCount
    }
  })

  // Calculate by page
  const byPage = Array.from(pageGroups.entries()).map(([pageUrl, values]) => {
    const metricsByType = new Map<string, number[]>()
    
    for (const metric of values) {
      if (!metricsByType.has(metric.metric_type)) {
        metricsByType.set(metric.metric_type, [])
      }
      metricsByType.get(metric.metric_type)!.push(metric.value)
    }

    const pageMetrics: Record<string, number> = {}
    for (const [type, vals] of metricsByType.entries()) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length
      pageMetrics[type] = Math.round(avg * 100) / 100
    }

    return {
      page_url: pageUrl,
      metrics: pageMetrics
    }
  })

  const result = { metrics, by_page: byPage }
  
  // Log final result for debugging
  console.log('[Performance] Summary result:', {
    metricsCount: metrics.length,
    byPageCount: byPage.length,
    metrics: metrics.map(m => ({ type: m.metric_type, average: m.average })),
    byPage: byPage.map(p => ({ page: p.page_url, metrics: Object.keys(p.metrics) }))
  })
  
  return result
}

/**
 * Get performance trends over time
 */
export async function getPerformanceTrends(
  projectId: string,
  metricType: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP',
  startDate: string,
  endDate: string,
  granularity: 'daily' | 'weekly' = 'daily'
): Promise<Array<{ date: string; average: number; count: number }>> {
  const { data, error } = await supabase
    .from('performance_metrics')
    .select('value, timestamp')
    .eq('project_id', projectId)
    .eq('metric_type', metricType)
    .gte('timestamp', startDate)
    .lte('timestamp', endDate)
    .order('timestamp', { ascending: true })

  if (error || !data) {
    return []
  }

  // Group by date
  const dateGroups = new Map<string, number[]>()

  for (const metric of data as PerformanceMetric[]) {
    const date = new Date(metric.timestamp)
    let dateKey: string

    if (granularity === 'daily') {
      dateKey = date.toISOString().split('T')[0]
    } else {
      // Weekly: Get Monday of the week
      const day = date.getDay()
      const diff = date.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(date.setDate(diff))
      dateKey = monday.toISOString().split('T')[0]
    }

    if (!dateGroups.has(dateKey)) {
      dateGroups.set(dateKey, [])
    }
    dateGroups.get(dateKey)!.push(metric.value)
  }

  // Calculate averages
  return Array.from(dateGroups.entries())
    .map(([date, values]) => {
      const average = values.reduce((a, b) => a + b, 0) / values.length
      return {
        date,
        average: Math.round(average * 100) / 100,
        count: values.length
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

