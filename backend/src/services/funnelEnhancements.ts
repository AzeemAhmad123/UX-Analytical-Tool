/**
 * Enhanced Funnel Features
 * 
 * This file contains additional features for funnel analysis:
 * - Time window filtering
 * - Average time between steps
 * - First-time vs returning users
 * - Additional filters (country, device, app version)
 * - Trend over time
 */

import { supabase } from '../config/supabase'
import { FunnelStep, StepResult, FunnelAnalysisResult } from './funnelService'

/**
 * Calculate average time between steps
 */
export async function calculateAverageTimeBetweenSteps(
  projectId: string,
  step1Events: Array<{ session_id: string; timestamp: string }>,
  step2Events: Array<{ session_id: string; timestamp: string }>
): Promise<number> {
  if (!step1Events || !step2Events || step1Events.length === 0 || step2Events.length === 0) {
    return 0
  }

  // Create maps of session_id -> earliest timestamp for each step
  const step1Map = new Map<string, number>()
  const step2Map = new Map<string, number>()

  for (const event of step1Events) {
    const timestamp = new Date(event.timestamp).getTime()
    const existing = step1Map.get(event.session_id)
    if (!existing || timestamp < existing) {
      step1Map.set(event.session_id, timestamp)
    }
  }

  for (const event of step2Events) {
    const timestamp = new Date(event.timestamp).getTime()
    const existing = step2Map.get(event.session_id)
    if (!existing || timestamp < existing) {
      step2Map.set(event.session_id, timestamp)
    }
  }

  // Calculate time differences for sessions that completed both steps
  const timeDiffs: number[] = []
  for (const [sessionId, step1Time] of step1Map.entries()) {
    const step2Time = step2Map.get(sessionId)
    if (step2Time && step2Time > step1Time) {
      timeDiffs.push(step2Time - step1Time)
    }
  }

  if (timeDiffs.length === 0) {
    return 0
  }

  const avgTime = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length
  return Math.round(avgTime)
}

/**
 * Track first-time vs returning users
 */
export async function trackUserTypes(
  projectId: string,
  sessionIds: string[]
): Promise<{ firstTime: number; returning: number }> {
  if (!sessionIds || sessionIds.length === 0) {
    return { firstTime: 0, returning: 0 }
  }

  // Get sessions with their start times
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, session_id, start_time')
    .in('id', sessionIds)
    .eq('project_id', projectId)

  if (!sessions || sessions.length === 0) {
    return { firstTime: 0, returning: 0 }
  }

  // Extract user identifiers from session_id (format: sess_timestamp_random)
  // For now, we'll use session_id as user identifier (can be enhanced with actual user_id)
  const userFirstSeen = new Map<string, Date>()

  for (const session of sessions) {
    // Extract a user identifier (simplified - in production, use actual user_id from device_info)
    const userIdentifier = session.session_id.split('_')[0] // Simplified
    const sessionStart = new Date(session.start_time)

    const firstSeen = userFirstSeen.get(userIdentifier)
    if (!firstSeen || sessionStart < firstSeen) {
      userFirstSeen.set(userIdentifier, sessionStart)
    }
  }

  // Count first-time vs returning
  let firstTime = 0
  let returning = 0

  for (const session of sessions) {
    const userIdentifier = session.session_id.split('_')[0]
    const firstSeen = userFirstSeen.get(userIdentifier)
    const sessionStart = new Date(session.start_time)

    if (firstSeen && sessionStart.getTime() === firstSeen.getTime()) {
      firstTime++
    } else {
      returning++
    }
  }

  return { firstTime, returning }
}

/**
 * Apply additional filters (country, device, app version) using user_properties
 */
export async function applyAdditionalFilters(
  projectId: string,
  sessionIds: string[],
  countryFilter?: string,
  deviceFilter?: string,
  appVersionFilter?: string
): Promise<string[]> {
  if (!sessionIds || sessionIds.length === 0) {
    return []
  }

  if (!countryFilter && !deviceFilter && !appVersionFilter) {
    return sessionIds
  }

  // Get user_ids from events for these sessions
  const { data: eventsWithUsers } = await supabase
    .from('events')
    .select('session_id, user_id')
    .in('session_id', sessionIds)
    .eq('project_id', projectId)
    .not('user_id', 'is', null)
    .limit(5000) // Limit for performance

  if (!eventsWithUsers || eventsWithUsers.length === 0) {
    // Fallback to session-based filtering if no user_ids
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, country, device_info')
      .in('id', sessionIds)
      .eq('project_id', projectId)

    if (!sessions || sessions.length === 0) {
      return []
    }

    let filtered = sessions
    if (countryFilter) {
      filtered = filtered.filter(s => s.country === countryFilter)
    }
    if (deviceFilter) {
      filtered = filtered.filter(s => {
        const deviceInfo = s.device_info || {}
        const device = deviceInfo.device || deviceInfo.deviceModel || ''
        return device.toLowerCase().includes(deviceFilter.toLowerCase())
      })
    }
    if (appVersionFilter) {
      filtered = filtered.filter(s => {
        const deviceInfo = s.device_info || {}
        const appVersion = deviceInfo.appVersion || deviceInfo.version || ''
        return appVersion === appVersionFilter
      })
    }
    return filtered.map(s => s.id)
  }

  // Get unique user_ids
  const userIds = Array.from(new Set(eventsWithUsers.map(e => e.user_id).filter(Boolean)))
  
  // Fetch user properties
  const { data: userProps } = await supabase
    .from('user_properties')
    .select('user_id, country, app_version, device_type')
    .eq('project_id', projectId)
    .in('user_id', userIds)

  // Create user_id to properties map
  const userPropsMap = new Map<string, any>()
  userProps?.forEach(up => {
    userPropsMap.set(up.user_id, up)
  })

  // Filter user_ids based on criteria
  const filteredUserIds = userIds.filter(userId => {
    const props = userPropsMap.get(userId)
    if (!props) return false // Exclude users without properties

    if (countryFilter && props.country !== countryFilter) {
      return false
    }
    if (deviceFilter && props.device_type && !props.device_type.toLowerCase().includes(deviceFilter.toLowerCase())) {
      return false
    }
    if (appVersionFilter && props.app_version !== appVersionFilter) {
      return false
    }
    return true
  })

  // Map back to session_ids
  const sessionToUserMap = new Map<string, string>()
  eventsWithUsers.forEach(e => {
    if (e.user_id && !sessionToUserMap.has(e.session_id)) {
      sessionToUserMap.set(e.session_id, e.user_id)
    }
  })

  return sessionIds.filter(sessionId => {
    const userId = sessionToUserMap.get(sessionId)
    return userId && filteredUserIds.includes(userId)
  })
}

/**
 * Calculate trend over time (daily or weekly)
 */
export async function calculateTrendOverTime(
  projectId: string,
  funnelSteps: FunnelStep[],
  startDate: string,
  endDate: string,
  granularity: 'daily' | 'weekly' = 'daily'
): Promise<FunnelAnalysisResult['trend_over_time']> {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const result: FunnelAnalysisResult['trend_over_time'] = {}

  if (granularity === 'daily') {
    // Limit to 30 days max for performance
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 30) {
      console.warn(`[Trend] Date range too large (${daysDiff} days), limiting to last 30 days`)
      const limitedStart = new Date(end)
      limitedStart.setDate(limitedStart.getDate() - 30)
      start.setTime(limitedStart.getTime())
    }

    const daily: Array<{ date: string; total_users: number; conversions: number; conversion_rate: number }> = []
    const currentDate = new Date(start)
    const endDateObj = new Date(end)

    const firstStep = funnelSteps[0]
    const lastStep = funnelSteps[funnelSteps.length - 1]

    if (!firstStep) {
      // No steps, return empty
      result.daily = []
      return result
    }

    // OPTIMIZATION: Fetch all events for the entire date range at once, then group by date
    // This reduces from 60+ queries (2 per day) to just 2 queries total
    
    // Build first step query for entire range
    let firstStepQuery = supabase
      .from('events')
      .select('session_id, timestamp')
      .eq('project_id', projectId)
      .gte('timestamp', start.toISOString())
      .lte('timestamp', endDateObj.toISOString())

    if (firstStep.condition.type === 'page_view') {
      firstStepQuery = firstStepQuery.eq('type', 'page_view')
    } else if (firstStep.condition.type === 'event') {
      firstStepQuery = firstStepQuery.eq('type', firstStep.condition.event_type)
    }

    if (firstStep.condition.data) {
      for (const [key, value] of Object.entries(firstStep.condition.data)) {
        const cleanKey = key.trim()
        firstStepQuery = firstStepQuery.eq(`data->>${cleanKey}`, value)
      }
    }

    // Build last step query for entire range
    let lastStepQuery = supabase
      .from('events')
      .select('session_id, timestamp')
      .eq('project_id', projectId)
      .gte('timestamp', start.toISOString())
      .lte('timestamp', endDateObj.toISOString())

    if (lastStep) {
      if (lastStep.condition.type === 'page_view') {
        lastStepQuery = lastStepQuery.eq('type', 'page_view')
      } else if (lastStep.condition.type === 'event') {
        lastStepQuery = lastStepQuery.eq('type', lastStep.condition.event_type)
      }

      if (lastStep.condition.data) {
        for (const [key, value] of Object.entries(lastStep.condition.data)) {
          const cleanKey = key.trim()
          lastStepQuery = lastStepQuery.eq(`data->>${cleanKey}`, value)
        }
      }
    }

    // Fetch both queries in parallel
    const [firstStepResult, lastStepResult] = await Promise.all([
      firstStepQuery,
      lastStep ? lastStepQuery : Promise.resolve({ data: [], error: null })
    ])

    if (firstStepResult.error) {
      console.error('[Trend] Error fetching first step events:', firstStepResult.error)
      result.daily = []
      return result
    }

    // Group events by date
    const firstStepByDate = new Map<string, Set<string>>() // date -> Set<session_id>
    const lastStepByDate = new Map<string, Set<string>>()

    for (const event of firstStepResult.data || []) {
      const eventDate = new Date(event.timestamp).toISOString().split('T')[0]
      if (!firstStepByDate.has(eventDate)) {
        firstStepByDate.set(eventDate, new Set())
      }
      firstStepByDate.get(eventDate)!.add(event.session_id)
    }

    if (lastStepResult.data) {
      for (const event of lastStepResult.data) {
        const eventDate = new Date(event.timestamp).toISOString().split('T')[0]
        if (!lastStepByDate.has(eventDate)) {
          lastStepByDate.set(eventDate, new Set())
        }
        lastStepByDate.get(eventDate)!.add(event.session_id)
      }
    }

    // Now calculate daily metrics
    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const firstStepSessions = firstStepByDate.get(dateStr) || new Set()
      const lastStepSessions = lastStepByDate.get(dateStr) || new Set()
      
      const totalUsers = firstStepSessions.size
      
      // Count conversions: sessions that completed both steps
      let conversions = 0
      for (const sessionId of lastStepSessions) {
        if (firstStepSessions.has(sessionId)) {
          conversions++
        }
      }
      
      const conversionRate = totalUsers > 0 ? (conversions / totalUsers) * 100 : 0

      daily.push({
        date: dateStr,
        total_users: totalUsers,
        conversions: conversions,
        conversion_rate: conversionRate
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    result.daily = daily
  } else if (granularity === 'weekly') {
    // Similar logic but group by week
    const weekly: Array<{ week: string; total_users: number; conversions: number; conversion_rate: number }> = []
    // Implementation for weekly aggregation
    // (Similar to daily but group by week)
    result.weekly = weekly
  }

  return result
}

/**
 * Apply time window filter to funnel completion
 */
export function applyTimeWindow(
  events: Array<{ session_id: string; timestamp: string }>,
  timeWindowMs: number | null
): Array<{ session_id: string; timestamp: string }> {
  if (!timeWindowMs || !events || events.length === 0) {
    return events
  }

  // Group events by session
  const sessionEvents = new Map<string, Array<{ session_id: string; timestamp: string }>>()
  for (const event of events) {
    if (!sessionEvents.has(event.session_id)) {
      sessionEvents.set(event.session_id, [])
    }
    sessionEvents.get(event.session_id)!.push(event)
  }

  // Filter sessions where all events occur within time window
  const filtered: Array<{ session_id: string; timestamp: string }> = []
  for (const [sessionId, sessionEventList] of sessionEvents.entries()) {
    const timestamps = sessionEventList.map(e => new Date(e.timestamp).getTime()).sort((a, b) => a - b)
    const firstTimestamp = timestamps[0]
    const lastTimestamp = timestamps[timestamps.length - 1]
    const duration = lastTimestamp - firstTimestamp

    if (duration <= timeWindowMs) {
      filtered.push(...sessionEventList)
    }
  }

  return filtered
}

