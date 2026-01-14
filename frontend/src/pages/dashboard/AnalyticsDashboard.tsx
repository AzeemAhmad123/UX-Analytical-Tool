/**
 * Analytics Dashboard
 * 
 * Main dashboard showing key metrics and overview
 */

import { useState, useEffect } from 'react'
import { TrendingUp, Users, MousePointerClick, AlertCircle, Activity, Clock } from 'lucide-react'
import { projectsAPI, analyticsAPI, advancedAnalyticsAPI, anomaliesAPI } from '../../services/api'
import '../../components/dashboard/Dashboard.css'
import './AnalyticsDashboard.css'

interface Project {
  id: string
  name: string
}

interface DashboardMetrics {
  totalSessions: number
  totalUsers: number
  totalEvents: number
  activeAnomalies: number
  rageClicks: number
  avgPerformance: {
    lcp: number
    fid: number
    cls: number
  }
}

export function AnalyticsDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d')

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadMetrics()
    }
  }, [selectedProject, dateRange])

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

  const loadMetrics = async () => {
    if (!selectedProject) return

    setLoading(true)
    try {
      const endDate = new Date().toISOString()
      const startDate = new Date(Date.now() - (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90) * 24 * 60 * 60 * 1000).toISOString()

      // Load all metrics in parallel
      const [overviewData, anomaliesData, rageClicksData, performanceData] = await Promise.all([
        analyticsAPI.getOverview(selectedProject, { start_date: startDate, end_date: endDate }).catch(() => ({ sessions: [], events: [] })),
        anomaliesAPI.getStats(selectedProject).catch(() => ({ stats: { open: 0 } })),
        advancedAnalyticsAPI.getRageClicksSummary(selectedProject, startDate, endDate).catch(() => ({ summary: { total: 0 } })),
        advancedAnalyticsAPI.getPerformanceSummary(selectedProject, startDate, endDate).catch(() => ({ summary: { metrics: [] } }))
      ])
      
      const sessionsData = { sessions: overviewData.sessions || [] }
      const eventsData = { events: overviewData.events || [] }

      const sessions = sessionsData.sessions || []
      const events = eventsData.events || []
      const uniqueUsers = new Set(sessions.map((s: any) => s.user_id || s.session_id)).size

      // Calculate average performance
      const perfMetrics = performanceData.summary?.metrics || []
      const lcpMetric = perfMetrics.find((m: any) => m.metric_type === 'LCP')
      const fidMetric = perfMetrics.find((m: any) => m.metric_type === 'FID')
      const clsMetric = perfMetrics.find((m: any) => m.metric_type === 'CLS')

      setMetrics({
        totalSessions: sessions.length,
        totalUsers: uniqueUsers,
        totalEvents: events.length,
        activeAnomalies: anomaliesData.stats?.open || 0,
        rageClicks: rageClicksData.summary?.total || 0,
        avgPerformance: {
          lcp: lcpMetric?.average || 0,
          fid: fidMetric?.average || 0,
          cls: clsMetric?.average || 0
        }
      })
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case '7d': return 'Last 7 days'
      case '30d': return 'Last 30 days'
      case '90d': return 'Last 90 days'
    }
  }

  return (
    <div className="dashboard-page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics Dashboard</h1>
          <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Overview of your analytics and key metrics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Date Range Selector */}
          <select
            className="time-filter-select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          {/* Project Selector */}
          {projects.length > 0 && (
            <select
              className="time-filter-select"
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading metrics...</p>
        </div>
      ) : metrics ? (
        <>
          {/* Key Metrics Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                <Users size={24} style={{ color: '#8b5cf6' }} />
              </div>
              <div className="metric-content">
                <div className="metric-label">Total Users</div>
                <div className="metric-value">{metrics.totalUsers.toLocaleString()}</div>
                <div className="metric-change positive">
                  <TrendingUp size={14} />
                  <span>{getDateRangeLabel()}</span>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <Activity size={24} style={{ color: '#3b82f6' }} />
              </div>
              <div className="metric-content">
                <div className="metric-label">Total Sessions</div>
                <div className="metric-value">{metrics.totalSessions.toLocaleString()}</div>
                <div className="metric-change positive">
                  <TrendingUp size={14} />
                  <span>{getDateRangeLabel()}</span>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                <MousePointerClick size={24} style={{ color: '#10b981' }} />
              </div>
              <div className="metric-content">
                <div className="metric-label">Total Events</div>
                <div className="metric-value">{metrics.totalEvents.toLocaleString()}</div>
                <div className="metric-change positive">
                  <TrendingUp size={14} />
                  <span>{getDateRangeLabel()}</span>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                <AlertCircle size={24} style={{ color: '#ef4444' }} />
              </div>
              <div className="metric-content">
                <div className="metric-label">Active Anomalies</div>
                <div className="metric-value">{metrics.activeAnomalies}</div>
                <div className="metric-change">
                  <span>Requires attention</span>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                <MousePointerClick size={24} style={{ color: '#f59e0b' }} />
              </div>
              <div className="metric-content">
                <div className="metric-label">Rage Clicks</div>
                <div className="metric-value">{metrics.rageClicks}</div>
                <div className="metric-change">
                  <span>Friction detected</span>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                <Clock size={24} style={{ color: '#8b5cf6' }} />
              </div>
              <div className="metric-content">
                <div className="metric-label">Avg LCP</div>
                <div className="metric-value">{metrics.avgPerformance.lcp > 0 ? `${Math.round(metrics.avgPerformance.lcp)}ms` : 'N/A'}</div>
                <div className="metric-change">
                  <span>Performance metric</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          {metrics.avgPerformance.lcp > 0 && (
            <div className="dashboard-section">
              <h2 className="section-title">Performance Metrics</h2>
              <div className="performance-grid">
                <div className="performance-card">
                  <div className="performance-label">LCP (Largest Contentful Paint)</div>
                  <div className="performance-value">{Math.round(metrics.avgPerformance.lcp)}ms</div>
                  <div className={`performance-rating ${metrics.avgPerformance.lcp <= 2500 ? 'good' : metrics.avgPerformance.lcp <= 4000 ? 'needs-improvement' : 'poor'}`}>
                    {metrics.avgPerformance.lcp <= 2500 ? 'Good' : metrics.avgPerformance.lcp <= 4000 ? 'Needs Improvement' : 'Poor'}
                  </div>
                </div>
                <div className="performance-card">
                  <div className="performance-label">FID (First Input Delay)</div>
                  <div className="performance-value">{Math.round(metrics.avgPerformance.fid)}ms</div>
                  <div className={`performance-rating ${metrics.avgPerformance.fid <= 100 ? 'good' : metrics.avgPerformance.fid <= 300 ? 'needs-improvement' : 'poor'}`}>
                    {metrics.avgPerformance.fid <= 100 ? 'Good' : metrics.avgPerformance.fid <= 300 ? 'Needs Improvement' : 'Poor'}
                  </div>
                </div>
                <div className="performance-card">
                  <div className="performance-label">CLS (Cumulative Layout Shift)</div>
                  <div className="performance-value">{metrics.avgPerformance.cls.toFixed(3)}</div>
                  <div className={`performance-rating ${metrics.avgPerformance.cls <= 0.1 ? 'good' : metrics.avgPerformance.cls <= 0.25 ? 'needs-improvement' : 'poor'}`}>
                    {metrics.avgPerformance.cls <= 0.1 ? 'Good' : metrics.avgPerformance.cls <= 0.25 ? 'Needs Improvement' : 'Poor'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="dashboard-section">
            <h2 className="section-title">Quick Actions</h2>
            <div className="quick-actions-grid">
              <a href="/dashboard/funnel" className="quick-action-card">
                <div className="quick-action-icon">📊</div>
                <div className="quick-action-title">Funnel Analysis</div>
                <div className="quick-action-desc">Analyze user conversion funnels</div>
              </a>
              <a href="/dashboard/heatmaps" className="quick-action-card">
                <div className="quick-action-icon">🔥</div>
                <div className="quick-action-title">Heatmaps</div>
                <div className="quick-action-desc">View click and scroll heatmaps</div>
              </a>
              <a href="/dashboard/performance" className="quick-action-card">
                <div className="quick-action-icon">⚡</div>
                <div className="quick-action-title">Performance</div>
                <div className="quick-action-desc">Monitor Web Vitals</div>
              </a>
              <a href="/dashboard/sessions" className="quick-action-card">
                <div className="quick-action-icon">🎬</div>
                <div className="quick-action-title">Session Replay</div>
                <div className="quick-action-desc">Watch user sessions</div>
              </a>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#6b7280' }}>No data available. Start tracking events to see metrics.</p>
        </div>
      )}
    </div>
  )
}

