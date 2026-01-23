import { useState, useEffect } from 'react'
import { Plus, Trash2, Copy, Check, ChevronDown, ChevronUp, Code, Activity, ExternalLink, Power, PowerOff } from 'lucide-react'
import { projectsAPI, sessionsAPI } from '../../services/api'
import '../../components/dashboard/Dashboard.css'

// Get API URL - use tunnel URL if in local development, otherwise use production URL
const getApiUrl = (): string => {
  // Check if we have a backend tunnel URL (cloudflared or ngrok)
  const backendTunnelUrl = import.meta.env.VITE_BACKEND_TUNNEL_URL
  
  // Check if we're in local development
  const isLocalhost = typeof window !== 'undefined' && 
                     (window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1')
  
  if (isLocalhost && backendTunnelUrl) {
    // Local development with tunnel - use tunnel URL so live websites can access it
    return backendTunnelUrl
  }
  
  // Check if VITE_API_URL is explicitly set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // Auto-detect production backend based on current hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    
    // Auto-detect backend for Vercel deployments
    if (hostname.includes('ux-analytical-tool') && hostname.includes('.vercel.app')) {
      return 'https://ux-analytical-tool-gzsn.vercel.app'
    }
    
    // If we're on localhost, use local backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001'
    }
  }
  
  // Default fallback
  return 'https://ux-analytical-tool-gzsn.vercel.app'
}

const API_URL = getApiUrl()

interface Project {
  id: string
  name: string
  description: string
  sdk_key: string
  platform: string
  created_at: string
  is_active?: boolean
}

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({})
  const [checkingStatus, setCheckingStatus] = useState<Record<string, boolean>>({})
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    platform: 'all' // Default to 'all', can be 'all', 'web', or 'mobile'
  })

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    // Check session counts for all projects
    if (projects.length > 0) {
      checkSessionStatuses()
    }
  }, [projects])

  const checkSessionStatuses = async () => {
    for (const project of projects) {
      try {
        const response = await sessionsAPI.getByProject(project.id, {
          limit: 1,
          start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours
        })
        // Use total_unfiltered or total to show all sessions, not just replayable ones
        setSessionCounts(prev => ({
          ...prev,
          [project.id]: response.total_unfiltered || response.total || response.count || 0
        }))
      } catch (error: any) {
        // Only log non-abort errors (abort errors are expected when component unmounts or requests are cancelled)
        if (error?.name !== 'AbortError' && error?.message !== 'signal is aborted without reason') {
          // Also ignore 404 errors (project might not exist or have no sessions)
          if (!error?.message?.includes('404') && !error?.message?.includes('not found')) {
            console.error(`Error checking sessions for project ${project.id}:`, error)
          }
        }
        setSessionCounts(prev => ({
          ...prev,
          [project.id]: 0
        }))
      }
    }
  }

  const checkInstallationStatus = async (projectId: string) => {
    setCheckingStatus(prev => ({ ...prev, [projectId]: true }))
    try {
      const response = await sessionsAPI.getByProject(projectId, {
        limit: 10,
        start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours
      })
      setSessionCounts(prev => ({
        ...prev,
        [projectId]: response.count || 0
      }))
    } catch (error) {
      console.error('Error checking installation status:', error)
    } finally {
      setCheckingStatus(prev => ({ ...prev, [projectId]: false }))
    }
  }

  const loadProjects = async () => {
    try {
      setLoading(true)
      console.log('📥 Loading projects from API...')
      
      // Add timeout for projects loading (15 seconds)
      const projectsPromise = projectsAPI.getAll()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000) // 15 second timeout
      )
      
      const response = await Promise.race([projectsPromise, timeoutPromise]) as any
      console.log('📊 API Response:', response)
      console.log('📊 Response type:', typeof response)
      console.log('📊 Response.projects:', response.projects)
      console.log('📊 Response.projects type:', typeof response.projects)
      console.log('📊 Response.projects length:', response.projects?.length ?? 'N/A')
      
      const projectsList = response.projects || []
      console.log('✅ Setting projects:', projectsList.length, 'projects')
      setProjects(projectsList)
      
      if (projectsList.length === 0) {
        console.warn('⚠️ No projects returned from API, but response was successful')
        console.warn('⚠️ Full response:', JSON.stringify(response, null, 2))
      }
    } catch (error: any) {
      console.error('❌ Error loading projects:', error)
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      
      // Don't show alert for timeout - just log and show empty state
      if (!error.message?.includes('timeout')) {
        alert('Failed to load projects: ' + error.message)
      } else {
        console.warn('⚠️ Projects loading timed out - showing empty state')
      }
      
      // Set empty array so UI doesn't hang
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await projectsAPI.create(formData)
      setProjects([response.project, ...projects])
      setShowCreateModal(false)
      setFormData({ name: '', description: '', platform: 'all' })
    } catch (error: any) {
      console.error('Error creating project:', error)
      // Show more detailed error message
      const errorMessage = error.message || 'Unknown error occurred'
      alert(`Failed to create project: ${errorMessage}\n\nCheck browser console for more details.`)
    }
  }

  const handleToggleActive = async (id: string) => {
    try {
      console.log('Toggling project status for:', id)
      const response = await projectsAPI.toggleActive(id)
      console.log('Toggle response:', response)
      setProjects(projects.map(p => 
        p.id === id ? { ...p, is_active: response.project.is_active } : p
      ))
    } catch (error: any) {
      console.error('Error toggling project status:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      alert('Failed to toggle project status: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return
    
    try {
      // First, verify the project exists
      try {
        await projectsAPI.getById(id)
      } catch (verifyError: any) {
        // If project doesn't exist, just refresh the list
        if (verifyError.message?.includes('not found') || verifyError.message?.includes('404')) {
          console.log('Project not found, refreshing list...')
          await loadProjects()
          return
        }
      }
      
      // Project exists, proceed with deletion
      await projectsAPI.delete(id)
      // Refresh projects list to get updated data from server
      await loadProjects()
    } catch (error: any) {
      console.error('Error deleting project:', error)
      // Check if it's a 404 (project not found) - might already be deleted
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        // Project might already be deleted, refresh the list
        console.log('Project not found (404), refreshing list...')
        await loadProjects()
      } else {
        alert('Failed to delete project: ' + (error.message || 'Unknown error'))
      }
    }
  }

  const copySDKKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const getApiUrl = (): string => {
    // Check if VITE_API_URL is explicitly set
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL
    }
    
    // Check if we have a backend tunnel URL (for local development)
    const backendTunnelUrl = import.meta.env.VITE_BACKEND_TUNNEL_URL
    const isLocalhost = typeof window !== 'undefined' && 
                       (window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1')
    
    if (isLocalhost && backendTunnelUrl) {
      return backendTunnelUrl
    }
    
    // Auto-detect production backend based on current hostname
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      
      // Auto-detect backend for Vercel deployments
      if (hostname.includes('ux-analytical-tool') && hostname.includes('.vercel.app')) {
        return 'https://ux-analytical-tool-gzsn.vercel.app'
      }
    }
    
    // Default fallback
    return API_URL || 'http://localhost:3001'
  }

  const getSdkFileUrl = (): string => {
    const isProduction = typeof window !== 'undefined' && 
                        window.location.hostname !== 'localhost' && 
                        window.location.hostname !== '127.0.0.1'
    
    if (isProduction) {
      // In production, SDK is served from the same origin (Vercel)
      return typeof window !== 'undefined' 
        ? `${window.location.origin}/uxcam-sdk-rrweb.js`
        : import.meta.env.VITE_FRONTEND_URL || 'https://your-app.vercel.app/uxcam-sdk-rrweb.js'
    } else {
      // Development: Check for tunnel URLs or use localhost
      const cloudflareUrl = import.meta.env.VITE_CLOUDFLARE_TUNNEL_URL || ''
      const ngrokUrl = import.meta.env.VITE_NGROK_URL || ''
      
      if (cloudflareUrl) {
        return `${cloudflareUrl}/uxcam-sdk-rrweb.js`
      } else if (ngrokUrl) {
        return `${ngrokUrl}/uxcam-sdk-rrweb.js`
      } else {
        return 'http://localhost:5173/uxcam-sdk-rrweb.js'
      }
    }
  }

  const getWebIntegrationCode = (sdkKey: string): string => {
    const apiUrl = getApiUrl()
    const sdkFileUrl = getSdkFileUrl()
    // Add static cache-busting version to force browser to reload SDK
    const sdkFileUrlWithVersion = `${sdkFileUrl}?v=2.1.0`
    
    return `<!-- UXCam Analytics SDK - Web (JavaScript) -->
<!-- Copy and paste this code into the <head> section of your HTML -->
<!-- IMPORTANT: Clear browser cache (Ctrl+Shift+Delete) if you see old URLs in console -->

<!-- Load rrweb for visual session replay -->
<script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>

<!-- UXCam SDK Configuration - MUST be set BEFORE SDK loads -->
<script>
  window.UXCamSDK = {
    key: '${sdkKey}',
    apiUrl: '${apiUrl}',
    debug: true  // Enable debug logging to see what API URL is being used
  };
  console.log('UXCam SDK Config:', window.UXCamSDK);
</script>

<!-- Load UXCam SDK with cache-busting -->
<script src="${sdkFileUrlWithVersion}" async></script>`
  }

  const getAndroidIntegrationCode = (sdkKey: string): string => {
    const apiUrl = getApiUrl()
    // sdkKey is used in the template string below
    
    return `// Simple UXCam SDK for Android
// 1. Add to build.gradle: implementation 'com.squareup.okhttp3:okhttp:4.12.0'
// 2. Add permission: <uses-permission android:name="android.permission.INTERNET" />

import android.app.Application
import okhttp3.*
import org.json.JSONObject
import java.util.*

class UXCamSDK {
    companion object {
        private var sdkKey: String? = null
        private const val API_URL = "${apiUrl}"
        private var sessionId = "sess_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().take(8)
        private val client = OkHttpClient()
        
        // Initialize with your SDK key (get it from dashboard)
        fun initialize(context: Application, sdkKey: String) {
            this.sdkKey = sdkKey
            // SDK ready!
        }
        
        fun trackEvent(eventType: String, properties: Map<String, Any> = emptyMap()) {
            val key = sdkKey ?: return  // Need to initialize first!
            
            val event = JSONObject().apply {
                put("type", eventType)
                put("timestamp", java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }.format(Date()))
                put("data", JSONObject(properties as Map<*, *>))
            }
            
            val payload = JSONObject().apply {
                put("sdk_key", key)
                put("session_id", sessionId)
                put("events", org.json.JSONArray().apply { put(event) })
            }
            
            val request = Request.Builder()
                .url("$\{API_URL}/api/events/ingest")
                .post(payload.toString().toRequestBody("application/json".toMediaType()))
                .build()
            
            client.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: java.io.IOException) {}
                override fun onResponse(call: Call, response: Response) { response.close() }
            })
        }
    }
}

// Usage:
// UXCamSDK.initialize(this, "${sdkKey}")  // ← Pass your SDK key here
// UXCamSDK.trackEvent("button_click", mapOf("button_id" to "signup"))`
  }

  const getIOSIntegrationCode = (sdkKey: string): string => {
    const apiUrl = getApiUrl()
    // sdkKey is used in the template string below
    
    return `// Simple UXCam SDK for iOS
// No dependencies needed - uses built-in URLSession

import Foundation

class UXCamSDK {
    static let shared = UXCamSDK()
    private var sdkKey: String?
    private let apiUrl = "${apiUrl}"
    private var sessionId = "sess_\\(Int64(Date().timeIntervalSince1970 * 1000))_\\(UUID().uuidString.prefix(8))"
    
    private init() {
        self.sdkKey = nil
    }
    
    // Initialize with your SDK key (get it from dashboard)
    func initialize(sdkKey: String) {
        self.sdkKey = sdkKey
        // SDK ready!
    }
    
    func trackEvent(_ eventType: String, properties: [String: Any] = [:]) {
        guard let key = sdkKey else { return }  // Need to initialize first!
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        let payload: [String: Any] = [
            "sdk_key": key,
            "session_id": sessionId,
            "events": [[
                "type": eventType,
                "timestamp": formatter.string(from: Date()),
                "data": properties
            ]]
        ]
        
        guard let url = URL(string: "\\(apiUrl)/api/events/ingest"),
              let body = try? JSONSerialization.data(withJSONObject: payload) else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        
        URLSession.shared.dataTask(with: request).resume()
    }
}

// Usage:
// UXCamSDK.shared.initialize(sdkKey: "${sdkKey}")  // ← Pass your SDK key here
// UXCamSDK.shared.trackEvent("button_click", properties: ["button_id": "signup"])`
  }

  const getIntegrationCode = (sdkKey: string, platform: string): { web?: string; android?: string; ios?: string } => {
    const codes: { web?: string; android?: string; ios?: string } = {}
    
    if (platform === 'web' || platform === 'all') {
      codes.web = getWebIntegrationCode(sdkKey)
    }
    
    if (platform === 'mobile' || platform === 'all') {
      codes.android = getAndroidIntegrationCode(sdkKey)
      codes.ios = getIOSIntegrationCode(sdkKey)
    }
    
    return codes
  }

  const [activeCodeTab, setActiveCodeTab] = useState<Record<string, 'web' | 'android' | 'ios'>>({})

  const copyIntegrationCode = (sdkKey: string, platform: string, codeType?: 'web' | 'android' | 'ios') => {
    const codes = getIntegrationCode(sdkKey, platform)
    let codeToCopy = ''
    
    if (codeType) {
      codeToCopy = codes[codeType] || ''
    } else {
      // Copy all codes if no specific type
      if (codes.web) codeToCopy += codes.web + '\n\n'
      if (codes.android) codeToCopy += codes.android + '\n\n'
      if (codes.ios) codeToCopy += codes.ios
    }
    
    navigator.clipboard.writeText(codeToCopy.trim())
    setCopiedCode(sdkKey)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const getDefaultTab = (platform: string): 'web' | 'android' | 'ios' => {
    if (platform === 'web') return 'web'
    if (platform === 'mobile') return 'android'
    return 'web' // default for 'all'
  }

  const toggleIntegration = (projectId: string) => {
    setExpandedIntegration(expandedIntegration === projectId ? null : projectId)
  }

  if (loading) {
    return (
      <div className="dashboard-page-content">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '2px solid #9333ea', 
            borderTop: 'transparent', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#4b5563' }}>Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p style={{ color: '#4b5563', marginTop: '0.5rem' }}>
            Manage your analytics projects and get SDK keys for integration
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="icon-small" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="empty-state">
          <h3>No projects yet</h3>
          <p>Create your first project to start tracking user analytics</p>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)} style={{ marginTop: '1rem' }}>
            <Plus className="icon-small" />
            <span>Create Project</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {projects.map((project) => (
            <div key={project.id} className="stats-card" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                      {project.name}
                    </h3>
                    {project.is_active === false && (
                      <span style={{ 
                        fontSize: '0.625rem', 
                        padding: '0.125rem 0.375rem', 
                        backgroundColor: '#fee2e2', 
                        color: '#dc2626', 
                        borderRadius: '4px',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        Inactive
                      </span>
                    )}
                  </div>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.25rem 0.5rem', 
                    backgroundColor: '#f3e8ff', 
                    color: '#9333ea', 
                    borderRadius: '4px',
                    fontWeight: '500'
                  }}>
                    {project.platform === 'all' ? 'All Platforms' : 
                     project.platform === 'web' ? 'Web' : 
                     project.platform === 'mobile' ? 'Mobile' : 
                     project.platform}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="icon-button"
                    onClick={() => handleToggleActive(project.id)}
                    title={project.is_active === false ? 'Activate Project' : 'Deactivate Project'}
                    style={{ 
                      color: project.is_active === false ? '#6b7280' : '#9333ea' 
                    }}
                  >
                    {project.is_active === false ? (
                      <Power className="icon-small" />
                    ) : (
                      <PowerOff className="icon-small" />
                    )}
                  </button>
                  <button 
                    className="icon-button"
                    onClick={() => handleDelete(project.id)}
                    title="Delete"
                  >
                    <Trash2 className="icon-small" />
                  </button>
                </div>
              </div>

              {project.description && (
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                  {project.description}
                </p>
              )}

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.5rem' }}>
                  SDK Key
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <code style={{ 
                    flex: 1, 
                    fontSize: '0.75rem', 
                    padding: '0.5rem', 
                    backgroundColor: '#f9fafb', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {project.sdk_key}
                  </code>
                  <button
                    className="icon-button"
                    onClick={() => copySDKKey(project.sdk_key)}
                    title="Copy SDK Key"
                  >
                    {copiedKey === project.sdk_key ? (
                      <Check className="icon-small" style={{ color: '#16a34a' }} />
                    ) : (
                      <Copy className="icon-small" />
                    )}
                  </button>
                </div>
              </div>

              {/* Installation Status Section */}
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity className="icon-small" style={{ width: '14px', height: '14px' }} />
                    Installation Status
                  </label>
                  <button
                    onClick={() => checkInstallationStatus(project.id)}
                    disabled={checkingStatus[project.id]}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'transparent',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      color: '#6b7280',
                      cursor: checkingStatus[project.id] ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                    title="Check if SDK is working on your website"
                  >
                    {checkingStatus[project.id] ? 'Checking...' : 'Refresh'}
                  </button>
                </div>
                
                {sessionCounts[project.id] !== undefined && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: sessionCounts[project.id] > 0 ? '#f0fdf4' : '#fffbeb',
                    border: `1px solid ${sessionCounts[project.id] > 0 ? '#86efac' : '#fde68a'}`,
                    borderRadius: '6px',
                    fontSize: '0.75rem'
                  }}>
                    {sessionCounts[project.id] > 0 ? (
                      <div style={{ color: '#166534' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <Check className="icon-small" style={{ width: '16px', height: '16px', color: '#16a34a' }} />
                          <strong>✅ SDK is working!</strong>
                        </div>
                        <p style={{ margin: 0, color: '#166534' }}>
                          <strong>{sessionCounts[project.id]}</strong> session{sessionCounts[project.id] !== 1 ? 's' : ''} recorded in the last 24 hours.
                        </p>
                        <a
                          href={`/dashboard/sessions?project=${project.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            marginTop: '0.5rem',
                            color: '#166534',
                            fontWeight: '600',
                            textDecoration: 'none'
                          }}
                        >
                          View Sessions <ExternalLink className="icon-small" style={{ width: '12px', height: '12px' }} />
                        </a>
                      </div>
                    ) : (
                      <div style={{ color: '#92400e' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1rem' }}>⏳</span>
                          <strong>No sessions yet</strong>
                        </div>
                        <p style={{ margin: 0, color: '#92400e', lineHeight: '1.5' }}>
                          After adding the SDK code to your website, visit your site and interact with it. Sessions will appear here within a few minutes.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Integration Guide Section */}
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => toggleIntegration(project.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Code className="icon-small" style={{ color: '#9333ea' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                      Integration Guide
                    </span>
                  </div>
                  {expandedIntegration === project.id ? (
                    <ChevronUp className="icon-small" style={{ color: '#6b7280' }} />
                  ) : (
                    <ChevronDown className="icon-small" style={{ color: '#6b7280' }} />
                  )}
                </button>

                {expandedIntegration === project.id && (() => {
                  const codes = getIntegrationCode(project.sdk_key, project.platform)
                  const currentTab = activeCodeTab[project.id] || getDefaultTab(project.platform)
                  const hasMultipleTabs = project.platform === 'all'
                  
                  return (
                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                      {/* Tabs for multiple platforms */}
                      {hasMultipleTabs && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                          {codes.web && (
                            <button
                              onClick={() => setActiveCodeTab({ ...activeCodeTab, [project.id]: 'web' })}
                              style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: currentTab === 'web' ? '#9333ea' : 'transparent',
                                color: currentTab === 'web' ? '#fff' : '#6b7280',
                                border: 'none',
                                borderBottom: currentTab === 'web' ? '2px solid #9333ea' : '2px solid transparent',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: currentTab === 'web' ? '600' : '400',
                                borderRadius: '4px 4px 0 0'
                              }}
                            >
                              Web (JavaScript)
                            </button>
                          )}
                          {codes.android && (
                            <button
                              onClick={() => setActiveCodeTab({ ...activeCodeTab, [project.id]: 'android' })}
                              style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: currentTab === 'android' ? '#9333ea' : 'transparent',
                                color: currentTab === 'android' ? '#fff' : '#6b7280',
                                border: 'none',
                                borderBottom: currentTab === 'android' ? '2px solid #9333ea' : '2px solid transparent',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: currentTab === 'android' ? '600' : '400',
                                borderRadius: '4px 4px 0 0'
                              }}
                            >
                              Android (Kotlin)
                            </button>
                          )}
                          {codes.ios && (
                            <button
                              onClick={() => setActiveCodeTab({ ...activeCodeTab, [project.id]: 'ios' })}
                              style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: currentTab === 'ios' ? '#9333ea' : 'transparent',
                                color: currentTab === 'ios' ? '#fff' : '#6b7280',
                                border: 'none',
                                borderBottom: currentTab === 'ios' ? '2px solid #9333ea' : '2px solid transparent',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: currentTab === 'ios' ? '600' : '400',
                                borderRadius: '4px 4px 0 0'
                              }}
                            >
                              iOS (Swift)
                            </button>
                          )}
                        </div>
                      )}

                      {/* Code Display */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', display: 'block' }}>
                            {project.platform === 'web' ? 'Web Integration Code' :
                             project.platform === 'mobile' ? 'Mobile Integration Code' :
                             `${currentTab === 'web' ? 'Web' : currentTab === 'android' ? 'Android' : 'iOS'} Integration Code`}
                          </label>
                          <button
                            onClick={() => copyIntegrationCode(project.sdk_key, project.platform, hasMultipleTabs ? currentTab : undefined)}
                            className="btn-primary"
                            style={{ 
                              fontSize: '0.75rem',
                              padding: '0.375rem 0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.375rem'
                            }}
                          >
                            {copiedCode === project.sdk_key ? (
                              <>
                                <Check className="icon-small" style={{ width: '14px', height: '14px' }} />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="icon-small" style={{ width: '14px', height: '14px' }} />
                                Copy Code
                              </>
                            )}
                          </button>
                        </div>
                        <pre style={{
                          fontSize: '0.75rem',
                          padding: '0.75rem',
                          backgroundColor: '#1f2937',
                          color: '#f9fafb',
                          borderRadius: '6px',
                          overflow: 'auto',
                          maxHeight: '400px',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          margin: 0
                        }}>
                          {codes[currentTab] || 'No code available'}
                        </pre>
                      </div>

                      {/* Platform-specific Instructions */}
                      {currentTab === 'web' && (
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                            Add to your website
                          </label>
                          <div style={{ fontSize: '0.75rem', color: '#4b5563', lineHeight: '1.5' }}>
                            <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
                              <li style={{ marginBottom: '0.5rem' }}>Paste the code into the <code style={{ backgroundColor: '#e5e7eb', padding: '0.125rem 0.25rem', borderRadius: '3px' }}>&lt;head&gt;</code> section of your HTML pages</li>
                              <li style={{ marginBottom: '0.5rem' }}><strong>Works on any website:</strong> HTML, React, Vue, Angular, Next.js, WordPress, Shopify, etc.</li>
                              <li style={{ marginBottom: '0.5rem' }}>Make sure it's added to every page where you want to track user behavior</li>
                              <li>Open your website and check the browser console to verify the SDK is loaded</li>
                            </ol>
                          </div>
                        </div>
                      )}

                      {(currentTab === 'android' || currentTab === 'ios') && (
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                            Add to your {currentTab === 'android' ? 'Android' : 'iOS'} app
                          </label>
                          <div style={{ fontSize: '0.75rem', color: '#4b5563', lineHeight: '1.5' }}>
                            <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
                              <li style={{ marginBottom: '0.5rem' }}>Copy the code above and create a new file in your {currentTab === 'android' ? 'Android' : 'iOS'} project</li>
                              <li style={{ marginBottom: '0.5rem' }}>Follow the step-by-step instructions in the code comments</li>
                              <li style={{ marginBottom: '0.5rem' }}>Initialize the SDK in your app's entry point (Application class for Android, AppDelegate for iOS)</li>
                              <li>Use the <code style={{ backgroundColor: '#e5e7eb', padding: '0.125rem 0.25rem', borderRadius: '3px' }}>trackEvent()</code> method to track user interactions</li>
                            </ol>
                          </div>
                        </div>
                      )}

                      {/* Help Text */}
                      <div style={{ 
                        marginTop: '1rem', 
                        padding: '0.75rem', 
                        backgroundColor: '#f9fafb', 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: '#374151'
                      }}>
                        <strong>💡 Important:</strong>
                        <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', lineHeight: '1.6' }}>
                          <li>All platforms use the <strong>same SDK key</strong>: <code style={{ backgroundColor: '#e5e7eb', padding: '0.125rem 0.25rem', borderRadius: '3px' }}>{project.sdk_key}</code></li>
                          <li>For <strong>Web + Mobile</strong> projects, use the appropriate SDK code for each platform</li>
                          <li>Native mobile SDKs use <strong>event-only tracking</strong> (no visual recording)</li>
                          <li>Web SDK includes <strong>visual session replay</strong> using DOM snapshots</li>
                        </ul>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                Created {new Date(project.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>Create New Project</h2>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Set up a new analytics project
                </p>
              </div>
              <button className="icon-button" onClick={() => setShowCreateModal(false)}>
                <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="modal-body">
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Awesome App"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Platform Type</label>
                <select
                  className="form-select"
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                >
                  <option value="all">All Platforms (Web + Mobile)</option>
                  <option value="web">Web Only</option>
                  <option value="mobile">Mobile App Only</option>
                </select>
                <small style={{ 
                  display: 'block', 
                  marginTop: '0.5rem', 
                  color: '#6b7280', 
                  fontSize: '0.875rem',
                  lineHeight: '1.25rem',
                  fontStyle: 'italic'
                }}>
                  <strong>Note:</strong> Platform is for organization/labeling only. Session platform is auto-detected from device info (viewport width, user agent). The same user accessing your app on mobile and web will be counted as a single user across platforms.
                </small>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

