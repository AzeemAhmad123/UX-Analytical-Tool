/**
 * Web Performance Dashboard
 * 
 * Monitor and analyze Core Web Vitals and performance metrics
 */

import { useState, useEffect } from 'react'
// import { TrendingUp, TrendingDown, Activity, Clock, Zap, AlertCircle } from 'lucide-react'
import { projectsAPI, advancedAnalyticsAPI } from '../../services/api'
import '../../components/dashboard/Dashboard.css'
import './WebPerformance.css'

interface PerformanceMetric {
  metric_type: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP'
  average: number
  p50: number
  p75: number
  p95: number
  good_percentage: number
  needs_improvement_percentage: number
  poor_percentage: number
  sample_count: number
}

interface PerformanceSummary {
  metrics: PerformanceMetric[]
  total_sessions: number
  date_range: {
    start: string
    end: string
  }
}

export function WebPerformance() {
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d')
  const [selectedPage, setSelectedPage] = useState<string>('')
  const [trends, setTrends] = useState<any>(null)
  const [selectedMetric, setSelectedMetric] = useState<'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP'>('LCP')

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadPerformanceData()
    }
  }, [selectedProject, dateRange, selectedPage])

  useEffect(() => {
    if (selectedProject && selectedMetric) {
      loadTrends()
    }
  }, [selectedProject, selectedMetric, dateRange])

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
    }
  }

  const loadPerformanceData = async () => {
    if (!selectedProject) return

    setLoading(true)
    try {
      const endDate = new Date().toISOString()
      const startDate = new Date(Date.now() - (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90) * 24 * 60 * 60 * 1000).toISOString()

      const response = await advancedAnalyticsAPI.getPerformanceSummary(
        selectedProject,
        startDate,
        endDate,
        selectedPage || undefined
      )
      setSummary(response.summary || null)
    } catch (error) {
      console.error('Error loading performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTrends = async () => {
    if (!selectedProject || !selectedMetric) return

    try {
      const endDate = new Date().toISOString()
      const startDate = new Date(Date.now() - (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90) * 24 * 60 * 60 * 1000).toISOString()

      const response = await advancedAnalyticsAPI.getPerformanceTrends(
        selectedProject,
        selectedMetric,
        startDate,
        endDate,
        'daily'
      )
      setTrends(response.trends || null)
    } catch (error) {
      console.error('Error loading trends:', error)
    }
  }

  const getMetricRating = (metric: PerformanceMetric): 'good' | 'needs-improvement' | 'poor' => {
    const { metric_type, average } = metric
    switch (metric_type) {
      case 'LCP':
        return average <= 2500 ? 'good' : average <= 4000 ? 'needs-improvement' : 'poor'
      case 'FID':
        return average <= 100 ? 'good' : average <= 300 ? 'needs-improvement' : 'poor'
      case 'CLS':
        return average <= 0.1 ? 'good' : average <= 0.25 ? 'needs-improvement' : 'poor'
      case 'TTFB':
        return average <= 800 ? 'good' : average <= 1800 ? 'needs-improvement' : 'poor'
      case 'FCP':
        return average <= 1800 ? 'good' : average <= 3000 ? 'needs-improvement' : 'poor'
      case 'INP':
        return average <= 200 ? 'good' : average <= 500 ? 'needs-improvement' : 'poor'
      default:
        return 'needs-improvement'
    }
  }

  const getMetricLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      LCP: 'Largest Contentful Paint',
      FID: 'First Input Delay',
      CLS: 'Cumulative Layout Shift',
      TTFB: 'Time to First Byte',
      FCP: 'First Contentful Paint',
      INP: 'Interaction to Next Paint'
    }
    return labels[type] || type
  }

  const formatMetricValue = (type: string, value: number) => {
    if (type === 'CLS') {
      return value.toFixed(3)
    }
    return `${Math.round(value)}ms`
  }

  const getMetricThresholds = (type: string) => {
    const thresholds: { [key: string]: { good: number; needsImprovement: number } } = {
      LCP: { good: 2500, needsImprovement: 4000 },
      FID: { good: 100, needsImprovement: 300 },
      CLS: { good: 0.1, needsImprovement: 0.25 },
      TTFB: { good: 800, needsImprovement: 1800 },
      FCP: { good: 1800, needsImprovement: 3000 },
      INP: { good: 200, needsImprovement: 500 }
    }
    return thresholds[type] || { good: 0, needsImprovement: 0 }
  }

  return (
    <div className="dashboard-page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Web Performance</h1>
          <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Monitor Core Web Vitals and performance metrics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            className="time-filter-select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
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

      {/* Page Filter */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Filter by page URL (optional)"
          value={selectedPage}
          onChange={(e) => setSelectedPage(e.target.value)}
          style={{ maxWidth: '400px' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading performance data...</p>
        </div>
      ) : summary && summary.metrics.length > 0 ? (
        <>
          {/* Core Web Vitals */}
          <div className="performance-section">
            <h2 className="section-title">Core Web Vitals</h2>
            <div className="metrics-grid">
              {summary.metrics
                .filter(m => ['LCP', 'FID', 'CLS'].includes(m.metric_type))
                .map((metric) => {
                  const rating = getMetricRating(metric)
                  const thresholds = getMetricThresholds(metric.metric_type)
                  return (
                    <div key={metric.metric_type} className="metric-card-large">
                      <div className="metric-header">
                        <div>
                          <h3 className="metric-name">{getMetricLabel(metric.metric_type)}</h3>
                          <div className="metric-value-large">
                            {formatMetricValue(metric.metric_type, metric.average)}
                          </div>
                        </div>
                        <div className={`metric-rating-badge ${rating}`}>
                          {rating === 'good' ? '✓ Good' : rating === 'needs-improvement' ? '⚠ Needs Improvement' : '✗ Poor'}
                        </div>
                      </div>
                      <div className="metric-stats">
                        <div className="stat-row">
                          <span>P50:</span>
                          <strong>{formatMetricValue(metric.metric_type, metric.p50)}</strong>
                        </div>
                        <div className="stat-row">
                          <span>P75:</span>
                          <strong>{formatMetricValue(metric.metric_type, metric.p75)}</strong>
                        </div>
                        <div className="stat-row">
                          <span>P95:</span>
                          <strong>{formatMetricValue(metric.metric_type, metric.p95)}</strong>
                        </div>
                      </div>
                      <div className="metric-distribution">
                        <div className="distribution-bar">
                          <div
                            className="distribution-segment good"
                            style={{ width: `${metric.good_percentage}%` }}
                          />
                          <div
                            className="distribution-segment needs-improvement"
                            style={{ width: `${metric.needs_improvement_percentage}%` }}
                          />
                          <div
                            className="distribution-segment poor"
                            style={{ width: `${metric.poor_percentage}%` }}
                          />
                        </div>
                        <div className="distribution-labels">
                          <span className="label-good">
                            Good: {metric.good_percentage.toFixed(1)}%
                          </span>
                          <span className="label-needs-improvement">
                            Needs Improvement: {metric.needs_improvement_percentage.toFixed(1)}%
                          </span>
                          <span className="label-poor">
                            Poor: {metric.poor_percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="metric-thresholds">
                        <small>
                          Thresholds: Good ≤ {formatMetricValue(metric.metric_type, thresholds.good)}, 
                          Needs Improvement ≤ {formatMetricValue(metric.metric_type, thresholds.needsImprovement)}
                        </small>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Additional Metrics */}
          {summary.metrics.filter(m => !['LCP', 'FID', 'CLS'].includes(m.metric_type)).length > 0 && (
            <div className="performance-section">
              <h2 className="section-title">Additional Metrics</h2>
              <div className="metrics-grid">
                {summary.metrics
                  .filter(m => !['LCP', 'FID', 'CLS'].includes(m.metric_type))
                  .map((metric) => {
                    const rating = getMetricRating(metric)
                    return (
                      <div key={metric.metric_type} className="metric-card">
                        <div className="metric-header-small">
                          <h4 className="metric-name-small">{getMetricLabel(metric.metric_type)}</h4>
                          <div className={`metric-rating-badge-small ${rating}`}>
                            {rating === 'good' ? '✓' : rating === 'needs-improvement' ? '⚠' : '✗'}
                          </div>
                        </div>
                        <div className="metric-value">
                          {formatMetricValue(metric.metric_type, metric.average)}
                        </div>
                        <div className="metric-sample">
                          {metric.sample_count.toLocaleString()} samples
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Trends */}
          <div className="performance-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 className="section-title">Performance Trends</h2>
              <select
                className="time-filter-select"
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as any)}
                style={{ maxWidth: '200px' }}
              >
                {summary.metrics.map(m => (
                  <option key={m.metric_type} value={m.metric_type}>
                    {getMetricLabel(m.metric_type)}
                  </option>
                ))}
              </select>
            </div>
            {trends && trends.length > 0 ? (
              <div className="trends-chart">
                <div className="trends-header">
                  <span>Average {getMetricLabel(selectedMetric)} over time</span>
                </div>
                <div className="trends-bars">
                  {trends.map((trend: any, idx: number) => {
                    const maxValue = Math.max(...trends.map((t: any) => t.average))
                    const height = (trend.average / maxValue) * 100
                    return (
                      <div key={idx} className="trend-bar-container">
                        <div
                          className="trend-bar"
                          style={{ height: `${height}%` }}
                          title={`${new Date(trend.date).toLocaleDateString()}: ${formatMetricValue(selectedMetric, trend.average)}`}
                        />
                        <div className="trend-label">
                          {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>No trend data available for the selected period.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">⚡</div>
          <h3>No performance data available</h3>
          <p>Start tracking performance metrics to see data here.</p>
        </div>
      )}
    </div>
  )
}
