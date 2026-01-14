/**
 * Enhanced Funnel Detail Page
 * UXCam/Hotjar-style professional UI with all Phase 2-5 features integrated
 */

import { useState, useEffect } from 'react'
import { 
  Plus, Calendar, Filter, Play, Edit2, Trash2, X, Monitor, Smartphone, 
  GitCompare, Download, ChevronRight, AlertTriangle, TrendingDown, 
  Zap, Flame, BarChart3, Users, Bell, Link as LinkIcon, Mail, 
  Eye, Clock, ArrowLeft, Settings, Share2, FileText, Target
} from 'lucide-react'
import { 
  funnelsAPI, projectsAPI, anomaliesAPI, advancedAnalyticsAPI, 
  alertsAPI, shareLinksAPI, scheduledReportsAPI 
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
  created_at: string
}

export function Funnel() {
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
  const [includeTrendOverTime, setIncludeTrendOverTime] = useState(true)
  
  // Date range
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  
  // Sidebar data
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [shareLinks, setShareLinks] = useState<any[]>([])
  const [scheduledReports, setScheduledReports] = useState<any[]>([])
  const [segments, setSegments] = useState<any[]>([])
  const [heatmaps, setHeatmaps] = useState<any[]>([])
  const [rageClicks, setRageClicks] = useState<any[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<any[]>([])
  const [loadingSidebar, setLoadingSidebar] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadFunnels()
      loadSegments()
    }
  }, [selectedProject])

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
      if (projectsList.length > 0) {
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
      // Load alerts
      try {
        const alertsRes = await alertsAPI.getAll(selectedProject, selectedFunnel.id)
        setAlerts(alertsRes.alerts || [])
      } catch (e) {
        console.error('Error loading alerts:', e)
      }

      // Load share links
      try {
        const linksRes = await shareLinksAPI.getAll(selectedProject, selectedFunnel.id)
        setShareLinks(linksRes.share_links || [])
      } catch (e) {
        console.error('Error loading share links:', e)
      }

      // Load scheduled reports
      try {
        const reportsRes = await scheduledReportsAPI.getAll(selectedProject)
        const funnelReports = (reportsRes.reports || []).filter((r: any) => r.funnel_id === selectedFunnel.id)
        setScheduledReports(funnelReports)
      } catch (e) {
        console.error('Error loading scheduled reports:', e)
      }

      // Load heatmaps for funnel steps
      try {
        const heatmapsRes = await advancedAnalyticsAPI.getHeatmaps(selectedProject)
        setHeatmaps(heatmapsRes.heatmaps || [])
      } catch (e) {
        console.error('Error loading heatmaps:', e)
      }

      // Load rage clicks summary
      try {
        const rageRes = await advancedAnalyticsAPI.getRageClicksSummary(
          selectedProject,
          new Date(dateRange.start).toISOString(),
          new Date(dateRange.end + 'T23:59:59').toISOString()
        )
        setRageClicks(rageRes.rage_clicks || [])
      } catch (e) {
        console.error('Error loading rage clicks:', e)
      }

      // Load performance metrics
      try {
        const perfRes = await advancedAnalyticsAPI.getPerformanceMetrics(
          selectedProject,
          new Date(dateRange.start).toISOString(),
          new Date(dateRange.end + 'T23:59:59').toISOString()
        )
        setPerformanceMetrics(perfRes.metrics || [])
      } catch (e) {
        console.error('Error loading performance metrics:', e)
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
      const response = await funnelsAPI.analyze(selectedProject, funnel.id, {
        start_date: new Date(dateRange.start).toISOString(),
        end_date: new Date(dateRange.end + 'T23:59:59').toISOString(),
        include_geography: includeGeography,
        include_trend_over_time: includeTrendOverTime,
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
    const filters: string[] = []
    if (platformFilter !== 'all') filters.push(`Platform: ${platformFilter}`)
    if (segmentFilter) {
      const segment = segments.find(s => s.id === segmentFilter)
      if (segment) filters.push(`Segment: ${segment.name}`)
    }
    if (countryFilter) filters.push(`Country: ${countryFilter}`)
    if (deviceFilter) filters.push(`Device: ${deviceFilter}`)
    if (appVersionFilter) filters.push(`App Version: ${appVersionFilter}`)
    if (isNewUserFilter !== undefined) filters.push(`User Type: ${isNewUserFilter ? 'New' : 'Returning'}`)
    if (acquisitionSourceFilter) filters.push(`Source: ${acquisitionSourceFilter}`)
    return filters
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
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
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
        <div>
          <h1 className="funnel-title">{selectedFunnel.name}</h1>
          {selectedFunnel.description && (
            <p className="funnel-description-text">{selectedFunnel.description}</p>
          )}
        </div>
        <div className="funnel-header-actions">
          <button
            onClick={async () => {
              if (!selectedProject || !selectedFunnel) return
              try {
                const blob = await funnelsAPI.exportCSV(selectedProject, selectedFunnel.id, {
                  start_date: new Date(dateRange.start).toISOString(),
                  end_date: new Date(dateRange.end + 'T23:59:59').toISOString(),
                  platform_filter: platformFilter,
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
                  placeholder="Filter by country"
                  className="form-input"
                />
              </div>
              <div className="filter-group">
                <label>Device</label>
                <input
                  type="text"
                  value={deviceFilter}
                  onChange={(e) => setDeviceFilter(e.target.value)}
                  placeholder="Filter by device"
                  className="form-input"
                />
              </div>
              <div className="filter-group">
                <label>App Version</label>
                <input
                  type="text"
                  value={appVersionFilter}
                  onChange={(e) => setAppVersionFilter(e.target.value)}
                  placeholder="Filter by app version"
                  className="form-input"
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
                  placeholder="Filter by source"
                  className="form-input"
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
                {filter}
                <button
                  onClick={() => {
                    // Remove specific filter logic would go here
                    clearAllFilters()
                  }}
                  className="chip-remove"
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
                    selectedFunnel={selectedFunnel}
                    dateRange={dateRange}
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
                    selectedFunnel={selectedFunnel}
                    heatmaps={heatmaps}
                    rageClicks={rageClicks}
                  />
                )}
                {activeTab === 'performance' && (
                  <PerformanceTab
                    performanceMetrics={performanceMetrics}
                    selectedFunnel={selectedFunnel}
                    dateRange={dateRange}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="funnel-sidebar">
          <FunnelSidebar
            selectedProject={selectedProject}
            selectedFunnel={selectedFunnel}
            alerts={alerts}
            shareLinks={shareLinks}
            scheduledReports={scheduledReports}
            heatmaps={heatmaps}
            rageClicks={rageClicks}
            segments={segments}
            loading={loadingSidebar}
            onRefresh={loadSidebarData}
          />
        </div>
      </div>
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ analysisResult, selectedFunnel, dateRange, includeGeography, setIncludeGeography }: any) {
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
      {analysisResult.trend_over_time?.daily && (
        <div className="trend-section">
          <h3 className="section-title">Daily Trend</h3>
          <div className="trend-list">
            {analysisResult.trend_over_time.daily.map((day: any, idx: number) => (
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
      )}

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
function DropoffTab({ analysisResult, selectedFunnel, heatmaps, rageClicks }: any) {
  const steps = analysisResult.steps || []
  const maxDropoff = Math.max(...steps.map((s: any) => s.drop_off_rate || 0), 0)
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
                    step.drop_off_rate > 50 ? 'high' : 
                    step.drop_off_rate > 25 ? 'medium' : 'low'
                  }>
                    {step.drop_off_rate.toFixed(1)}% drop-off
                  </div>
                </div>
              </div>
              <div className="step-visualization">
                <div className="dropoff-bar">
                  <div
                    className="dropoff-bar-fill"
                    style={{ width: `${step.drop_off_rate}%` }}
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
function PerformanceTab({ performanceMetrics, selectedFunnel, dateRange }: any) {
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
          {performanceMetrics.map((metric: any, idx: number) => (
            <div key={idx} className="performance-card">
              <div className="performance-metric-name">{metric.metric_type}</div>
              <div className="performance-metric-value">{metric.average_value.toFixed(2)}ms</div>
              <div className="performance-status" data-status={
                metric.metric_type === 'LCP' && metric.average_value < 2500 ? 'good' :
                metric.metric_type === 'FID' && metric.average_value < 100 ? 'good' :
                metric.metric_type === 'CLS' && metric.average_value < 0.1 ? 'good' : 'poor'
              }>
                {metric.metric_type === 'LCP' && metric.average_value < 2500 ? 'Good' :
                 metric.metric_type === 'FID' && metric.average_value < 100 ? 'Good' :
                 metric.metric_type === 'CLS' && metric.average_value < 0.1 ? 'Good' : 'Needs Improvement'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Sidebar Component
function FunnelSidebar({
  selectedProject,
  selectedFunnel,
  alerts,
  shareLinks,
  scheduledReports,
  heatmaps,
  rageClicks,
  segments,
  loading,
  onRefresh
}: any) {
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
          <button className="btn-link btn-sm">View All Alerts</button>
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
          <button className="btn-link btn-sm">Create Share Link</button>
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
          <button className="btn-link btn-sm">Schedule Report</button>
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
          <button className="btn-link btn-sm">View All Heatmaps</button>
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
          <button className="btn-link btn-sm">View Details</button>
        </div>
      </div>
    </div>
  )
}
