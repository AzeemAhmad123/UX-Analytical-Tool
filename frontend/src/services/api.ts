import { supabase } from '../config/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Get auth token for API requests
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

// API request helper
async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = await getAuthToken()
  
  // Build headers object with proper typing
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = `${API_URL}${endpoint}`
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error', message: 'Failed to parse error response' }))
      // Use message if available, otherwise use error, otherwise use status
      const errorMessage = error.message || error.error || `HTTP error! status: ${response.status}`
      throw new Error(errorMessage)
    }

    return response.json()
  } catch (error: any) {
    // Enhanced error handling for network issues
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      console.error('Network error:', {
        url,
        method: options.method || 'GET',
        apiUrl: API_URL,
        endpoint,
        error: error.message
      })
      throw new Error(`Cannot connect to backend server at ${API_URL}. Please check if the server is running.`)
    }
    throw error
  }
}

// Projects API
export const projectsAPI = {
  getAll: () => apiRequest('/api/projects'),
  getById: (id: string) => apiRequest(`/api/projects/${id}`),
  create: (data: { name: string; description?: string; platform?: string }) =>
    apiRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { name?: string; description?: string; platform?: string }) =>
    apiRequest(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest(`/api/projects/${id}`, {
      method: 'DELETE',
    }),
  toggleActive: (id: string) =>
    apiRequest(`/api/projects/${id}/toggle-active`, {
      method: 'PATCH',
    }),
}

// Sessions API
export const sessionsAPI = {
  getByProject: (projectId: string, params?: { limit?: number; offset?: number; start_date?: string; end_date?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.start_date) queryParams.append('start_date', params.start_date)
    if (params?.end_date) queryParams.append('end_date', params.end_date)
    
    const query = queryParams.toString()
    return apiRequest(`/api/sessions/${projectId}${query ? `?${query}` : ''}`)
  },
  getById: (projectId: string, sessionId: string) =>
    apiRequest(`/api/sessions/${projectId}/${sessionId}`),
  delete: (projectId: string, sessionId: string) =>
    apiRequest(`/api/sessions/${projectId}/${sessionId}`, {
      method: 'DELETE',
    }),
  deleteMultiple: (projectId: string, sessionIds: string[]) =>
    apiRequest(`/api/sessions/${projectId}`, {
      method: 'DELETE',
      body: JSON.stringify({ sessionIds }),
    }),
}

// Events API
export const eventsAPI = {
  getByProject: (projectId: string, params?: { limit?: number; offset?: number; type?: string; start_date?: string; end_date?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.type) queryParams.append('type', params.type)
    if (params?.start_date) queryParams.append('start_date', params.start_date)
    if (params?.end_date) queryParams.append('end_date', params.end_date)
    
    const query = queryParams.toString()
    return apiRequest(`/api/events/${projectId}${query ? `?${query}` : ''}`)
  },
  ingest: (data: { sdk_key: string; session_id: string; events: any[]; device_info?: any; user_properties?: any }) =>
    apiRequest('/api/events/ingest', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// Analytics API
export const analyticsAPI = {
  getOverview: (projectId: string, params?: { 
    start_date?: string
    end_date?: string
    platform_filter?: 'all' | 'mobile' | 'web'
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.start_date) queryParams.append('start_date', params.start_date)
    if (params?.end_date) queryParams.append('end_date', params.end_date)
    if (params?.platform_filter) queryParams.append('platform_filter', params.platform_filter)
    
    const query = queryParams.toString()
    return apiRequest(`/api/analytics/${projectId}/overview${query ? `?${query}` : ''}`)
  },
  getOverviewDetailed: (projectId: string, params?: { 
    start_date?: string
    end_date?: string
    platform_filter?: 'all' | 'mobile' | 'web'
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.start_date) queryParams.append('start_date', params.start_date)
    if (params?.end_date) queryParams.append('end_date', params.end_date)
    if (params?.platform_filter) queryParams.append('platform_filter', params.platform_filter)
    
    const query = queryParams.toString()
    return apiRequest(`/api/analytics/${projectId}/overview-detailed${query ? `?${query}` : ''}`)
  },
}

// Snapshots API
export const snapshotsAPI = {
  getBySession: (projectId: string, sessionId: string) =>
    apiRequest(`/api/sessions/${projectId}/${sessionId}`), // Use sessions endpoint which returns snapshots
}

// Funnels API
export const funnelsAPI = {
  getAll: (projectId: string) =>
    apiRequest(`/api/funnels/${projectId}`),
  getById: (projectId: string, funnelId: string) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}`),
  create: (projectId: string, data: {
    name: string
    description?: string
    steps: Array<{
      order: number
      name: string
      condition: {
        type: 'event' | 'page_view' | 'form_field' | 'custom'
        event_type?: string
        field_name?: string
        form_id?: string
        data?: Record<string, any>
      }
    }>
    is_form_funnel?: boolean
    form_url?: string
    time_window_hours?: number
    track_first_time_users?: boolean
  }) =>
    apiRequest(`/api/funnels/${projectId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (projectId: string, funnelId: string, data: {
    name?: string
    description?: string
    steps?: Array<any>
    is_form_funnel?: boolean
    form_url?: string
    time_window_hours?: number
    track_first_time_users?: boolean
    calculation_mode?: 'sessions' | 'users'
  }) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (projectId: string, funnelId: string) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}`, {
      method: 'DELETE',
    }),
  analyze: (projectId: string, funnelId: string, params?: {
    start_date?: string
    end_date?: string
    include_geography?: boolean
    include_trend_over_time?: boolean
    force_recalculate?: boolean
    platform_filter?: 'all' | 'web' | 'android' | 'ios'
    country_filter?: string
    device_filter?: string
    app_version_filter?: string
    cohort_filter?: {
      is_new_user?: boolean
      acquisition_source?: string
    }
  }) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}/analyze`, {
      method: 'POST',
      body: JSON.stringify(params || {}),
    }),
  trackFormField: (projectId: string, data: {
    session_id: string
    form_id: string
    field_name: string
    field_type?: string
    action: 'focus' | 'blur' | 'change' | 'submit' | 'skip' | 'abandon'
    value?: string
  }) =>
    apiRequest(`/api/funnels/${projectId}/form-field-events`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  exportCSV: async (projectId: string, funnelId: string, params?: {
    start_date?: string
    end_date?: string
    platform_filter?: 'all' | 'web' | 'android' | 'ios' | 'mobile'
    country_filter?: string
    device_filter?: string
    app_version_filter?: string
  }): Promise<Blob> => {
    const token = await getAuthToken()
    const headers: Record<string, string> = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    }
    
    const response = await fetch(`${API_URL}/api/funnels/${projectId}/${funnelId}/export/csv`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params || {}),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.message || error.error || `HTTP error! status: ${response.status}`)
    }
    
    return response.blob()
  },
  getShareableLink: (projectId: string, funnelId: string, params?: {
    start_date?: string
    end_date?: string
    platform_filter?: 'all' | 'mobile' | 'web'
    country_filter?: string
    device_filter?: string
    app_version_filter?: string
  }) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}/share-link`, {
      method: 'POST',
      body: JSON.stringify(params || {}),
    }),
}

// Alerts API
export const alertsAPI = {
  getAll: (projectId: string, funnelId: string) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}/alerts`),
  create: (projectId: string, funnelId: string, data: any) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}/alerts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (projectId: string, funnelId: string, alertId: string, data: any) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}/alerts/${alertId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (projectId: string, funnelId: string, alertId: string) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}/alerts/${alertId}`, {
      method: 'DELETE',
    }),
  getHistory: (projectId: string, funnelId: string, limit?: number) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}/alerts/history${limit ? `?limit=${limit}` : ''}`),
  check: (projectId: string, funnelId: string) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}/alerts/check`, {
      method: 'POST',
    }),
}

// Privacy API
export const privacyAPI = {
  getSettings: (projectId: string) =>
    apiRequest(`/api/projects/${projectId}/privacy`),
  updateSettings: (projectId: string, data: any) =>
    apiRequest(`/api/projects/${projectId}/privacy`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  recordConsent: (projectId: string, data: any) =>
    apiRequest(`/api/projects/${projectId}/privacy/consent`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  checkConsent: (projectId: string, sessionId: string, consentType?: string) =>
    apiRequest(`/api/projects/${projectId}/privacy/consent?session_id=${sessionId}${consentType ? `&consent_type=${consentType}` : ''}`),
  getConsentHistory: (projectId: string, limit?: number) =>
    apiRequest(`/api/projects/${projectId}/privacy/consent/history${limit ? `?limit=${limit}` : ''}`),
}

// Anomalies API
export const anomaliesAPI = {
  detect: (projectId: string, funnelId: string, config?: {
    baseline_days?: number
    deviation_threshold?: number
    min_users_for_detection?: number
  }) =>
    apiRequest(`/api/funnel-anomalies/${projectId}/${funnelId}/detect`, {
      method: 'POST',
      body: JSON.stringify(config || {}),
    }),
  getAll: (projectId: string, funnelId: string, options?: {
    status?: 'open' | 'investigating' | 'resolved' | 'false_positive'
    severity?: 'low' | 'medium' | 'high' | 'critical'
    limit?: number
  }) => {
    const params = new URLSearchParams()
    if (options?.status) params.append('status', options.status)
    if (options?.severity) params.append('severity', options.severity)
    if (options?.limit) params.append('limit', options.limit.toString())
    return apiRequest(`/api/funnel-anomalies/${projectId}/${funnelId}${params.toString() ? `?${params.toString()}` : ''}`)
  },
  updateStatus: (projectId: string, anomalyId: string, status: 'open' | 'investigating' | 'resolved' | 'false_positive') =>
    apiRequest(`/api/funnel-anomalies/${projectId}/${anomalyId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  getStats: (projectId: string) =>
    apiRequest(`/api/funnel-anomalies/${projectId}/stats`),
}

// Advanced Analytics API
export const advancedAnalyticsAPI = {
  // Rage Clicks
  detectRageClicks: (projectId: string, sessionId: string, clickEvents: any[]) =>
    apiRequest(`/api/advanced-analytics/${projectId}/rage-clicks/detect`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, click_events: clickEvents }),
    }),
  detectDeadTaps: (projectId: string, sessionId: string, tapEvents: any[]) =>
    apiRequest(`/api/advanced-analytics/${projectId}/dead-taps/detect`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, tap_events: tapEvents }),
    }),
  getSessionRageClicks: (projectId: string, sessionId: string) =>
    apiRequest(`/api/advanced-analytics/${projectId}/rage-clicks/session/${sessionId}`),
  getRageClicksSummary: (projectId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    return apiRequest(`/api/advanced-analytics/${projectId}/rage-clicks/summary${params.toString() ? `?${params.toString()}` : ''}`)
  },
  getDeadTaps: (projectId: string, params?: { start_date?: string; end_date?: string; page_url?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.start_date) queryParams.append('start_date', params.start_date)
    if (params?.end_date) queryParams.append('end_date', params.end_date)
    if (params?.page_url) queryParams.append('page_url', params.page_url)
    return apiRequest(`/api/advanced-analytics/${projectId}/dead-taps${queryParams.toString() ? `?${queryParams.toString()}` : ''}`)
  },
  
  // Heatmaps
  generateHeatmap: (projectId: string, data: {
    page_url: string
    heatmap_type: 'click' | 'scroll' | 'move' | 'attention'
    start_date: string
    end_date: string
    viewport_width?: number
    viewport_height?: number
  }) =>
    apiRequest(`/api/advanced-analytics/${projectId}/heatmaps/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getHeatmaps: (projectId: string, pageUrl?: string) => {
    const params = new URLSearchParams()
    if (pageUrl) params.append('page_url', pageUrl)
    return apiRequest(`/api/advanced-analytics/${projectId}/heatmaps${params.toString() ? `?${params.toString()}` : ''}`)
  },
  
  // Performance
  recordPerformanceMetric: (projectId: string, data: {
    session_id: string
    page_url: string
    metric_type: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP'
    value: number
    device_type?: string
    connection_type?: string
    metadata?: any
  }) =>
    apiRequest(`/api/advanced-analytics/${projectId}/performance/record`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPerformanceSummary: (projectId: string, startDate?: string, endDate?: string, pageUrl?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    if (pageUrl) params.append('page_url', pageUrl)
    return apiRequest(`/api/advanced-analytics/${projectId}/performance/summary${params.toString() ? `?${params.toString()}` : ''}`)
  },
  getPerformanceTrends: (projectId: string, metricType: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP', startDate: string, endDate: string, granularity?: 'daily' | 'weekly') => {
    const params = new URLSearchParams()
    params.append('metric_type', metricType)
    params.append('start_date', startDate)
    params.append('end_date', endDate)
    if (granularity) params.append('granularity', granularity)
    return apiRequest(`/api/advanced-analytics/${projectId}/performance/trends?${params.toString()}`)
  },
  
  // User Segmentation
  getSegments: (projectId: string) =>
    apiRequest(`/api/advanced-analytics/${projectId}/segments`),
  createSegment: (projectId: string, data: {
    name: string
    description?: string
    conditions: Array<{
      field: string
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
      value: any
    }>
  }) =>
    apiRequest(`/api/advanced-analytics/${projectId}/segments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSegment: (projectId: string, segmentId: string, data: any) =>
    apiRequest(`/api/advanced-analytics/${projectId}/segments/${segmentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSegment: (projectId: string, segmentId: string) =>
    apiRequest(`/api/advanced-analytics/${projectId}/segments/${segmentId}`, {
      method: 'DELETE',
    }),
  refreshSegment: (projectId: string, segmentId: string) =>
    apiRequest(`/api/advanced-analytics/${projectId}/segments/${segmentId}/refresh`, {
      method: 'POST',
    }),
}

// Share Links API
export const shareLinksAPI = {
  create: (projectId: string, funnelId: string, data: {
    expires_in_days?: number
    max_views?: number
    password?: string
    start_date?: string
    end_date?: string
    platform_filter?: 'all' | 'mobile' | 'web'
    country_filter?: string
    device_filter?: string
    app_version_filter?: string
  }) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}/share`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getAll: (projectId: string, funnelId: string) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}/share-links`),
  revoke: (projectId: string, funnelId: string, shareLinkId: string) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}/share-links/${shareLinkId}/revoke`, {
      method: 'PATCH',
    }),
  delete: (projectId: string, funnelId: string, shareLinkId: string) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}/share-links/${shareLinkId}`, {
      method: 'DELETE',
    }),
}

// Scheduled Reports API
export const scheduledReportsAPI = {
  getAll: (projectId: string, funnelId: string) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}/scheduled-reports`),
  create: (projectId: string, funnelId: string, data: {
    name: string
    schedule_type: 'daily' | 'weekly' | 'monthly'
    schedule_config?: {
      day_of_week?: number
      day_of_month?: number
      time?: string
      timezone?: string
    }
    recipients: string[]
    report_format?: 'html' | 'pdf' | 'csv'
    include_charts?: boolean
    report_params?: {
      start_date?: string
      end_date?: string
      platform_filter?: 'all' | 'mobile' | 'web'
      country_filter?: string
      device_filter?: string
      app_version_filter?: string
    }
  }) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}/scheduled-reports`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (projectId: string, funnelId: string, reportId: string, data: any) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}/scheduled-reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (projectId: string, funnelId: string, reportId: string) =>
    apiRequest(`/api/funnels/${projectId}/${funnelId}/scheduled-reports/${reportId}`, {
      method: 'DELETE',
    }),
}

