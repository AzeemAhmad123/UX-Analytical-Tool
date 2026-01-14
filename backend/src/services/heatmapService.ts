/**
 * Heatmap Service
 * 
 * Generates and manages heatmaps for click, scroll, move, and attention tracking
 */

import { supabase } from '../config/supabase'

export interface HeatmapDataPoint {
  x: number
  y: number
  intensity: number
}

export interface Heatmap {
  id: string
  project_id: string
  page_url: string
  heatmap_type: 'click' | 'scroll' | 'move' | 'attention'
  viewport_width: number
  viewport_height: number
  data_points: HeatmapDataPoint[]
  total_sessions: number
  date_range_start?: string
  date_range_end?: string
  created_at: string
  updated_at: string
}

/**
 * Generate heatmap from events
 */
export async function generateHeatmap(
  projectId: string,
  pageUrl: string,
  heatmapType: 'click' | 'scroll' | 'move' | 'attention',
  startDate: string,
  endDate: string,
  viewportWidth?: number,
  viewportHeight?: number
): Promise<Heatmap | null> {
  try {
    // Get events for the page and date range
    let eventType = 'button_click'
    if (heatmapType === 'scroll') {
      eventType = 'scroll'
    } else if (heatmapType === 'move') {
      eventType = 'mouse_move'
    }

    const { data: events, error } = await supabase
      .from('events')
      .select('data, timestamp')
      .eq('project_id', projectId)
      .eq('type', eventType)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .not('data', 'is', null)

    if (error) {
      console.error('Error fetching events for heatmap:', error)
      return null
    }

    // Filter events for the specific page
    const pageEvents = events?.filter(e => {
      const url = e.data?.url || e.data?.page_url || ''
      return url.includes(pageUrl) || pageUrl.includes(url)
    }) || []

    if (pageEvents.length === 0) {
      return null
    }

    // Aggregate coordinates into heatmap data points
    const coordinateMap = new Map<string, { x: number; y: number; count: number }>()

    for (const event of pageEvents) {
      const x = event.data?.x || event.data?.clientX || 0
      const y = event.data?.y || event.data?.clientY || 0

      // Round to grid (e.g., 10px grid)
      const gridSize = 10
      const gridX = Math.floor(x / gridSize) * gridSize
      const gridY = Math.floor(y / gridSize) * gridSize
      const key = `${gridX},${gridY}`

      if (!coordinateMap.has(key)) {
        coordinateMap.set(key, { x: gridX, y: gridY, count: 0 })
      }

      coordinateMap.get(key)!.count++
    }

    // Convert to data points with normalized intensity
    const maxCount = Math.max(...Array.from(coordinateMap.values()).map(v => v.count))
    const dataPoints: HeatmapDataPoint[] = Array.from(coordinateMap.values()).map(point => ({
      x: point.x,
      y: point.y,
      intensity: maxCount > 0 ? point.count / maxCount : 0
    }))

    // Get unique session count
    const { count: sessionCount } = await supabase
      .from('events')
      .select('session_id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('type', eventType)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)

    // Check if heatmap already exists
    const { data: existing } = await supabase
      .from('heatmaps')
      .select('*')
      .eq('project_id', projectId)
      .eq('page_url', pageUrl)
      .eq('heatmap_type', heatmapType)
      .single()

    if (existing) {
      // Update existing
      const { data, error: updateError } = await supabase
        .from('heatmaps')
        .update({
          data_points: dataPoints,
          total_sessions: sessionCount || 0,
          date_range_start: startDate,
          date_range_end: endDate,
          viewport_width: viewportWidth,
          viewport_height: viewportHeight,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating heatmap:', updateError)
        return null
      }

      return data as Heatmap
    } else {
      // Create new
      const { data, error: insertError } = await supabase
        .from('heatmaps')
        .insert({
          project_id: projectId,
          page_url: pageUrl,
          heatmap_type: heatmapType,
          viewport_width: viewportWidth,
          viewport_height: viewportHeight,
          data_points: dataPoints,
          total_sessions: sessionCount || 0,
          date_range_start: startDate,
          date_range_end: endDate
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating heatmap:', insertError)
        return null
      }

      return data as Heatmap
    }
  } catch (error: any) {
    console.error('Error generating heatmap:', error)
    return null
  }
}

/**
 * Get heatmap for a page
 */
export async function getHeatmap(
  projectId: string,
  pageUrl: string,
  heatmapType: 'click' | 'scroll' | 'move' | 'attention'
): Promise<Heatmap | null> {
  const { data, error } = await supabase
    .from('heatmaps')
    .select('*')
    .eq('project_id', projectId)
    .eq('page_url', pageUrl)
    .eq('heatmap_type', heatmapType)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data as Heatmap
}

/**
 * Get all heatmaps for a project
 */
export async function getProjectHeatmaps(
  projectId: string,
  pageUrl?: string
): Promise<Heatmap[]> {
  let query = supabase
    .from('heatmaps')
    .select('*')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })

  if (pageUrl) {
    query = query.eq('page_url', pageUrl)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching heatmaps:', error)
    return []
  }

  return (data || []) as Heatmap[]
}

/**
 * Delete old heatmaps
 */
export async function cleanupOldHeatmaps(projectId: string, daysToKeep: number = 90): Promise<number> {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)

  const { count, error } = await supabase
    .from('heatmaps')
    .delete({ count: 'exact' })
    .eq('project_id', projectId)
    .lt('updated_at', cutoffDate.toISOString())

  if (error) {
    console.error('Error cleaning up heatmaps:', error)
    return 0
  }

  return count || 0
}

