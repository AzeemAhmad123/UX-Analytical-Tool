/**
 * Rage Clicks & Dead Taps Page
 * 
 * Visualize and analyze rage clicks and dead taps to identify user friction
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, MousePointerClick, Hand, ExternalLink, ArrowLeft } from 'lucide-react'
import { projectsAPI, advancedAnalyticsAPI } from '../../services/api'
import '../../components/dashboard/Dashboard.css'
import './RageClicks.css'

interface RageClick {
  id: string
  session_id: string
  page_url: string
  element_selector: string
  click_count: number
  time_window_ms: number
  timestamp: string
  coordinates: { x: number; y: number }
}

interface DeadTap {
  id: string
  session_id: string
  page_url: string
  element_selector: string
  timestamp: string
  coordinates: { x: number; y: number }
}

export function RageClicks() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const funnelId = searchParams.get('funnelId')
  
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [rageClicks, setRageClicks] = useState<RageClick[]>([])
  const [deadTaps, setDeadTaps] = useState<DeadTap[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'rage-clicks' | 'dead-taps'>('rage-clicks')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d')
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadData()
    }
  }, [selectedProject, dateRange, activeTab])

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

  const loadData = async () => {
    if (!selectedProject) return

    setLoading(true)
    try {
      const endDate = new Date().toISOString()
      const startDate = new Date(Date.now() - (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90) * 24 * 60 * 60 * 1000).toISOString()

      if (activeTab === 'rage-clicks') {
        const response = await advancedAnalyticsAPI.getRageClicksSummary(selectedProject, startDate, endDate)
        setRageClicks(response.rage_clicks || [])
        setSummary(response.summary || null)
      } else {
        // Load dead taps
        const response = await advancedAnalyticsAPI.getDeadTaps(selectedProject, { start_date: startDate, end_date: endDate })
        setDeadTaps(response.dead_taps || [])
        setSummary(response.summary || null)
      }
    } catch (error) {
      console.error('Error loading data:', error)
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

  const getSeverityColor = (clickCount: number) => {
    if (clickCount >= 10) return '#ef4444' // red
    if (clickCount >= 5) return '#f59e0b' // orange
    return '#eab308' // yellow
  }

  const getSeverityLabel = (clickCount: number) => {
    if (clickCount >= 10) return 'Critical'
    if (clickCount >= 5) return 'High'
    return 'Medium'
  }

  const handleBack = () => {
    if (funnelId) {
      navigate(`/dashboard/funnels?funnelId=${funnelId}`)
    } else {
      navigate('/dashboard/funnels')
    }
  }

  return (
    <div className="dashboard-page-content">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={handleBack}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
            title={funnelId ? "Back to Funnel" : "Back to Funnels"}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div>
            <h1 className="page-title">Rage Clicks & Dead Taps</h1>
            <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.875rem' }}>
              Identify user friction and problematic interactions
            </p>
          </div>
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

      {/* Tabs */}
      <div className="tabs-container" style={{ marginBottom: '1.5rem' }}>
        <div className="tabs">
          <button
            onClick={() => setActiveTab('rage-clicks')}
            className={`tab ${activeTab === 'rage-clicks' ? 'tab-active' : ''}`}
          >
            <MousePointerClick className="icon-small" />
            Rage Clicks
            {summary?.total_rage_clicks > 0 && (
              <span className="tab-badge">{summary.total_rage_clicks}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('dead-taps')}
            className={`tab ${activeTab === 'dead-taps' ? 'tab-active' : ''}`}
          >
            <Hand className="icon-small" />
            Dead Taps
            {summary?.total_dead_taps > 0 && (
              <span className="tab-badge">{summary.total_dead_taps}</span>
            )}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
              <AlertTriangle size={24} style={{ color: '#ef4444' }} />
            </div>
            <div className="summary-content">
              <div className="summary-label">Total {activeTab === 'rage-clicks' ? 'Rage Clicks' : 'Dead Taps'}</div>
              <div className="summary-value">
                {activeTab === 'rage-clicks' ? summary.total_rage_clicks || 0 : summary.total_dead_taps || 0}
              </div>
              <div className="summary-meta">{getDateRangeLabel()}</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
              <ExternalLink size={24} style={{ color: '#8b5cf6' }} />
            </div>
            <div className="summary-content">
              <div className="summary-label">Affected Pages</div>
              <div className="summary-value">{summary.affected_pages || 0}</div>
              <div className="summary-meta">Unique pages</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <MousePointerClick size={24} style={{ color: '#3b82f6' }} />
            </div>
            <div className="summary-content">
              <div className="summary-label">Affected Sessions</div>
              <div className="summary-value">{summary.affected_sessions || 0}</div>
              <div className="summary-meta">User sessions</div>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading data...</p>
        </div>
      ) : activeTab === 'rage-clicks' ? (
        rageClicks.length > 0 ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Page URL</th>
                  <th>Element</th>
                  <th>Clicks</th>
                  <th>Session</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rageClicks.map((rageClick) => (
                  <tr key={rageClick.id}>
                    <td>
                      <span
                        className="severity-badge"
                        style={{ backgroundColor: getSeverityColor(rageClick.click_count) }}
                      >
                        {getSeverityLabel(rageClick.click_count)}
                      </span>
                    </td>
                    <td>
                      <div className="url-cell">
                        {rageClick.page_url.length > 50
                          ? rageClick.page_url.substring(0, 50) + '...'
                          : rageClick.page_url}
                      </div>
                    </td>
                    <td>
                      <code className="element-code">{rageClick.element_selector || 'N/A'}</code>
                    </td>
                    <td>
                      <strong>{rageClick.click_count}</strong> clicks
                    </td>
                    <td>
                      <a
                        href={`/dashboard/sessions/${selectedProject}/${rageClick.session_id}`}
                        className="session-link"
                      >
                        View Session
                      </a>
                    </td>
                    <td>
                      {new Date(rageClick.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <button className="icon-button">
                        <ExternalLink size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <h3>No rage clicks detected</h3>
            <p>Great! No rage clicks found in the selected time period.</p>
          </div>
        )
      ) : (
        deadTaps.length > 0 ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Page URL</th>
                  <th>Element</th>
                  <th>Session</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deadTaps.map((deadTap) => (
                  <tr key={deadTap.id}>
                    <td>
                      <div className="url-cell">
                        {deadTap.page_url.length > 50
                          ? deadTap.page_url.substring(0, 50) + '...'
                          : deadTap.page_url}
                      </div>
                    </td>
                    <td>
                      <code className="element-code">{deadTap.element_selector || 'N/A'}</code>
                    </td>
                    <td>
                      <a
                        href={`/dashboard/sessions/${selectedProject}/${deadTap.session_id}`}
                        className="session-link"
                      >
                        View Session
                      </a>
                    </td>
                    <td>
                      {new Date(deadTap.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <button className="icon-button">
                        <ExternalLink size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <h3>No dead taps detected</h3>
            <p>Great! No dead taps found in the selected time period.</p>
          </div>
        )
      )}
    </div>
  )
}

