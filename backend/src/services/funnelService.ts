import { supabase } from '../config/supabase'

/**
 * Detect platform from session device_info
 */
function detectPlatform(deviceInfo: any): 'mobile' | 'web' {
  if (!deviceInfo) return 'web'
  
  const viewportWidth = deviceInfo.viewportWidth || deviceInfo.screenWidth || 0
  const userAgent = deviceInfo.userAgent || ''
  
  // Check viewport width first
  if (viewportWidth > 0 && viewportWidth < 768) {
    return 'mobile'
  }
  
  // Check user agent as fallback
  if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
    return 'mobile'
  }
  
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
  avg_time_to_complete?: number // milliseconds
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
  dropped_sessions?: string[]
}

export interface FunnelAnalysisResult {
  funnel_id: string
  funnel_name: string
  steps: StepResult[]
  total_users: number
  overall_conversion: number // % who completed all steps
  date_range: {
    start: string
    end: string
  }
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
  platformFilter: 'all' | 'mobile' | 'web' = 'all'
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

        // Get unique sessions for this step
        const currentStepSessions = new Set(formEvents?.map(e => e.session_id) || [])
        const count = currentStepSessions.size

        // Calculate conversion and drop-off rates
        const firstStepCount = stepResults[0]?.sessions || count
        const conversionRate = firstStepCount > 0 ? (count / firstStepCount) * 100 : 0
        const dropOffRate = previousStepSessions && previousStepSessions.size > 0
          ? ((previousStepSessions.size - count) / previousStepSessions.size) * 100
          : 0

        stepResults.push({
          order: step.order,
          name: step.name,
          users: count,
          sessions: count,
          conversion_rate: conversionRate,
          drop_off_rate: dropOffRate
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

      // Get unique sessions for this step
      let sessionIds = events?.map(e => e.session_id) || []
      
      // Filter by platform if needed
      if (platformFilter !== 'all' && sessionIds.length > 0) {
        // Fetch sessions to check their platform
        const { data: sessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('id, device_info')
          .in('id', sessionIds)
          .eq('project_id', funnel.project_id)
        
        if (sessionsError) {
          console.error('Error fetching sessions for platform filter:', sessionsError)
        } else {
          // Filter sessions by platform
          const filteredSessionIds = sessions
            ?.filter(s => detectPlatform(s.device_info) === platformFilter)
            .map(s => s.id) || []
          sessionIds = filteredSessionIds
        }
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
        const { data: sessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('id, device_info')
          .in('id', sessionIds)
          .eq('project_id', funnel.project_id)
        
        if (!sessionsError && sessions) {
          const mobileSessions = sessions.filter(s => detectPlatform(s.device_info) === 'mobile')
          const webSessions = sessions.filter(s => detectPlatform(s.device_info) === 'web')
          
          platformBreakdown = {
            mobile: { users: mobileSessions.length, sessions: mobileSessions.length },
            web: { users: webSessions.length, sessions: webSessions.length }
          }
        }
      }

      // Calculate conversion and drop-off rates
      const firstStepCount = stepResults[0]?.sessions || count
      const conversionRate = firstStepCount > 0 ? (count / firstStepCount) * 100 : 0
      const dropOffRate = previousStepSessions && previousStepSessions.size > 0
        ? ((previousStepSessions.size - count) / previousStepSessions.size) * 100
        : 0

      stepResults.push({
        order: step.order,
        name: step.name,
        users: count,
        sessions: count,
        conversion_rate: conversionRate,
        drop_off_rate: dropOffRate,
        platform_breakdown: platformBreakdown,
        dropped_sessions: droppedSessions.length > 0 ? droppedSessions : undefined
      })

      previousStepSessions = currentStepSessions
    }

    // Calculate overall conversion
    const totalUsers = stepResults[0]?.users || 0
    const finalStepUsers = stepResults[stepResults.length - 1]?.users || 0
    const overallConversion = totalUsers > 0 ? (finalStepUsers / totalUsers) * 100 : 0

    const result: FunnelAnalysisResult = {
      funnel_id: funnelId,
      funnel_name: funnel.name,
      steps: stepResults,
      total_users: totalUsers,
      overall_conversion: overallConversion,
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
        const dropOffRate = previousStepSessions && previousStepSessions.size > 0
          ? ((previousStepSessions.size - count) / previousStepSessions.size) * 100
          : 0

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

