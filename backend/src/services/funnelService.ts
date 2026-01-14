import { supabase } from '../config/supabase'
import {
  calculateAverageTimeBetweenSteps,
  trackUserTypes,
  applyAdditionalFilters,
  calculateTrendOverTime,
  applyTimeWindow
} from './funnelEnhancements'

/**
 * Detect platform from session device_info or user_properties
 * IMPORTANT: Only use explicit platform field. Do NOT use heuristics like user agent or viewport
 * because web browsers on mobile devices will be misclassified as native apps.
 */
function detectPlatform(deviceInfo: any, userProperties?: any): 'web' | 'android' | 'ios' {
  // First check user_properties (most accurate - set by SDK)
  if (userProperties?.platform) {
    if (userProperties.platform === 'android' || userProperties.platform === 'ios' || userProperties.platform === 'web') {
      return userProperties.platform
    }
  }
  
  // Second check device_info.platform (explicitly set by SDK)
  if (deviceInfo?.platform) {
    if (deviceInfo.platform === 'web' || deviceInfo.platform === 'android' || deviceInfo.platform === 'ios') {
      return deviceInfo.platform
    }
  }
  
  // If no explicit platform is set, default to 'web'
  // Do NOT use user agent or viewport heuristics as they will misclassify
  // web browsers on mobile devices as native apps
  return 'web'
}

export interface FunnelStep {
  order: number
  name: string
  condition: {
    type: 'event' | 'page_view' | 'form_field' | 'custom'
    event_type?: string
    field_name?: string // For form field steps
    form_id?: string // For form field steps
    data?: Record<string, any>
  }
}

export interface FunnelDefinition {
  id: string
  project_id: string
  name: string
  description?: string
  steps: FunnelStep[]
  is_form_funnel: boolean
  form_url?: string
  time_window_hours?: number // Time window for funnel completion (e.g., 24 hours)
  track_first_time_users?: boolean // Track first-time vs returning users
  created_at: string
  updated_at: string
}

export interface StepResult {
  order: number
  name: string
  users: number
  sessions: number
  conversion_rate: number // % of step 1
  drop_off_rate: number // % dropped from previous step
  avg_time_to_complete?: number // milliseconds - average time from previous step
  first_time_users?: number // Count of first-time users
  returning_users?: number // Count of returning users
  platform_breakdown?: {
    mobile: {
      users: number
      sessions: number
    }
    web: {
      users: number
      sessions: number
    }
  }
  dropped_sessions?: string[] // Session IDs that dropped off
}

export interface FunnelAnalysisResult {
  funnel_id: string
  funnel_name: string
  steps: StepResult[]
  total_users: number
  overall_conversion: number // % who completed all steps
  first_time_users?: number
  returning_users?: number
  date_range: {
    start: string
    end: string
  }
  time_window_hours?: number // Time window applied to this analysis
  platform_breakdown?: {
    mobile: {
      steps: StepResult[]
      total_users: number
      overall_conversion: number
    }
    web: {
      steps: StepResult[]
      total_users: number
      overall_conversion: number
    }
  }
  geographic_breakdown?: {
    by_country: Record<string, {
      steps: StepResult[]
      total_users: number
      overall_conversion: number
    }>
    by_city: Record<string, {
      steps: StepResult[]
      total_users: number
      overall_conversion: number
    }>
  }
  field_breakdown?: {
    [fieldName: string]: {
      started: number
      completed: number
      skipped: number
      abandoned: number
      completion_rate: number
      drop_off_by_location: Record<string, number>
    }
  }
  trend_over_time?: {
    daily?: Array<{
      date: string
      total_users: number
      conversions: number
      conversion_rate: number
    }>
    weekly?: Array<{
      week: string
      total_users: number
      conversions: number
      conversion_rate: number
    }>
  }
}

/**
 * Get funnel definition by ID
 */
export async function getFunnelById(funnelId: string): Promise<FunnelDefinition | null> {
  try {
    const { data, error } = await supabase
      .from('funnels')
      .select('*')
      .eq('id', funnelId)
      .single()

    if (error) {
      console.error('Error fetching funnel:', error)
      return null
    }

    return data as FunnelDefinition
  } catch (error) {
    console.error('Error in getFunnelById:', error)
    return null
  }
}

/**
 * Check if an event matches a step condition
 */
function matchesStepCondition(
  event: { type: string; data: Record<string, any> },
  step: FunnelStep
): boolean {
  const condition = step.condition

  // Match event type
  if (condition.type === 'event' && event.type !== condition.event_type) {
    return false
  }

  if (condition.type === 'page_view' && event.type !== 'page_view') {
    return false
  }

  // Match form field condition
  if (condition.type === 'form_field') {
    if (event.type !== 'form_field_event') {
      return false
    }
    if (condition.field_name && event.data.field_name !== condition.field_name) {
      return false
    }
    if (condition.form_id && event.data.form_id !== condition.form_id) {
      return false
    }
    if (condition.data?.action && event.data.action !== condition.data.action) {
      return false
    }
  }

  // Match data properties (deep comparison)
  if (condition.data) {
    for (const [key, value] of Object.entries(condition.data)) {
      // Skip special fields
      if (key === 'action' && condition.type === 'form_field') {
        continue // Already checked above
      }
      if (event.data[key] !== value) {
        return false
      }
    }
  }

  return true
}

/**
 * Analyze funnel - main analysis function
 */
export async function analyzeFunnel(
  funnelId: string,
  startDate: string,
  endDate: string,
  includeGeography: boolean = false,
  platformFilter: 'all' | 'web' | 'android' | 'ios' = 'all',
  countryFilter?: string,
  deviceFilter?: string,
  appVersionFilter?: string,
  includeTrendOverTime: boolean = false,
  cohortFilter?: {
    is_new_user?: boolean
    acquisition_source?: string
    custom_properties?: Record<string, any>
  }
): Promise<FunnelAnalysisResult | null> {
  try {
    const funnel = await getFunnelById(funnelId)
    if (!funnel) {
      throw new Error('Funnel not found')
    }

    const steps = funnel.steps.sort((a, b) => a.order - b.order)
    if (steps.length === 0) {
      throw new Error('Funnel has no steps')
    }

    const stepResults: StepResult[] = []
    let previousStepSessions: Set<string> | null = null
    const timeWindowMs = funnel.time_window_hours ? funnel.time_window_hours * 60 * 60 * 1000 : null
    
    // Store event data for time calculations and user tracking
    const stepEvents: Array<Array<{ session_id: string; timestamp: string }>> = []

    // Analyze each step in order
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const isFirstStep = i === 0

      // Build query to find sessions matching this step
      let query = supabase
        .from('events')
        .select('session_id, timestamp, data')
        .eq('project_id', funnel.project_id)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)

      // Apply step condition
      if (step.condition.type === 'page_view') {
        query = query.eq('type', 'page_view')
      } else if (step.condition.type === 'event') {
        query = query.eq('type', step.condition.event_type)
      } else if (step.condition.type === 'form_field') {
        // For form fields, query form_field_events table
        let formQuery = supabase
          .from('form_field_events')
          .select('session_id, timestamp')
          .eq('project_id', funnel.project_id)
          .gte('timestamp', startDate)
          .lte('timestamp', endDate)

        if (step.condition.form_id) {
          formQuery = formQuery.eq('form_id', step.condition.form_id)
        }
        if (step.condition.field_name) {
          formQuery = formQuery.eq('field_name', step.condition.field_name)
        }
        if (step.condition.data?.action) {
          formQuery = formQuery.eq('action', step.condition.data.action)
        } else {
          formQuery = formQuery.eq('action', 'focus') // Default to focus
        }

        // If previous step exists, filter by those sessions
        if (!isFirstStep && previousStepSessions && previousStepSessions.size > 0) {
          const sessionIds = Array.from(previousStepSessions)
          formQuery = formQuery.in('session_id', sessionIds)
        }

        const { data: formEvents, error: formError } = await formQuery

        if (formError) {
          console.error('Error querying form field events:', formError)
          throw formError
        }

        // Store events for time calculations
        const formEventList = formEvents?.map(e => ({ session_id: e.session_id, timestamp: e.timestamp })) || []
        stepEvents.push(formEventList)

        // Get unique sessions for this step
        const currentStepSessions = new Set(formEvents?.map(e => e.session_id) || [])
        const count = currentStepSessions.size

        // Apply additional filters if needed
        let filteredSessionIds = Array.from(currentStepSessions)
        if (filteredSessionIds.length > 0 && (countryFilter || deviceFilter || appVersionFilter)) {
          filteredSessionIds = await applyAdditionalFilters(
            funnel.project_id,
            filteredSessionIds,
            countryFilter,
            deviceFilter,
            appVersionFilter
          )
          const filteredSet = new Set(filteredSessionIds)
          // Update count after filtering
          const filteredCount = filteredSet.size
          
          // Track dropped sessions
          const droppedSessions: string[] = []
          if (!isFirstStep && previousStepSessions && previousStepSessions.size > 0) {
            const dropped = Array.from(previousStepSessions).filter(id => !filteredSet.has(id))
            droppedSessions.push(...dropped)
          }

        // Calculate conversion and drop-off rates
        const firstStepCount = stepResults[0]?.sessions || filteredCount
        const conversionRate = firstStepCount > 0 ? (filteredCount / firstStepCount) * 100 : 0
        
        // Calculate drop-off rate: % of users from previous step who didn't complete this step
        let dropOffRate = 0
        if (!isFirstStep && previousStepSessions && previousStepSessions.size > 0) {
          const previousCount = previousStepSessions.size
          const currentCount = filteredCount
          const droppedCount = previousCount - currentCount
          dropOffRate = (droppedCount / previousCount) * 100
          
          // Log for debugging
          console.log(`[Funnel] Step ${step.order} (${step.name}):`, {
            previousStepSessions: previousCount,
            currentStepSessions: currentCount,
            dropped: droppedCount,
            dropOffRate: dropOffRate.toFixed(2) + '%'
          })
        } else if (isFirstStep) {
          console.log(`[Funnel] Step ${step.order} (${step.name}): First step - no drop-off calculation`)
        } else {
          console.log(`[Funnel] Step ${step.order} (${step.name}): No previous step sessions`)
        }

          // Calculate average time to complete from previous step
          let avgTimeToComplete: number | undefined = undefined
          if (!isFirstStep && stepEvents[i - 1] && stepEvents[i]) {
            avgTimeToComplete = await calculateAverageTimeBetweenSteps(
              funnel.project_id,
              stepEvents[i - 1],
              stepEvents[i]
            )
          }

          // Track first-time vs returning users if enabled
          let firstTimeUsers: number | undefined = undefined
          let returningUsers: number | undefined = undefined
          if (funnel.track_first_time_users && filteredSessionIds.length > 0) {
            const userTypes = await trackUserTypes(funnel.project_id, filteredSessionIds)
            firstTimeUsers = userTypes.firstTime
            returningUsers = userTypes.returning
          }

          stepResults.push({
            order: step.order,
            name: step.name,
            users: filteredCount,
            sessions: filteredCount,
            conversion_rate: conversionRate,
            drop_off_rate: dropOffRate,
            avg_time_to_complete: avgTimeToComplete,
            first_time_users: firstTimeUsers,
            returning_users: returningUsers,
            dropped_sessions: droppedSessions.length > 0 ? droppedSessions : undefined
          })

          previousStepSessions = filteredSet
          continue
        }

        // Track dropped sessions
        const droppedSessions: string[] = []
        if (!isFirstStep && previousStepSessions && previousStepSessions.size > 0) {
          const dropped = Array.from(previousStepSessions).filter(id => !currentStepSessions.has(id))
          droppedSessions.push(...dropped)
        }

        // Calculate conversion and drop-off rates
        const firstStepCount = stepResults[0]?.sessions || count
        const conversionRate = firstStepCount > 0 ? (count / firstStepCount) * 100 : 0
        
        // Calculate drop-off rate: % of users from previous step who didn't complete this step
        let dropOffRate = 0
        if (!isFirstStep && previousStepSessions && previousStepSessions.size > 0) {
          const previousCount = previousStepSessions.size
          const currentCount = count
          const droppedCount = previousCount - currentCount
          dropOffRate = (droppedCount / previousCount) * 100
          
          // Log for debugging
          console.log(`[Funnel] Step ${step.order} (${step.name}):`, {
            previousStepSessions: previousCount,
            currentStepSessions: currentCount,
            dropped: droppedCount,
            dropOffRate: dropOffRate.toFixed(2) + '%'
          })
        } else if (isFirstStep) {
          console.log(`[Funnel] Step ${step.order} (${step.name}): First step - no drop-off calculation`)
        } else {
          console.log(`[Funnel] Step ${step.order} (${step.name}): No previous step sessions`)
        }

        // Calculate average time to complete from previous step
        let avgTimeToComplete: number | undefined = undefined
        if (!isFirstStep && stepEvents[i - 1] && stepEvents[i]) {
          avgTimeToComplete = await calculateAverageTimeBetweenSteps(
            funnel.project_id,
            stepEvents[i - 1],
            stepEvents[i]
          )
        }

        // Track first-time vs returning users if enabled
        let firstTimeUsers: number | undefined = undefined
        let returningUsers: number | undefined = undefined
        if (funnel.track_first_time_users && Array.from(currentStepSessions).length > 0) {
          const userTypes = await trackUserTypes(funnel.project_id, Array.from(currentStepSessions))
          firstTimeUsers = userTypes.firstTime
          returningUsers = userTypes.returning
        }

        stepResults.push({
          order: step.order,
          name: step.name,
          users: count,
          sessions: count,
          conversion_rate: conversionRate,
          drop_off_rate: dropOffRate,
          avg_time_to_complete: avgTimeToComplete,
          first_time_users: firstTimeUsers,
          returning_users: returningUsers,
          dropped_sessions: droppedSessions.length > 0 ? droppedSessions : undefined
        })

        previousStepSessions = currentStepSessions
        continue
      }

      // Apply data filters
      if (step.condition.data) {
        for (const [key, value] of Object.entries(step.condition.data)) {
          query = query.eq(`data->>${key}`, value)
        }
      }

      // If not first step, filter by sessions that completed previous steps
      if (!isFirstStep && previousStepSessions && previousStepSessions.size > 0) {
        const sessionIds = Array.from(previousStepSessions)
        query = query.in('session_id', sessionIds)
      }

      const { data: events, error } = await query

      if (error) {
        console.error('Error querying events:', error)
        throw error
      }

      // Apply time window filter if set
      let filteredEvents = events || []
      if (timeWindowMs && !isFirstStep && previousStepSessions) {
        // For non-first steps, check if events occur within time window from previous step
        const previousStepEventList = stepEvents[i - 1] || []
        const currentStepEventList = events || []
        
        // Group by session and check time window
        const sessionStepTimes = new Map<string, { prev: number; curr: number }>()
        
        for (const event of previousStepEventList) {
          const sessionId = event.session_id
          const timestamp = new Date(event.timestamp).getTime()
          const existing = sessionStepTimes.get(sessionId)
          if (!existing || timestamp < existing.prev) {
            sessionStepTimes.set(sessionId, { prev: timestamp, curr: existing?.curr || Infinity })
          }
        }
        
        for (const event of currentStepEventList) {
          const sessionId = event.session_id
          const timestamp = new Date(event.timestamp).getTime()
          const existing = sessionStepTimes.get(sessionId)
          if (existing) {
            sessionStepTimes.set(sessionId, { prev: existing.prev, curr: Math.min(existing.curr, timestamp) })
          }
        }
        
        // Filter events where time between steps is within window
        filteredEvents = currentStepEventList.filter(event => {
          const sessionId = event.session_id
          const times = sessionStepTimes.get(sessionId)
          if (!times) return false
          const timeDiff = times.curr - times.prev
          return timeDiff >= 0 && timeDiff <= timeWindowMs
        })
      }
      
      // Store events for time calculations
      stepEvents.push(filteredEvents.map(e => ({ session_id: e.session_id, timestamp: e.timestamp })))

      // Get unique sessions for this step
      let sessionIds = filteredEvents.map(e => e.session_id) || []
      
      // Apply additional filters (country, device, app version)
      if (sessionIds.length > 0 && (countryFilter || deviceFilter || appVersionFilter)) {
        sessionIds = await applyAdditionalFilters(
          funnel.project_id,
          sessionIds,
          countryFilter,
          deviceFilter,
          appVersionFilter
        )
      }
      
      // Filter by platform and cohort if needed
      if ((platformFilter !== 'all' || cohortFilter) && sessionIds.length > 0) {
        // Get user_ids from events for these sessions
        const { data: eventsWithUsers } = await supabase
          .from('events')
          .select('session_id, user_id')
          .in('session_id', sessionIds)
          .eq('project_id', funnel.project_id)
          .not('user_id', 'is', null)
          .limit(5000) // Limit for performance
        
        // Get sessions for device_info fallback
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id, device_info')
          .in('id', sessionIds)
          .eq('project_id', funnel.project_id)
        
        // Group by session_id and get unique user_ids
        const sessionToUserMap = new Map<string, string>()
        eventsWithUsers?.forEach(e => {
          if (e.user_id && !sessionToUserMap.has(e.session_id)) {
            sessionToUserMap.set(e.session_id, e.user_id)
          }
        })
        
        // Get user properties for cohort filtering
        const userIds = Array.from(new Set(sessionToUserMap.values()))
        let userPropertiesMap = new Map<string, any>()
        
        if (userIds.length > 0) {
          const { data: userProps } = await supabase
            .from('user_properties')
            .select('user_id, platform, country, app_version, device_type, is_new_user, acquisition_source, properties')
            .eq('project_id', funnel.project_id)
            .in('user_id', userIds)
          
          userProps?.forEach(up => {
            userPropertiesMap.set(up.user_id, up)
          })
        }
        
        // Filter sessions based on platform and cohort
        const filteredSessionIds = sessionIds.filter(sessionId => {
          const userId = sessionToUserMap.get(sessionId)
          const userProps = userId ? userPropertiesMap.get(userId) : null
          const session = sessions?.find(s => s.id === sessionId)
          
          // Platform filter - prefer user_properties, fallback to device_info
          if (platformFilter !== 'all') {
            let detectedPlatform: 'web' | 'android' | 'ios' = 'web'
            if (userProps?.platform) {
              detectedPlatform = userProps.platform as any
            } else if (session) {
              detectedPlatform = detectPlatform(session.device_info)
            }
            if (detectedPlatform !== platformFilter) {
              return false
            }
          }
          
          // Cohort filters
          if (cohortFilter) {
            if (cohortFilter.is_new_user !== undefined && userProps) {
              if (userProps.is_new_user !== cohortFilter.is_new_user) {
                return false
              }
            }
            if (cohortFilter.acquisition_source && userProps) {
              if (userProps.acquisition_source !== cohortFilter.acquisition_source) {
                return false
              }
            }
            if (cohortFilter.custom_properties && userProps) {
              for (const [key, value] of Object.entries(cohortFilter.custom_properties)) {
                if (userProps.properties?.[key] !== value) {
                  return false
                }
              }
            }
          }
          
          return true
        })
        
        sessionIds = filteredSessionIds
      }
      
      const currentStepSessions = new Set(sessionIds)
      const count = currentStepSessions.size
      
      // Track dropped sessions (for session replay links)
      const droppedSessions: string[] = []
      if (!isFirstStep && previousStepSessions && previousStepSessions.size > 0) {
        const dropped = Array.from(previousStepSessions).filter(id => !currentStepSessions.has(id))
        droppedSessions.push(...dropped)
      }
      
      // Calculate platform breakdown if showing all platforms
      let platformBreakdown: { mobile: { users: number; sessions: number }; web: { users: number; sessions: number } } | undefined
      if (platformFilter === 'all' && sessionIds.length > 0) {
        // Get user properties for platform breakdown
        const { data: eventsWithUsers } = await supabase
          .from('events')
          .select('session_id, user_id')
          .in('session_id', sessionIds)
          .eq('project_id', funnel.project_id)
          .not('user_id', 'is', null)
          .limit(1000) // Limit for performance
        
        const userIds = Array.from(new Set(eventsWithUsers?.map(e => e.user_id).filter(Boolean) || []))
        
        if (userIds.length > 0) {
          const { data: userProps } = await supabase
            .from('user_properties')
            .select('user_id, platform')
            .eq('project_id', funnel.project_id)
            .in('user_id', userIds)
          
          const platformCounts = {
            web: new Set<string>(),
            android: new Set<string>(),
            ios: new Set<string>()
          }
          
          eventsWithUsers?.forEach(e => {
            if (e.user_id) {
              const userProp = userProps?.find(up => up.user_id === e.user_id)
              const platform = userProp?.platform || 'web'
              if (platform === 'web') platformCounts.web.add(e.session_id)
              else if (platform === 'android') platformCounts.android.add(e.session_id)
              else if (platform === 'ios') platformCounts.ios.add(e.session_id)
            }
          })
          
          platformBreakdown = {
            mobile: {
              users: platformCounts.android.size + platformCounts.ios.size,
              sessions: platformCounts.android.size + platformCounts.ios.size
            },
            web: {
              users: platformCounts.web.size,
              sessions: platformCounts.web.size
            }
          }
        }
      }
      
      // Legacy platform breakdown (for backward compatibility)
      if (platformFilter === 'all' && sessionIds.length > 0 && !platformBreakdown) {
        const { data: sessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('id, device_info')
          .in('id', sessionIds)
          .eq('project_id', funnel.project_id)
        
        if (!sessionsError && sessions) {
          const androidSessions = sessions.filter(s => detectPlatform(s.device_info) === 'android')
          const iosSessions = sessions.filter(s => detectPlatform(s.device_info) === 'ios')
          const webSessions = sessions.filter(s => detectPlatform(s.device_info) === 'web')
          
          platformBreakdown = {
            mobile: { users: androidSessions.length + iosSessions.length, sessions: androidSessions.length + iosSessions.length },
            web: { users: webSessions.length, sessions: webSessions.length }
          }
        }
      }

      // Calculate conversion and drop-off rates
      const firstStepCount = stepResults[0]?.sessions || count
      const conversionRate = firstStepCount > 0 ? (count / firstStepCount) * 100 : 0
      // Calculate drop-off rate: % of users from previous step who didn't complete this step
      let dropOffRate = 0
      if (!isFirstStep && previousStepSessions && previousStepSessions.size > 0) {
        const previousCount = previousStepSessions.size
        const currentCount = count
        const droppedCount = previousCount - currentCount
        dropOffRate = (droppedCount / previousCount) * 100
        
        // Log for debugging
        console.log(`[Funnel] Step ${step.order} (${step.name}):`, {
          previousStepSessions: previousCount,
          currentStepSessions: currentCount,
          dropped: droppedCount,
          dropOffRate: dropOffRate.toFixed(2) + '%'
        })
      } else if (isFirstStep) {
        console.log(`[Funnel] Step ${step.order} (${step.name}): First step - no drop-off calculation`)
      } else {
        console.log(`[Funnel] Step ${step.order} (${step.name}): No previous step sessions`)
      }

      // Calculate average time to complete from previous step
      let avgTimeToComplete: number | undefined = undefined
      if (!isFirstStep && stepEvents[i - 1] && stepEvents[i]) {
        avgTimeToComplete = await calculateAverageTimeBetweenSteps(
          funnel.project_id,
          stepEvents[i - 1],
          stepEvents[i]
        )
      }

      // Track first-time vs returning users if enabled
      let firstTimeUsers: number | undefined = undefined
      let returningUsers: number | undefined = undefined
      if (funnel.track_first_time_users && sessionIds.length > 0) {
        const userTypes = await trackUserTypes(funnel.project_id, Array.from(currentStepSessions))
        firstTimeUsers = userTypes.firstTime
        returningUsers = userTypes.returning
      }

      stepResults.push({
        order: step.order,
        name: step.name,
        users: count,
        sessions: count,
        conversion_rate: conversionRate,
        drop_off_rate: dropOffRate,
        avg_time_to_complete: avgTimeToComplete,
        first_time_users: firstTimeUsers,
        returning_users: returningUsers,
        platform_breakdown: platformBreakdown,
        dropped_sessions: droppedSessions.length > 0 ? droppedSessions : undefined
      })

      previousStepSessions = currentStepSessions
    }

    // Calculate overall conversion
    const totalUsers = stepResults[0]?.users || 0
    const finalStepUsers = stepResults[stepResults.length - 1]?.users || 0
    const overallConversion = totalUsers > 0 ? (finalStepUsers / totalUsers) * 100 : 0

    // Calculate first-time vs returning users overall
    let firstTimeUsersOverall: number | undefined = undefined
    let returningUsersOverall: number | undefined = undefined
    if (funnel.track_first_time_users && stepResults.length > 0 && stepEvents.length > 0) {
      const allSessionIds = Array.from(new Set(stepEvents[0]?.map(e => e.session_id) || []))
      if (allSessionIds.length > 0) {
        const userTypes = await trackUserTypes(funnel.project_id, allSessionIds)
        firstTimeUsersOverall = userTypes.firstTime
        returningUsersOverall = userTypes.returning
      }
    }

    const result: FunnelAnalysisResult = {
      funnel_id: funnelId,
      funnel_name: funnel.name,
      steps: stepResults,
      total_users: totalUsers,
      overall_conversion: overallConversion,
      first_time_users: firstTimeUsersOverall,
      returning_users: returningUsersOverall,
      time_window_hours: funnel.time_window_hours || undefined,
      date_range: {
        start: startDate,
        end: endDate
      }
    }
    
    // Calculate platform breakdown if showing all platforms (aggregate from step breakdowns)
    if (platformFilter === 'all' && stepResults.length > 0) {
      try {
        // Aggregate platform breakdown from step results
        const mobileSteps: StepResult[] = []
        const webSteps: StepResult[] = []
        
        stepResults.forEach(step => {
          if (step.platform_breakdown) {
            mobileSteps.push({
              ...step,
              users: step.platform_breakdown.mobile.users,
              sessions: step.platform_breakdown.mobile.sessions
            })
            webSteps.push({
              ...step,
              users: step.platform_breakdown.web.users,
              sessions: step.platform_breakdown.web.sessions
            })
          }
        })
        
        if (mobileSteps.length > 0 && webSteps.length > 0) {
          const mobileTotal = mobileSteps[0]?.users || 0
          const mobileFinal = mobileSteps[mobileSteps.length - 1]?.users || 0
          const mobileConversion = mobileTotal > 0 ? (mobileFinal / mobileTotal) * 100 : 0
          
          const webTotal = webSteps[0]?.users || 0
          const webFinal = webSteps[webSteps.length - 1]?.users || 0
          const webConversion = webTotal > 0 ? (webFinal / webTotal) * 100 : 0
          
          result.platform_breakdown = {
            mobile: {
              steps: mobileSteps,
              total_users: mobileTotal,
              overall_conversion: mobileConversion
            },
            web: {
              steps: webSteps,
              total_users: webTotal,
              overall_conversion: webConversion
            }
          }
        }
      } catch (error) {
        console.error('Error calculating platform breakdown:', error)
        // Continue without platform breakdown if it fails
      }
    }

    // Add geographic breakdown if requested
    if (includeGeography) {
      result.geographic_breakdown = await analyzeFunnelByGeography(
        funnelId,
        startDate,
        endDate,
        steps
      )
    }

    // Add field breakdown for form funnels
    if (funnel.is_form_funnel && funnel.form_url) {
      result.field_breakdown = await analyzeFormFieldBreakdown(
        funnel.project_id,
        funnel.form_url,
        startDate,
        endDate
      )
    }

    // Add trend over time if requested
    if (includeTrendOverTime) {
      result.trend_over_time = await calculateTrendOverTime(
        funnel.project_id,
        steps,
        startDate,
        endDate,
        'daily'
      )
    }

    return result
  } catch (error: any) {
    console.error('Error in analyzeFunnel:', error)
    throw error
  }
}

/**
 * Analyze funnel by geography (country/city)
 */
async function analyzeFunnelByGeography(
  funnelId: string,
  startDate: string,
  endDate: string,
  steps: FunnelStep[]
): Promise<FunnelAnalysisResult['geographic_breakdown']> {
  try {
    const funnel = await getFunnelById(funnelId)
    if (!funnel) {
      return { by_country: {}, by_city: {} }
    }

    // Get sessions with geographic data for this project
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, country, city')
      .eq('project_id', funnel.project_id)
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .not('country', 'is', null)

    if (!sessions || sessions.length === 0) {
      return { by_country: {}, by_city: {} }
    }

    // Group sessions by country and city
    const countrySessions: Record<string, Set<string>> = {}
    const citySessions: Record<string, Set<string>> = {}

    for (const session of sessions) {
      if (session.country) {
        if (!countrySessions[session.country]) {
          countrySessions[session.country] = new Set()
        }
        countrySessions[session.country].add(session.id)
      }

      if (session.city && session.country) {
        const key = `${session.city}, ${session.country}`
        if (!citySessions[key]) {
          citySessions[key] = new Set()
        }
        citySessions[key].add(session.id)
      }
    }

    // Analyze each country
    const byCountry: Record<string, any> = {}
    for (const [country, sessionIds] of Object.entries(countrySessions)) {
      const countrySteps: StepResult[] = []
      let previousStepSessions: Set<string> | null = null

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        const sessionIdArray = Array.from(sessionIds)

        // Query events for this step filtered by country sessions
        let query = supabase
          .from('events')
          .select('session_id')
          .eq('project_id', funnel.project_id)
          .in('session_id', sessionIdArray)
          .gte('timestamp', startDate)
          .lte('timestamp', endDate)

        if (step.condition.type === 'page_view') {
          query = query.eq('type', 'page_view')
        } else if (step.condition.type === 'event') {
          query = query.eq('type', step.condition.event_type)
        }

        if (step.condition.data) {
          for (const [key, value] of Object.entries(step.condition.data)) {
            query = query.eq(`data->>${key}`, value)
          }
        }

        if (i > 0 && previousStepSessions && previousStepSessions.size > 0) {
          query = query.in('session_id', Array.from(previousStepSessions))
        }

        const { data: events } = await query
        const currentStepSessions = new Set(events?.map(e => e.session_id) || [])
        const count = currentStepSessions.size

        const firstStepCount = countrySteps[0]?.sessions || count
        const conversionRate = firstStepCount > 0 ? (count / firstStepCount) * 100 : 0
        
        // Calculate drop-off rate: % of users from previous step who didn't complete this step
        let dropOffRate = 0
        if (i > 0 && previousStepSessions && previousStepSessions.size > 0) {
          const previousCount = previousStepSessions.size
          const currentCount = count
          const droppedCount = previousCount - currentCount
          dropOffRate = (droppedCount / previousCount) * 100
        }

        countrySteps.push({
          order: step.order,
          name: step.name,
          users: count,
          sessions: count,
          conversion_rate: conversionRate,
          drop_off_rate: dropOffRate
        })

        previousStepSessions = currentStepSessions
      }

      const totalUsers = countrySteps[0]?.users || 0
      const finalStepUsers = countrySteps[countrySteps.length - 1]?.users || 0
      const overallConversion = totalUsers > 0 ? (finalStepUsers / totalUsers) * 100 : 0

      byCountry[country] = {
        steps: countrySteps,
        total_users: totalUsers,
        overall_conversion: overallConversion
      }
    }

    // Analyze each city (simplified - similar logic)
    const byCity: Record<string, any> = {}
    for (const [city, sessionIds] of Object.entries(citySessions)) {
      // Similar analysis as country but for cities
      // For performance, we'll do a simplified version
      const citySteps: StepResult[] = []
      const sessionIdArray = Array.from(sessionIds)

      // Get first step count
      let query = supabase
        .from('events')
        .select('session_id', { count: 'exact' })
        .eq('project_id', funnel.project_id)
        .in('session_id', sessionIdArray)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)

      if (steps[0].condition.type === 'page_view') {
        query = query.eq('type', 'page_view')
      }

      const { count } = await query

      byCity[city] = {
        steps: citySteps,
        total_users: count || 0,
        overall_conversion: 0
      }
    }

    return {
      by_country: byCountry,
      by_city: byCity
    }
  } catch (error) {
    console.error('Error in analyzeFunnelByGeography:', error)
    return { by_country: {}, by_city: {} }
  }
}

/**
 * Analyze form field breakdown
 */
async function analyzeFormFieldBreakdown(
  projectId: string,
  formUrl: string,
  startDate: string,
  endDate: string
): Promise<FunnelAnalysisResult['field_breakdown']> {
  // Get all form field events for this form
  const { data: formEvents } = await supabase
    .from('form_field_events')
    .select('field_name, action, session_id')
    .eq('project_id', projectId)
    .gte('timestamp', startDate)
    .lte('timestamp', endDate)

  if (!formEvents || formEvents.length === 0) {
    return {}
  }

  // Get sessions with geographic data for breakdown
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, country, city')
    .in('id', [...new Set(formEvents.map(e => e.session_id))])

  const sessionGeoMap = new Map(
    sessions?.map(s => [s.id, { country: s.country, city: s.city }]) || []
  )

  // Group by field name
  const fieldStats: Record<string, any> = {}

  for (const event of formEvents) {
    if (!fieldStats[event.field_name]) {
      fieldStats[event.field_name] = {
        started: new Set(),
        completed: new Set(),
        skipped: new Set(),
        abandoned: new Set(),
        drop_off_by_location: {}
      }
    }

    const stats = fieldStats[event.field_name]
    const geo = sessionGeoMap.get(event.session_id)

    if (event.action === 'focus') {
      stats.started.add(event.session_id)
    } else if (event.action === 'blur' || event.action === 'change') {
      stats.completed.add(event.session_id)
    } else if (event.action === 'skip') {
      stats.skipped.add(event.session_id)
    } else if (event.action === 'abandon') {
      stats.abandoned.add(event.session_id)
    }

    // Track drop-off by location
    if (geo?.country) {
      if (!stats.drop_off_by_location[geo.country]) {
        stats.drop_off_by_location[geo.country] = 0
      }
      if (event.action === 'abandon' || event.action === 'skip') {
        stats.drop_off_by_location[geo.country]++
      }
    }
  }

  // Convert Sets to counts and calculate rates
  const breakdown: FunnelAnalysisResult['field_breakdown'] = {}
  for (const [fieldName, stats] of Object.entries(fieldStats)) {
    const started = stats.started.size
    const completed = stats.completed.size
    const skipped = stats.skipped.size
    const abandoned = stats.abandoned.size

    breakdown[fieldName] = {
      started,
      completed,
      skipped,
      abandoned,
      completion_rate: started > 0 ? (completed / started) * 100 : 0,
      drop_off_by_location: stats.drop_off_by_location
    }
  }

  return breakdown
}

