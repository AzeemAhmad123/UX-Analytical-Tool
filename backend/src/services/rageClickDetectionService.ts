/**
 * Rage Click Detection Service
 * 
 * Detects rage clicks (multiple rapid clicks on same element) and dead taps (mobile)
 */

import { supabase } from '../config/supabase'

export interface RageClick {
  id: string
  session_id: string
  project_id: string
  element_selector: string
  element_text: string
  click_count: number
  time_window_ms: number
  coordinates: Array<{ x: number; y: number; timestamp: number }>
  page_url: string
  detected_at: string
  metadata?: any
}

export interface DeadTap {
  id: string
  session_id: string
  project_id: string
  element_selector: string
  element_text: string
  tap_count: number
  time_window_ms: number
  coordinates: Array<{ x: number; y: number; timestamp: number }>
  page_url: string
  detected_at: string
  metadata?: any
}

interface ClickEvent {
  session_id: string
  timestamp: number
  x: number
  y: number
  element_selector?: string
  element_text?: string
  page_url?: string
}

/**
 * Detect rage clicks from click events
 * Rage click: 3+ clicks on same element within 2 seconds
 */
export async function detectRageClicks(
  projectId: string,
  sessionId: string,
  clickEvents: Array<{
    timestamp: string
    data: {
      x?: number
      y?: number
      element_selector?: string
      element_text?: string
      page_url?: string
    }
  }>
): Promise<RageClick[]> {
  const rageClicks: RageClick[] = []
  const clickMap = new Map<string, ClickEvent[]>()

  // Group clicks by element selector
  for (const event of clickEvents) {
    const selector = event.data.element_selector || 'unknown'
    const timestamp = new Date(event.timestamp).getTime()
    
    if (!clickMap.has(selector)) {
      clickMap.set(selector, [])
    }

    clickMap.get(selector)!.push({
      session_id: sessionId,
      timestamp,
      x: event.data.x || 0,
      y: event.data.y || 0,
      element_selector: selector,
      element_text: event.data.element_text,
      page_url: event.data.page_url
    })
  }

  // Check each element for rage clicks
  for (const [selector, clicks] of clickMap.entries()) {
    if (clicks.length < 3) continue

    // Sort by timestamp
    clicks.sort((a, b) => a.timestamp - b.timestamp)

    // Find clusters of clicks within 2 seconds
    let i = 0
    while (i < clicks.length) {
      const cluster: ClickEvent[] = [clicks[i]]
      const startTime = clicks[i].timestamp
      const timeWindow = 2000 // 2 seconds

      // Find all clicks within time window
      for (let j = i + 1; j < clicks.length; j++) {
        if (clicks[j].timestamp - startTime <= timeWindow) {
          cluster.push(clicks[j])
        } else {
          break
        }
      }

      // If 3+ clicks in cluster, it's a rage click
      if (cluster.length >= 3) {
        const coordinates = cluster.map(c => ({
          x: c.x,
          y: c.y,
          timestamp: c.timestamp
        }))

        const rageClick: Omit<RageClick, 'id' | 'detected_at'> = {
          session_id: sessionId,
          project_id: projectId,
          element_selector: selector,
          element_text: cluster[0].element_text || '',
          click_count: cluster.length,
          time_window_ms: cluster[cluster.length - 1].timestamp - cluster[0].timestamp,
          coordinates,
          page_url: cluster[0].page_url || '',
          metadata: {
            first_click: cluster[0].timestamp,
            last_click: cluster[cluster.length - 1].timestamp
          }
        }

        // Save to database
        const saved = await saveRageClick(rageClick)
        if (saved) {
          rageClicks.push(saved)
        }

        // Skip processed clicks
        i += cluster.length
      } else {
        i++
      }
    }
  }

  return rageClicks
}

/**
 * Detect dead taps (mobile equivalent of rage clicks)
 */
export async function detectDeadTaps(
  projectId: string,
  sessionId: string,
  tapEvents: Array<{
    timestamp: string
    data: {
      x?: number
      y?: number
      element_selector?: string
      element_text?: string
      page_url?: string
    }
  }>
): Promise<DeadTap[]> {
  // Similar logic to rage clicks but for mobile taps
  // Dead tap: 3+ taps on same element within 2 seconds with no response
  const deadTaps: DeadTap[] = []
  const tapMap = new Map<string, ClickEvent[]>()

  for (const event of tapEvents) {
    const selector = event.data.element_selector || 'unknown'
    const timestamp = new Date(event.timestamp).getTime()
    
    if (!tapMap.has(selector)) {
      tapMap.set(selector, [])
    }

    tapMap.get(selector)!.push({
      session_id: sessionId,
      timestamp,
      x: event.data.x || 0,
      y: event.data.y || 0,
      element_selector: selector,
      element_text: event.data.element_text,
      page_url: event.data.page_url
    })
  }

  for (const [selector, taps] of tapMap.entries()) {
    if (taps.length < 3) continue

    taps.sort((a, b) => a.timestamp - b.timestamp)

    let i = 0
    while (i < taps.length) {
      const cluster: ClickEvent[] = [taps[i]]
      const startTime = taps[i].timestamp
      const timeWindow = 2000

      for (let j = i + 1; j < taps.length; j++) {
        if (taps[j].timestamp - startTime <= timeWindow) {
          cluster.push(taps[j])
        } else {
          break
        }
      }

      if (cluster.length >= 3) {
        const coordinates = cluster.map(t => ({
          x: t.x,
          y: t.y,
          timestamp: t.timestamp
        }))

        const deadTap: Omit<DeadTap, 'id' | 'detected_at'> = {
          session_id: sessionId,
          project_id: projectId,
          element_selector: selector,
          element_text: cluster[0].element_text || '',
          tap_count: cluster.length,
          time_window_ms: cluster[cluster.length - 1].timestamp - cluster[0].timestamp,
          coordinates,
          page_url: cluster[0].page_url || '',
          metadata: {
            first_tap: cluster[0].timestamp,
            last_tap: cluster[cluster.length - 1].timestamp
          }
        }

        const saved = await saveDeadTap(deadTap)
        if (saved) {
          deadTaps.push(saved)
        }

        i += cluster.length
      } else {
        i++
      }
    }
  }

  return deadTaps
}

/**
 * Save rage click to database
 */
async function saveRageClick(rageClick: Omit<RageClick, 'id' | 'detected_at'>): Promise<RageClick | null> {
  try {
    const { data, error } = await supabase
      .from('rage_clicks')
      .insert(rageClick)
      .select()
      .single()

    if (error) {
      console.error('Error saving rage click:', error)
      return null
    }

    return data as RageClick
  } catch (error: any) {
    console.error('Error saving rage click:', error)
    return null
  }
}

/**
 * Save dead tap to database
 */
async function saveDeadTap(deadTap: Omit<DeadTap, 'id' | 'detected_at'>): Promise<DeadTap | null> {
  try {
    const { data, error } = await supabase
      .from('dead_taps')
      .insert(deadTap)
      .select()
      .single()

    if (error) {
      console.error('Error saving dead tap:', error)
      return null
    }

    return data as DeadTap
  } catch (error: any) {
    console.error('Error saving dead tap:', error)
    return null
  }
}

/**
 * Get rage clicks for a session
 */
export async function getSessionRageClicks(sessionId: string): Promise<RageClick[]> {
  const { data, error } = await supabase
    .from('rage_clicks')
    .select('*')
    .eq('session_id', sessionId)
    .order('detected_at', { ascending: false })

  if (error) {
    console.error('Error fetching rage clicks:', error)
    return []
  }

  return (data || []) as RageClick[]
}

/**
 * Get dead taps for a session
 */
export async function getSessionDeadTaps(sessionId: string): Promise<DeadTap[]> {
  const { data, error } = await supabase
    .from('dead_taps')
    .select('*')
    .eq('session_id', sessionId)
    .order('detected_at', { ascending: false })

  if (error) {
    console.error('Error fetching dead taps:', error)
    return []
  }

  return (data || []) as DeadTap[]
}

/**
 * Get rage clicks summary for a project
 */
export async function getRageClicksSummary(
  projectId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  total: number
  by_page: Array<{ page_url: string; count: number }>
  top_elements: Array<{ element_selector: string; count: number }>
}> {
  let query = supabase
    .from('rage_clicks')
    .select('page_url, element_selector')
    .eq('project_id', projectId)

  if (startDate) {
    query = query.gte('detected_at', startDate)
  }
  if (endDate) {
    query = query.lte('detected_at', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching rage clicks summary:', error)
    return { total: 0, by_page: [], top_elements: [] }
  }

  const pageCounts = new Map<string, number>()
  const elementCounts = new Map<string, number>()

  data?.forEach(click => {
    if (click.page_url) {
      pageCounts.set(click.page_url, (pageCounts.get(click.page_url) || 0) + 1)
    }
    if (click.element_selector) {
      elementCounts.set(click.element_selector, (elementCounts.get(click.element_selector) || 0) + 1)
    }
  })

  const byPage = Array.from(pageCounts.entries())
    .map(([page_url, count]) => ({ page_url, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const topElements = Array.from(elementCounts.entries())
    .map(([element_selector, count]) => ({ element_selector, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    total: data?.length || 0,
    by_page: byPage,
    top_elements: topElements
  }
}

