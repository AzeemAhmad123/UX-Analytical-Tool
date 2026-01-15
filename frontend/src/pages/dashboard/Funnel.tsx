/**
 * Enhanced Funnel Detail Page
 * UXCam/Hotjar-style professional UI with all Phase 2-5 features integrated
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Plus, Filter, Play, Edit2, Trash2, X, Monitor, Smartphone, 
  Download, ChevronRight, AlertTriangle, TrendingDown, 
  Zap, Flame, BarChart3, Bell, Link as LinkIcon, Mail, 
  Eye, ArrowLeft
} from 'lucide-react'
import { 
  funnelsAPI, projectsAPI, anomaliesAPI, advancedAnalyticsAPI, 
  alertsAPI, shareLinksAPI, scheduledReportsAPI, sessionsAPI
} from '../../services/api'
import { FunnelBuilder } from '../../components/funnel/FunnelBuilder'
import { FunnelChart } from '../../components/funnel/FunnelChart'
import { GeographicBreakdown } from '../../components/funnel/GeographicBreakdown'
import '../../components/dashboard/Dashboard.css'
import './Funnel.css'

type PlatformFilter = 'all' | 'web' | 'android' | 'ios'
type TabType = 'overview' | 'anomalies' | 'dropoff' | 'performance'

interface Funnel {
  id: string
  name: string
  description?: string
  steps: any[]
  is_form_funnel: boolean
  form_url?: string
  time_window_hours?: number
  track_first_time_users?: boolean
  calculation_mode?: 'sessions' | 'users'
  created_at: string
}

export function Funnel() {
  const [searchParams] = useSearchParams()
  
  // Core state
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  
  // Filter state
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [segmentFilter, setSegmentFilter] = useState<string>('')
  const [countryFilter, setCountryFilter] = useState<string>('')
  const [deviceFilter, setDeviceFilter] = useState<string>('')
  const [appVersionFilter, setAppVersionFilter] = useState<string>('')
  const [isNewUserFilter, setIsNewUserFilter] = useState<boolean | undefined>(undefined)
  const [acquisitionSourceFilter, setAcquisitionSourceFilter] = useState<string>('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [includeGeography, setIncludeGeography] = useState(false)
  const [includeTrendOverTime] = useState(true)
  
  // Date range - Default to last 30 days, but will auto-adjust if events are in future
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  
  // Auto-detect date range from events when project is selected (non-blocking)
  useEffect(() => {
    // Don't block initial load - run this in background
    const autoDetectDateRange = async () => {
      if (!selectedProject) return
      try {
        // Use a smaller limit and timeout to avoid blocking
        const response = await Promise.race([
          sessionsAPI.getByProject(selectedProject, { limit: 5 }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
        ]) as any
        
        const sessions = response?.sessions || response?.data || []
        
        if (sessions.length > 0) {
          const sortedSessions = [...sessions].sort((a, b) => {
            const dateA = new Date(a.start_time || a.startTime || a.created_at).getTime()
            const dateB = new Date(b.start_time || b.startTime || b.created_at).getTime()
            return dateB - dateA
          })
          
          const latestSession = sortedSessions[0]
          const sessionDate = new Date(latestSession.start_time || latestSession.startTime || latestSession.created_at)
          const today = new Date()
          
          const sessionYear = sessionDate.getFullYear()
          const todayYear = today.getFullYear()
          const isDifferentYear = sessionYear !== todayYear
          const isFuture = sessionDate > new Date(today.getTime() + 24 * 60 * 60 * 1000)
          
          const defaultStart = new Date(dateRange.start)
          const defaultEnd = new Date(dateRange.end)
          const sessionInRange = sessionDate >= defaultStart && sessionDate <= defaultEnd
          
          if (isDifferentYear || isFuture || !sessionInRange) {
            const eventYear = sessionDate.getFullYear()
            const eventMonth = sessionDate.getMonth()
            const eventDay = sessionDate.getDate()
            
            const newStartDate = `${eventYear}-${String(eventMonth + 1).padStart(2, '0')}-${String(eventDay).padStart(2, '0')}`
            const nextDay = new Date(sessionDate)
            nextDay.setDate(nextDay.getDate() + 1)
            const newEndDate = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`
            
            setDateRange({
              start: newStartDate,
              end: newEndDate
            })
          }
        }
      } catch (error) {
        // Silently fail - don't block UI
        console.debug('Auto-detect date range failed (non-critical):', error)
      }
    }
    
    // Run in background after initial load
    setTimeout(() => {
      autoDetectDateRange()
    }, 500)
  }, [selectedProject])
  
  // Sidebar data
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [shareLinks, setShareLinks] = useState<any[]>([])
  const [scheduledReports, setScheduledReports] = useState<any[]>([])
  const [segments, setSegments] = useState<any[]>([])
  const [heatmaps, setHeatmaps] = useState<any[]>([])
  const [rageClicks, setRageClicks] = useState<any[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<any[]>([])
  const [, setLoadingSidebar] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadFunnels()
      loadSegments()
    }
  }, [selectedProject])

  // Restore funnel from URL params
  useEffect(() => {
    const funnelIdFromUrl = searchParams.get('funnelId')
    if (funnelIdFromUrl && funnels.length > 0 && !selectedFunnel) {
      const funnel = funnels.find(f => f.id === funnelIdFromUrl)
      if (funnel) {
        setSelectedFunnel(funnel)
      }
    }
  }, [funnels, searchParams, selectedFunnel])

  // Auto-analyze when funnel is restored from URL
  useEffect(() => {
    const funnelIdFromUrl = searchParams.get('funnelId')
    if (funnelIdFromUrl && selectedFunnel && selectedFunnel.id === funnelIdFromUrl && !analysisResult && selectedProject) {
      // Trigger analysis for restored funnel
      const analyze = async () => {
        try {
          setAnalyzing(true)
          const start = new Date(dateRange.start)
          const end = new Date(dateRange.end)
          const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          const shouldIncludeTrend = includeTrendOverTime && daysDiff <= 30
          
          const response = await funnelsAPI.analyze(selectedProject, selectedFunnel.id, {
            start_date: new Date(dateRange.start).toISOString(),
            end_date: new Date(dateRange.end + 'T23:59:59').toISOString(),
            include_geography: includeGeography,
            include_trend_over_time: shouldIncludeTrend,
            platform_filter: platformFilter,
            country_filter: countryFilter || undefined,
            device_filter: deviceFilter || undefined,
            app_version_filter: appVersionFilter || undefined,
            cohort_filter: {
              is_new_user: isNewUserFilter,
              acquisition_source: acquisitionSourceFilter || undefined
            }
          })
          setAnalysisResult(response)
        } catch (error: any) {
          console.error('Error analyzing funnel:', error)
        } finally {
          setAnalyzing(false)
        }
      }
      analyze()
    }
  }, [selectedFunnel, searchParams, analysisResult, selectedProject])

  useEffect(() => {
    if (selectedFunnel && selectedProject) {
      loadSidebarData()
      if (analysisResult) {
        loadAnomalies()
      }
    }
  }, [selectedFunnel, selectedProject, analysisResult])

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll()
      const projectsList = response.projects || []
      setProjects(projectsList)
      // Prefer active projects, but allow selecting inactive ones
      const activeProjects = projectsList.filter((p: any) => p.is_active !== false)
      if (activeProjects.length > 0) {
        setSelectedProject(activeProjects[0].id)
      } else if (projectsList.length > 0) {
        setSelectedProject(projectsList[0].id)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFunnels = async () => {
    if (!selectedProject) return
    try {
      const response = await funnelsAPI.getAll(selectedProject)
      setFunnels(response.funnels || [])
    } catch (error) {
      console.error('Error loading funnels:', error)
    }
  }

  const loadSegments = async () => {
    if (!selectedProject) return
    try {
      const response = await advancedAnalyticsAPI.getSegments(selectedProject)
      setSegments(response.segments || [])
    } catch (error) {
      console.error('Error loading segments:', error)
    }
  }

  const loadAnomalies = async () => {
    if (!selectedProject || !selectedFunnel) return
    try {
      const response = await anomaliesAPI.getAll(selectedProject, selectedFunnel.id, { limit: 10 })
      setAnomalies(response.anomalies || [])
    } catch (error) {
      console.error('Error loading anomalies:', error)
    }
  }

  const loadSidebarData = async () => {
    if (!selectedProject || !selectedFunnel) return
    setLoadingSidebar(true)
    try {
      // Load all sidebar data in parallel for much faster loading
      const startDate = new Date(dateRange.start).toISOString()
      const endDate = new Date(dateRange.end + 'T23:59:59').toISOString()
      
      const [
        alertsRes,
        linksRes,
        reportsRes,
        heatmapsRes,
        rageRes,
        perfRes
      ] = await Promise.allSettled([
        alertsAPI.getAll(selectedProject, selectedFunnel.id),
        shareLinksAPI.getAll(selectedProject, selectedFunnel.id),
        scheduledReportsAPI.getAll(selectedProject, selectedFunnel.id),
        advancedAnalyticsAPI.getHeatmaps(selectedProject),
        advancedAnalyticsAPI.getRageClicksSummary(selectedProject, startDate, endDate),
        advancedAnalyticsAPI.getPerformanceSummary(selectedProject, startDate, endDate)
      ])

      // Process results (handle both success and failure)
      if (alertsRes.status === 'fulfilled') {
        setAlerts(alertsRes.value.alerts || [])
      } else {
        console.error('Error loading alerts:', alertsRes.reason)
      }

      if (linksRes.status === 'fulfilled') {
        setShareLinks(linksRes.value.share_links || [])
      } else {
        console.error('Error loading share links:', linksRes.reason)
      }

      if (reportsRes.status === 'fulfilled') {
        setScheduledReports(reportsRes.value.reports || [])
      } else {
        console.error('Error loading scheduled reports:', reportsRes.reason)
      }

      if (heatmapsRes.status === 'fulfilled') {
        setHeatmaps(heatmapsRes.value.heatmaps || [])
      } else {
        console.error('Error loading heatmaps:', heatmapsRes.reason)
      }

      if (rageRes.status === 'fulfilled') {
        setRageClicks(rageRes.value.rage_clicks || [])
      } else {
        console.error('Error loading rage clicks:', rageRes.reason)
      }

      if (perfRes.status === 'fulfilled') {
        // Backend returns: { success: true, summary: { metrics: [...], by_page: [...] } }
        const response = perfRes.value
        const summary = response?.summary || {}
        const metricsData = summary.metrics || []
        const byPageData = summary.by_page || []
        
        console.log('[Performance] API Response:', {
          hasSummary: !!summary,
          metricsCount: metricsData.length,
          byPageCount: byPageData.length,
          metricsData,
          byPageData
        })
        
        // Process metrics array (from summary.metrics)
        const metrics = metricsData.map((metric: any) => ({
          metric_type: metric.metric_type || 'UNKNOWN',
          average_value: typeof metric.average === 'number' ? metric.average : 0,
          rating: metric.rating || 'good'
        }))
        
        // Process by_page data (from summary.by_page)
        const byPageMetrics = byPageData.flatMap((page: any) => {
          if (!page.metrics || typeof page.metrics !== 'object') return []
          
          return Object.entries(page.metrics).map(([metric_type, value]: [string, any]) => ({
            metric_type: `${metric_type}_BY_PAGE`,
            average_value: typeof value === 'number' ? value : 0,
            rating: 'good',
            page_url: page.page_url
          }))
        })
        
        // Combine both types of metrics
        const allMetrics = [...metrics, ...byPageMetrics]
        console.log('[Performance] Processed metrics:', allMetrics)
        
        if (allMetrics.length === 0) {
          console.warn('[Performance] No performance metrics found. This could mean:')
          console.warn('  1. No performance data has been recorded yet')
          console.warn('  2. Performance metrics need to be sent from the SDK')
          console.warn('  3. Date range might not contain any performance data')
        }
        
        setPerformanceMetrics(allMetrics)
      } else {
        console.error('[Performance] Error loading performance metrics:', perfRes.reason)
        setPerformanceMetrics([])
      }
    } finally {
      setLoadingSidebar(false)
    }
  }

  const handleCreateFunnel = async (funnelData: any) => {
    if (!selectedProject) return
    try {
      await funnelsAPI.create(selectedProject, funnelData)
      await loadFunnels()
      setShowBuilder(false)
      setEditingFunnel(null)
    } catch (error: any) {
      console.error('Error creating funnel:', error)
      alert('Failed to create funnel: ' + error.message)
    }
  }

  const handleUpdateFunnel = async (funnelData: any) => {
    if (!selectedProject || !editingFunnel) return
    try {
      await funnelsAPI.update(selectedProject, editingFunnel.id, funnelData)
      await loadFunnels()
      setShowBuilder(false)
      setEditingFunnel(null)
      if (selectedFunnel?.id === editingFunnel.id) {
        setSelectedFunnel(null)
        setAnalysisResult(null)
      }
    } catch (error: any) {
      console.error('Error updating funnel:', error)
      alert('Failed to update funnel: ' + error.message)
    }
  }

  const handleDeleteFunnel = async (funnelId: string) => {
    if (!selectedProject) return
    if (!confirm('Are you sure you want to delete this funnel?')) return
    try {
      await funnelsAPI.delete(selectedProject, funnelId)
      await loadFunnels()
      if (selectedFunnel?.id === funnelId) {
        setSelectedFunnel(null)
        setAnalysisResult(null)
      }
    } catch (error: any) {
      console.error('Error deleting funnel:', error)
      alert('Failed to delete funnel: ' + error.message)
    }
  }

  const handleAnalyzeFunnel = async (funnel: Funnel) => {
    if (!selectedProject) return
    try {
      setAnalyzing(true)
      
      // Calculate date range in days to optimize trend calculation
      const start = new Date(dateRange.start)
      const end = new Date(dateRange.end)
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      
      // Only include trend over time if date range is reasonable (30 days or less)
      // For larger ranges, it's too slow - user can enable it manually if needed
      const shouldIncludeTrend = includeTrendOverTime && daysDiff <= 30
      
      const response = await funnelsAPI.analyze(selectedProject, funnel.id, {
        start_date: new Date(dateRange.start).toISOString(),
        end_date: new Date(dateRange.end + 'T23:59:59').toISOString(),
        include_geography: includeGeography,
        include_trend_over_time: shouldIncludeTrend, // Optimized: only for small date ranges
        platform_filter: platformFilter,
        country_filter: countryFilter || undefined,
        device_filter: deviceFilter || undefined,
        app_version_filter: appVersionFilter || undefined,
        cohort_filter: {
          is_new_user: isNewUserFilter,
          acquisition_source: acquisitionSourceFilter || undefined
        }
      })
      setAnalysisResult(response)
      setSelectedFunnel(funnel)
      setActiveTab('overview')
    } catch (error: any) {
      console.error('Error analyzing funnel:', error)
      alert('Failed to analyze funnel: ' + error.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const getActiveFilters = () => {
    const filters: Array<{key: string, label: string}> = []
    if (platformFilter !== 'all') filters.push({key: 'platform', label: `Platform: ${platformFilter}`})
    if (segmentFilter) {
      const segment = segments.find(s => s.id === segmentFilter)
      if (segment) filters.push({key: 'segment', label: `Segment: ${segment.name}`})
    }
    if (countryFilter) filters.push({key: 'country', label: `Country: ${countryFilter}`})
    if (deviceFilter) filters.push({key: 'device', label: `Device: ${deviceFilter}`})
    if (appVersionFilter) filters.push({key: 'appVersion', label: `App Version: ${appVersionFilter}`})
    if (isNewUserFilter !== undefined) filters.push({key: 'userType', label: `User Type: ${isNewUserFilter ? 'New' : 'Returning'}`})
    if (acquisitionSourceFilter) filters.push({key: 'acquisitionSource', label: `Source: ${acquisitionSourceFilter}`})
    return filters
  }

  const removeFilter = (filterKey: string) => {
    switch (filterKey) {
      case 'platform':
        setPlatformFilter('all')
        break
      case 'segment':
        setSegmentFilter('')
        break
      case 'country':
        setCountryFilter('')
        break
      case 'device':
        setDeviceFilter('')
        break
      case 'appVersion':
        setAppVersionFilter('')
        break
      case 'userType':
        setIsNewUserFilter(undefined)
        break
      case 'acquisitionSource':
        setAcquisitionSourceFilter('')
        break
    }
  }

  const clearAllFilters = () => {
    setPlatformFilter('all')
    setSegmentFilter('')
    setCountryFilter('')
    setDeviceFilter('')
    setAppVersionFilter('')
    setIsNewUserFilter(undefined)
    setAcquisitionSourceFilter('')
  }

  if (loading) {
    return (
      <div className="dashboard-page-content">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (showBuilder) {
    return (
      <div className="dashboard-page-content">
        <div className="funnel-builder-header">
          <button
            onClick={() => {
              setShowBuilder(false)
              setEditingFunnel(null)
            }}
            className="btn-back"
          >
            <ArrowLeft size={16} />
            Back to Funnels
          </button>
        </div>
        <FunnelBuilder
          onSave={editingFunnel ? handleUpdateFunnel : handleCreateFunnel}
          onCancel={() => {
            setShowBuilder(false)
            setEditingFunnel(null)
          }}
          initialData={editingFunnel ? {
            name: editingFunnel.name,
            description: editingFunnel.description,
            steps: editingFunnel.steps,
            is_form_funnel: editingFunnel.is_form_funnel,
            form_url: editingFunnel.form_url,
            time_window_hours: editingFunnel.time_window_hours,
            track_first_time_users: editingFunnel.track_first_time_users
          } : undefined}
        />
      </div>
    )
  }

  // Render funnel list view
  if (!selectedFunnel) {
    return (
      <div className="dashboard-page-content">
        <div className="funnel-page-header">
          <div>
            <h1 className="page-title">Funnel Analysis</h1>
            <p className="page-subtitle">Measure conversions and learn why users drop off</p>
          </div>
          <button
            onClick={() => setShowBuilder(true)}
            className="btn-primary"
          >
            <Plus size={16} />
            Create Funnel
          </button>
        </div>

        {projects.length > 0 && (
          <div className="project-selector">
            <label>Project</label>
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="form-select"
            >
              {projects
                .filter((p: any) => p.is_active !== false)
                .map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              {projects.some((p: any) => p.is_active === false) && (
                <optgroup label="Inactive Projects">
                  {projects
                    .filter((p: any) => p.is_active === false)
                    .map(project => (
                      <option key={project.id} value={project.id} style={{ color: '#9ca3af' }}>
                        {project.name} (Inactive)
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>
        )}

        <div className="funnels-list-section">
          <h2 className="section-title">Your Funnels</h2>
          {funnels.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <h3>No funnels created yet</h3>
              <p>Click "Create Funnel" to get started</p>
              <button
                onClick={() => setShowBuilder(true)}
                className="btn-primary"
              >
                <Plus size={16} />
                Create Funnel
              </button>
            </div>
          ) : (
            <div className="funnels-grid">
              {funnels.map(funnel => (
                <div
                  key={funnel.id}
                  className="funnel-card"
                  onClick={() => handleAnalyzeFunnel(funnel)}
                >
                  <div className="funnel-card-header">
                    <h3>{funnel.name}</h3>
                    <div className="funnel-card-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingFunnel(funnel)
                          setShowBuilder(true)
                        }}
                        className="icon-button"
                        title="Edit funnel"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteFunnel(funnel.id)
                        }}
                        className="icon-button danger"
                        title="Delete funnel"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="funnel-card-body">
                    {funnel.description && (
                      <p className="funnel-description">{funnel.description}</p>
                    )}
                    <div className="funnel-meta">
                      <span>{funnel.steps.length} steps</span>
                      {funnel.is_form_funnel && <span>• Form Funnel</span>}
                      {funnel.time_window_hours && (
                        <span>• {funnel.time_window_hours}h window</span>
                      )}
                    </div>
                  </div>
                  <div className="funnel-card-footer">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAnalyzeFunnel(funnel)
                      }}
                      className="btn-primary btn-sm"
                    >
                      <Play size={14} />
                      Analyze
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render funnel detail view with tabs and sidebar
  return (
    <div className="dashboard-page-content funnel-detail-page">
      {/* Breadcrumb Header */}
      <div className="funnel-breadcrumb">
        <button
          onClick={() => {
            setSelectedFunnel(null)
            setAnalysisResult(null)
          }}
          className="breadcrumb-link"
        >
          Funnels
        </button>
        <ChevronRight size={16} className="breadcrumb-separator" />
        <span className="breadcrumb-current">{selectedFunnel.name}</span>
      </div>

      {/* Main Header */}
      <div className="funnel-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => {
              setSelectedFunnel(null)
              setAnalysisResult(null)
            }}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
            title="Back to Funnels"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div>
            <h1 className="funnel-title">{selectedFunnel.name}</h1>
            {selectedFunnel.description && (
              <p className="funnel-description-text">{selectedFunnel.description}</p>
            )}
          </div>
        </div>
        <div className="funnel-header-actions">
          <button
            onClick={async () => {
              if (!selectedProject || !selectedFunnel) return
              try {
                // Map platformFilter to API format (backend accepts 'all' | 'web' | 'android' | 'ios')
                const apiPlatformFilter = platformFilter === 'all' ? 'all' : 
                                         platformFilter === 'web' ? 'web' :
                                         platformFilter === 'android' ? 'android' :
                                         platformFilter === 'ios' ? 'ios' : 'all'
                
                const blob = await funnelsAPI.exportCSV(selectedProject, selectedFunnel.id, {
                  start_date: new Date(dateRange.start).toISOString(),
                  end_date: new Date(dateRange.end + 'T23:59:59').toISOString(),
                  platform_filter: apiPlatformFilter as 'all' | 'web' | 'android' | 'ios',
                  country_filter: countryFilter || undefined,
                  device_filter: deviceFilter || undefined,
                  app_version_filter: appVersionFilter || undefined
                })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${selectedFunnel.name.replace(/\s/g, '_')}_funnel_analysis.csv`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
              } catch (error: any) {
                alert('Failed to export CSV: ' + error.message)
              }
            }}
            className="btn-secondary"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={() => {
              setEditingFunnel(selectedFunnel)
              setShowBuilder(true)
            }}
            className="btn-secondary"
          >
            <Edit2 size={16} />
            Edit
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="funnel-filter-bar">
        <div className="filter-row">
          <div className="filter-group">
            <label>Date Range</label>
            <div className="date-inputs">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="form-input date-input"
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="form-input date-input"
              />
            </div>
          </div>

          <div className="filter-group">
            <label>Platform</label>
            <div className="platform-buttons">
              <button
                onClick={() => setPlatformFilter('all')}
                className={`platform-btn ${platformFilter === 'all' ? 'active' : ''}`}
              >
                All Platforms
              </button>
              <button
                onClick={() => setPlatformFilter('web')}
                className={`platform-btn ${platformFilter === 'web' ? 'active' : ''}`}
              >
                <Monitor size={14} />
                Web
              </button>
              <button
                onClick={() => setPlatformFilter('android')}
                className={`platform-btn ${platformFilter === 'android' ? 'active' : ''}`}
              >
                <Smartphone size={14} />
                Android
              </button>
              <button
                onClick={() => setPlatformFilter('ios')}
                className={`platform-btn ${platformFilter === 'ios' ? 'active' : ''}`}
              >
                <Smartphone size={14} />
                iOS
              </button>
            </div>
          </div>

          <div className="filter-group">
            <label>Segment</label>
            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value)}
              className="form-select"
            >
              <option value="">All Users</option>
              {segments.map(segment => (
                <option key={segment.id} value={segment.id}>{segment.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`btn-filter-toggle ${showAdvancedFilters ? 'active' : ''}`}
            >
              <Filter size={14} />
              Advanced Filters
            </button>
          </div>

          <div className="filter-group">
            <button
              onClick={() => selectedFunnel && handleAnalyzeFunnel(selectedFunnel)}
              disabled={analyzing}
              className="btn-primary"
            >
              <Play size={16} />
              {analyzing ? 'Analyzing...' : 'Re-analyze'}
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="advanced-filters">
            <div className="filter-row">
              <div className="filter-group">
                <label>Country</label>
                <input
                  type="text"
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  placeholder="e.g., US, GB, CA (ISO code)"
                  className="form-input"
                  title="Enter ISO country code (e.g., US for United States)"
                />
              </div>
              <div className="filter-group">
                <label>Device</label>
                <input
                  type="text"
                  value={deviceFilter}
                  onChange={(e) => setDeviceFilter(e.target.value)}
                  placeholder="e.g., Samsung, iPhone, Chrome"
                  className="form-input"
                  title="Partial match - e.g., 'Samsung' matches all Samsung devices"
                />
              </div>
              <div className="filter-group">
                <label>App Version</label>
                <input
                  type="text"
                  value={appVersionFilter}
                  onChange={(e) => setAppVersionFilter(e.target.value)}
                  placeholder="e.g., 2.0.0 (exact match)"
                  className="form-input"
                  title="Exact version match - must match exactly as set in SDK"
                />
              </div>
              <div className="filter-group">
                <label>User Type</label>
                <select
                  value={isNewUserFilter === undefined ? '' : isNewUserFilter ? 'new' : 'returning'}
                  onChange={(e) => setIsNewUserFilter(e.target.value === '' ? undefined : e.target.value === 'new')}
                  className="form-select"
                >
                  <option value="">All Users</option>
                  <option value="new">New Users</option>
                  <option value="returning">Returning Users</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Acquisition Source</label>
                <input
                  type="text"
                  value={acquisitionSourceFilter}
                  onChange={(e) => setAcquisitionSourceFilter(e.target.value)}
                  placeholder="e.g., google_ads, facebook_ads, organic"
                  className="form-input"
                  title="Exact match - must match exactly as set in SDK (e.g., 'google_ads')"
                />
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        {getActiveFilters().length > 0 && (
          <div className="filter-chips">
            {getActiveFilters().map((filter, idx) => (
              <span key={idx} className="filter-chip">
                {filter.label}
                <button
                  onClick={() => removeFilter(filter.key)}
                  className="chip-remove"
                  title={`Remove ${filter.label}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <button onClick={clearAllFilters} className="clear-filters-btn">
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area with Tabs */}
      <div className="funnel-content-wrapper">
        {/* Main Content */}
        <div className="funnel-main-content">
          {/* Tab Navigation */}
          <div className="funnel-tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`funnel-tab ${activeTab === 'overview' ? 'active' : ''}`}
            >
              <BarChart3 size={16} />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('anomalies')}
              className={`funnel-tab ${activeTab === 'anomalies' ? 'active' : ''}`}
            >
              <AlertTriangle size={16} />
              Anomalies
              {anomalies.length > 0 && (
                <span className="tab-badge">{anomalies.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('dropoff')}
              className={`funnel-tab ${activeTab === 'dropoff' ? 'active' : ''}`}
            >
              <TrendingDown size={16} />
              Drop-off Analysis
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`funnel-tab ${activeTab === 'performance' ? 'active' : ''}`}
            >
              <Zap size={16} />
              Performance
            </button>
          </div>

          {/* Tab Content */}
          <div className="funnel-tab-content">
            {!analysisResult ? (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <h3>No analysis data</h3>
                <p>Click "Re-analyze" to generate funnel analysis</p>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <OverviewTab
                    analysisResult={analysisResult}
                    includeGeography={includeGeography}
                    setIncludeGeography={setIncludeGeography}
                  />
                )}
                {activeTab === 'anomalies' && (
                  <AnomaliesTab
                    anomalies={anomalies}
                    selectedProject={selectedProject}
                    selectedFunnel={selectedFunnel}
                    onRefresh={loadAnomalies}
                  />
                )}
                {activeTab === 'dropoff' && (
                  <DropoffTab
                    analysisResult={analysisResult}
                    heatmaps={heatmaps}
                    rageClicks={rageClicks}
                  />
                )}
                {activeTab === 'performance' && (
                  <PerformanceTab
                    performanceMetrics={performanceMetrics}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="funnel-sidebar">
          <FunnelSidebar
            selectedFunnel={selectedFunnel}
            alerts={alerts}
            shareLinks={shareLinks}
            scheduledReports={scheduledReports}
            heatmaps={heatmaps}
            rageClicks={rageClicks}
          />
        </div>
      </div>
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ analysisResult, includeGeography, setIncludeGeography }: any) {
  return (
    <div className="overview-tab">
      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Users</div>
          <div className="metric-value">{analysisResult.total_users || 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Overall Conversion</div>
          <div className="metric-value">{analysisResult.overall_conversion?.toFixed(1) || 0}%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Conversions</div>
          <div className="metric-value">
            {analysisResult.steps?.[analysisResult.steps.length - 1]?.users || 0}
          </div>
        </div>
        {analysisResult.first_time_users !== undefined && (
          <div className="metric-card">
            <div className="metric-label">First-Time Users</div>
            <div className="metric-value">{analysisResult.first_time_users}</div>
          </div>
        )}
        {analysisResult.returning_users !== undefined && (
          <div className="metric-card">
            <div className="metric-label">Returning Users</div>
            <div className="metric-value">{analysisResult.returning_users}</div>
          </div>
        )}
      </div>

      {/* Funnel Chart */}
      <div className="funnel-chart-section">
        <FunnelChart
          steps={analysisResult.steps || []}
          totalUsers={analysisResult.total_users || 0}
          overallConversion={analysisResult.overall_conversion || 0}
        />
      </div>

      {/* Trend Over Time */}
      {analysisResult.trend_over_time?.daily && (() => {
        // Filter out dates with no data to avoid showing long lists of zeros
        const daysWithData = analysisResult.trend_over_time.daily.filter((day: any) => day.total_users > 0 || day.conversions > 0)
        const allDays = analysisResult.trend_over_time.daily
        
        // Show only days with data, or all days if date range is small (7 days or less)
        const daysToShow = daysWithData.length > 0 ? daysWithData : allDays.slice(-7) // Show last 7 days if no data
        
        if (daysToShow.length === 0) {
          return (
            <div className="trend-section">
              <h3 className="section-title">Daily Trend</h3>
              <p style={{ color: '#6b7280', padding: '1rem' }}>No data available for the selected date range.</p>
            </div>
          )
        }
        
        return (
          <div className="trend-section">
            <h3 className="section-title">Daily Trend</h3>
            {daysWithData.length === 0 && allDays.length > 7 && (
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Showing last 7 days. No data found in selected date range.
              </p>
            )}
            <div className="trend-list">
              {daysToShow.map((day: any, idx: number) => (
                <div key={idx} className="trend-item">
                  <div className="trend-date">{day.date}</div>
                  <div className="trend-bar-container">
                    <div className="trend-info">
                      {day.total_users} users • {day.conversions} conversions
                    </div>
                    <div className="trend-bar">
                      <div
                        className="trend-bar-fill"
                        style={{ width: `${Math.min(day.conversion_rate, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="trend-value">{day.conversion_rate.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Geographic Breakdown */}
      <div className="geography-section">
        <div className="section-header">
          <h3 className="section-title">Geographic Breakdown</h3>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeGeography}
              onChange={(e) => setIncludeGeography(e.target.checked)}
            />
            Include Geography
          </label>
        </div>
        {includeGeography && analysisResult.geographic_breakdown && (
          <GeographicBreakdown data={analysisResult.geographic_breakdown} />
        )}
      </div>
    </div>
  )
}

// Anomalies Tab Component
function AnomaliesTab({ anomalies, selectedProject, selectedFunnel, onRefresh }: any) {
  const [detecting, setDetecting] = useState(false)

  const handleDetectAnomalies = async () => {
    if (!selectedProject || !selectedFunnel) return
    setDetecting(true)
    try {
      await anomaliesAPI.detect(selectedProject, selectedFunnel.id)
      await onRefresh()
      alert('Anomaly detection completed!')
    } catch (error: any) {
      alert('Failed to detect anomalies: ' + error.message)
    } finally {
      setDetecting(false)
    }
  }

  return (
    <div className="anomalies-tab">
      <div className="tab-header">
        <h3>Detected Anomalies</h3>
        <button
          onClick={handleDetectAnomalies}
          disabled={detecting}
          className="btn-primary"
        >
          {detecting ? 'Detecting...' : 'Detect Anomalies'}
        </button>
      </div>

      {anomalies.length === 0 ? (
        <div className="empty-state">
          <AlertTriangle size={48} className="empty-icon" />
          <h3>No anomalies detected</h3>
          <p>Click "Detect Anomalies" to scan for conversion drops</p>
        </div>
      ) : (
        <div className="anomalies-list">
          {anomalies.map((anomaly: any) => (
            <div key={anomaly.id} className="anomaly-card">
              <div className="anomaly-header">
                <div className="anomaly-severity" data-severity={anomaly.severity}>
                  {anomaly.severity}
                </div>
                <div className="anomaly-date">
                  {new Date(anomaly.detected_at).toLocaleString()}
                </div>
              </div>
              <div className="anomaly-body">
                <h4>{anomaly.description}</h4>
                <p>Step: {anomaly.step_name || 'N/A'}</p>
                <p>Drop-off: {anomaly.drop_off_percentage?.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Drop-off Tab Component
function DropoffTab({ analysisResult, heatmaps, rageClicks }: any) {
  const steps = analysisResult.steps || []
  
  // Log steps for debugging
  console.log('[DropoffTab] Steps data:', steps.map((s: any) => ({
    order: s.order,
    name: s.name,
    users: s.users,
    drop_off_rate: s.drop_off_rate,
    conversion_rate: s.conversion_rate
  })))
  
  const maxDropoff = steps.length > 0 
    ? Math.max(...steps.map((s: any) => s.drop_off_rate || 0), 0)
    : 0
  const biggestDropoffStep = steps.find((s: any) => s.drop_off_rate === maxDropoff)

  return (
    <div className="dropoff-tab">
      <div className="dropoff-overview">
        <div className="dropoff-highlight">
          <h3>Biggest Drop-off</h3>
          <div className="dropoff-step-name">
            {biggestDropoffStep?.name || 'N/A'}
          </div>
          <div className="dropoff-percentage">
            {maxDropoff.toFixed(1)}% drop-off
            {maxDropoff === 0 && steps.length > 1 && (
              <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.5rem' }}>
                All users completed all steps
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dropoff-steps">
        <h3 className="section-title">Step-by-Step Analysis</h3>
        {steps.map((step: any, idx: number) => {
          const stepHeatmap = heatmaps.find((h: any) => 
            step.condition?.data?.url?.includes(h.page_url) || 
            step.condition?.data?.page?.includes(h.page_url)
          )
          const stepRageClicks = rageClicks.filter((r: any) => 
            r.page_url && (step.condition?.data?.url?.includes(r.page_url) || 
            step.condition?.data?.page?.includes(r.page_url))
          )

          return (
            <div key={idx} className="dropoff-step-card">
              <div className="step-header">
                <div className="step-number">{step.order}</div>
                <div className="step-info">
                  <h4>{step.name}</h4>
                  <div className="step-meta">
                    <span>{step.users} users</span>
                    <span>•</span>
                    <span>{step.conversion_rate.toFixed(1)}% conversion</span>
                  </div>
                </div>
                <div className="step-dropoff">
                  <div className="dropoff-badge" data-severity={
                    (step.drop_off_rate || 0) > 50 ? 'high' : 
                    (step.drop_off_rate || 0) > 25 ? 'medium' : 'low'
                  }>
                    {(step.drop_off_rate || 0).toFixed(1)}% drop-off
                  </div>
                </div>
              </div>
              <div className="step-visualization">
                <div className="dropoff-bar">
                  <div
                    className="dropoff-bar-fill"
                    style={{ width: `${step.drop_off_rate || 0}%` }}
                  />
                </div>
              </div>
              <div className="step-actions">
                {stepHeatmap && (
                  <button className="btn-link">
                    <Eye size={14} />
                    View Heatmap
                  </button>
                )}
                {stepRageClicks.length > 0 && (
                  <button className="btn-link">
                    <Flame size={14} />
                    {stepRageClicks.length} Rage Clicks
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Performance Tab Component
function PerformanceTab({ performanceMetrics }: any) {
  return (
    <div className="performance-tab">
      <h3>Performance Metrics</h3>
      {performanceMetrics.length === 0 ? (
        <div className="empty-state">
          <Zap size={48} className="empty-icon" />
          <h3>No performance data</h3>
          <p>Performance metrics will appear here once data is collected</p>
        </div>
      ) : (
        <div className="performance-metrics">
          {performanceMetrics.map((metric: any, idx: number) => {
            // Safely convert average_value to number
            const avgValue = typeof metric.average_value === 'number' 
              ? metric.average_value 
              : Number(metric.average_value) || 0
            
            // Format value based on metric type
            const formatValue = (val: number, type: string) => {
              if (type === 'CLS') {
                return val.toFixed(3) // CLS is typically < 1
              }
              return val.toFixed(2) + 'ms'
            }
            
            // Extract base metric type (remove _BY_PAGE suffix if present)
            const baseMetricType = metric.metric_type.replace('_BY_PAGE', '')
            
            return (
              <div key={idx} className="performance-card">
                <div className="performance-metric-name">
                  {metric.metric_type}
                  {metric.page_url && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      {metric.page_url}
                    </div>
                  )}
                </div>
                <div className="performance-metric-value">{formatValue(avgValue, baseMetricType)}</div>
                <div className="performance-status" data-status={
                  baseMetricType === 'LCP' && avgValue < 2500 ? 'good' :
                  baseMetricType === 'FID' && avgValue < 100 ? 'good' :
                  baseMetricType === 'CLS' && avgValue < 0.1 ? 'good' : 'poor'
                }>
                  {baseMetricType === 'LCP' && avgValue < 2500 ? 'Good' :
                   baseMetricType === 'FID' && avgValue < 100 ? 'Good' :
                   baseMetricType === 'CLS' && avgValue < 0.1 ? 'Good' : 'Needs Improvement'}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Sidebar Component
function FunnelSidebar({
  selectedFunnel,
  alerts,
  shareLinks,
  scheduledReports,
  heatmaps,
  rageClicks
}: any) {
  const navigate = useNavigate()
  
  return (
    <div className="funnel-sidebar-content">
      {/* Alerts Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <Bell size={16} />
          <h4>Alerts</h4>
        </div>
        <div className="sidebar-section-body">
          {alerts.length === 0 ? (
            <p className="sidebar-empty">No alerts configured</p>
          ) : (
            <div className="sidebar-list">
              {alerts.slice(0, 3).map((alert: any) => (
                <div key={alert.id} className="sidebar-item">
                  <div className="sidebar-item-name">{alert.name}</div>
                  <div className={`sidebar-item-status ${alert.enabled ? 'active' : 'inactive'}`}>
                    {alert.enabled ? 'Active' : 'Inactive'}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className="btn-link btn-sm" onClick={() => navigate(`/dashboard/alerts${selectedFunnel ? `?funnelId=${selectedFunnel.id}` : ''}`)}>View All Alerts</button>
        </div>
      </div>

      {/* Share Links Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <LinkIcon size={16} />
          <h4>Share Links</h4>
        </div>
        <div className="sidebar-section-body">
          {shareLinks.length === 0 ? (
            <p className="sidebar-empty">No share links</p>
          ) : (
            <div className="sidebar-list">
              {shareLinks.slice(0, 3).map((link: any) => (
                <div key={link.id} className="sidebar-item">
                  <div className="sidebar-item-name">Shared Link</div>
                  <div className="sidebar-item-meta">
                    {link.views || 0} views
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className="btn-link btn-sm" onClick={() => navigate(`/dashboard/share-links${selectedFunnel ? `?funnelId=${selectedFunnel.id}` : ''}`)}>Create Share Link</button>
        </div>
      </div>

      {/* Scheduled Reports Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <Mail size={16} />
          <h4>Scheduled Reports</h4>
        </div>
        <div className="sidebar-section-body">
          {scheduledReports.length === 0 ? (
            <p className="sidebar-empty">No scheduled reports</p>
          ) : (
            <div className="sidebar-list">
              {scheduledReports.slice(0, 3).map((report: any) => (
                <div key={report.id} className="sidebar-item">
                  <div className="sidebar-item-name">{report.frequency}</div>
                  <div className="sidebar-item-meta">
                    Next: {new Date(report.next_run_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className="btn-link btn-sm" onClick={() => navigate(`/dashboard/scheduled-reports${selectedFunnel ? `?funnelId=${selectedFunnel.id}` : ''}`)}>Schedule Report</button>
        </div>
      </div>

      {/* Heatmaps per Step */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <Eye size={16} />
          <h4>Heatmaps</h4>
        </div>
        <div className="sidebar-section-body">
          {heatmaps.length === 0 ? (
            <p className="sidebar-empty">No heatmaps available</p>
          ) : (
            <div className="sidebar-list">
              {heatmaps.slice(0, 3).map((heatmap: any) => (
                <div key={heatmap.id} className="sidebar-item">
                  <div className="sidebar-item-name">{heatmap.heatmap_type} Heatmap</div>
                  <div className="sidebar-item-meta">
                    {heatmap.total_sessions} sessions
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className="btn-link btn-sm" onClick={() => navigate('/dashboard/heatmaps')}>View All Heatmaps</button>
        </div>
      </div>

      {/* Rage Clicks */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <Flame size={16} />
          <h4>Rage Clicks</h4>
        </div>
        <div className="sidebar-section-body">
          {rageClicks.length === 0 ? (
            <p className="sidebar-empty">No rage clicks detected</p>
          ) : (
            <div className="sidebar-list">
              <div className="sidebar-item">
                <div className="sidebar-item-name">Total Rage Clicks</div>
                <div className="sidebar-item-meta">
                  {rageClicks.reduce((sum: number, r: any) => sum + (r.count || 0), 0)} events
                </div>
              </div>
            </div>
          )}
          <button className="btn-link btn-sm" onClick={() => navigate(`/dashboard/rage-clicks${selectedFunnel ? `?funnelId=${selectedFunnel.id}` : ''}`)}>View Details</button>
        </div>
      </div>
    </div>
  )
}
