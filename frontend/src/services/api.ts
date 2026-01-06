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
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
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
  getOverview: (projectId: string, params?: { start_date?: string; end_date?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.start_date) queryParams.append('start_date', params.start_date)
    if (params?.end_date) queryParams.append('end_date', params.end_date)
    
    const query = queryParams.toString()
    return apiRequest(`/api/analytics/${projectId}/overview${query ? `?${query}` : ''}`)
  },
}

// Snapshots API
export const snapshotsAPI = {
  getBySession: (projectId: string, sessionId: string) =>
    apiRequest(`/api/sessions/${projectId}/${sessionId}`), // Use sessions endpoint which returns snapshots
}

