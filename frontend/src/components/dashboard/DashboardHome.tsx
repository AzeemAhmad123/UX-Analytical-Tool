import { Video, User, Star, Calendar, Clock, Smartphone, Monitor } from 'lucide-react'
import { useState, useEffect } from 'react'
import { analyticsAPI, projectsAPI } from '../../services/api'
import './Dashboard.css'

type PlatformFilter = 'all' | 'mobile' | 'web'

export function DashboardHome() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadAnalytics()
    }
  }, [selectedProject, platformFilter])

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

  const loadAnalytics = async () => {
    if (!selectedProject) return
    
    try {
      setLoading(true)
      const response = await analyticsAPI.getOverview(selectedProject, {
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString(),
        platform_filter: platformFilter
      })
      setAnalytics(response)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !analytics) {
    return (
      <div className="dashboard-home">
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
          <p style={{ color: '#4b5563' }}>Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-home">
      {/* Project Selector */}
      {projects.length > 0 && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            className="stats-select"
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(e.target.value)}
            style={{ maxWidth: '300px' }}
          >
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          
          {/* Platform Filter */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.25rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '5px',
            padding: '0.25rem'
          }}>
            <button
              onClick={() => setPlatformFilter('all')}
              style={{
                padding: '0.375rem 0.625rem',
                backgroundColor: platformFilter === 'all' ? '#9333ea' : 'transparent',
                color: platformFilter === 'all' ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: platformFilter === 'all' ? '500' : '400',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              All Platforms
            </button>
            <button
              onClick={() => setPlatformFilter('mobile')}
              style={{
                padding: '0.375rem 0.625rem',
                backgroundColor: platformFilter === 'mobile' ? '#9333ea' : 'transparent',
                color: platformFilter === 'mobile' ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.8125rem',
                fontWeight: platformFilter === 'mobile' ? '500' : '400',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              <Smartphone style={{ width: '12px', height: '12px' }} />
              Mobile
            </button>
            <button
              onClick={() => setPlatformFilter('web')}
              style={{
                padding: '0.375rem 0.625rem',
                backgroundColor: platformFilter === 'web' ? '#9333ea' : 'transparent',
                color: platformFilter === 'web' ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.8125rem',
                fontWeight: platformFilter === 'web' ? '500' : '400',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              <Monitor style={{ width: '12px', height: '12px' }} />
              Web
            </button>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="empty-state">
          <h3>No projects yet</h3>
          <p>Create your first project to start tracking analytics</p>
          <a href="/dashboard/projects" className="btn-primary" style={{ marginTop: '1rem', textDecoration: 'none', display: 'inline-flex' }}>
            Go to Projects
          </a>
        </div>
      ) : (
        <>
          {/* Top Section - Usage Statistics and UX Statistics */}
          <div className="stats-grid">
            {/* Usage Statistics */}
            <div className="stats-card">
              <div className="stats-card-header">
                <h2 className="stats-card-title">Usage statistics</h2>
                <select className="stats-select">
                  <option>last 7 days</option>
                  <option>last 30 days</option>
                  <option>last 90 days</option>
                </select>
              </div>
              
              <div className="stats-items">
                <div className="stats-item">
                  <div className="stats-item-header">
                    <Video className="stats-item-icon" />
                    <span className="stats-item-label">Sessions</span>
                  </div>
                  <div className="stats-item-value">{analytics?.sessions || 0}</div>
                </div>
                
                <div className="stats-item">
                  <div className="stats-item-header">
                    <User className="stats-item-icon" />
                    <span className="stats-item-label">Active users</span>
                  </div>
                  <div className="stats-item-value">{analytics?.active_users || 0}</div>
                </div>
                
                <div className="stats-item">
                  <div className="stats-item-header">
                    <Star className="stats-item-icon" />
                    <span className="stats-item-label">Total events</span>
                  </div>
                  <div className="stats-item-value">{analytics?.total_events || 0}</div>
                </div>
              </div>
            </div>

            {/* UX Statistics */}
            <div className="stats-card">
              <h2 className="stats-card-title" style={{ marginBottom: '1rem' }}>Session Statistics</h2>
              
              <div className="ux-stats-grid">
                <div className="stats-item">
                  <div className="stats-item-header">
                    <Clock className="stats-item-icon" />
                    <span className="stats-item-label">Avg session duration</span>
                  </div>
                  <div className="stats-item-subvalue">{analytics?.avg_session_duration || 0}s</div>
                </div>
                
                <div className="stats-item">
                  <div className="stats-item-header">
                    <Video className="stats-item-icon" />
                    <span className="stats-item-label">Total events</span>
                  </div>
                  <div className="stats-item-subvalue">{analytics?.total_events || 0}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="charts-grid">
            {/* Sessions by Duration Chart */}
            <div className="chart-card">
              <h3 className="chart-title">Sessions Overview</h3>
              <div className="chart-placeholder">
                <div className="chart-placeholder-content">
                  <div className="chart-placeholder-text">Chart will be rendered here</div>
                  <div className="chart-placeholder-subtext">Sessions by duration over weeks</div>
                </div>
              </div>
            </div>

            {/* Count of Sessions Chart */}
            <div className="chart-card">
              <h3 className="chart-title">Events Timeline</h3>
              <div className="chart-placeholder">
                <div className="chart-placeholder-content">
                  <div className="chart-placeholder-text">Chart will be rendered here</div>
                  <div className="chart-placeholder-subtext">Events count over time</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ 
            marginBottom: '2rem', 
            padding: '1.5rem', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            color: 'white'
          }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>🧪 Test Your Funnels</h3>
            <p style={{ marginBottom: '1rem', opacity: 0.9 }}>
              Use our test website to simulate a complete user journey and test all funnel functionality.
            </p>
            <a 
              href="/funnel-test.html" 
              target="_blank"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: 'white',
                color: '#667eea',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Open Funnel Test Website →
            </a>
          </div>

          {/* Key Metrics Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <Video className="metric-icon" />
                <span className="metric-label">Total Sessions</span>
              </div>
              <div className="metric-value">{analytics?.sessions || 0}</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <User className="metric-icon" />
                <span className="metric-label">Active Users</span>
              </div>
              <div className="metric-value">{analytics?.active_users || 0}</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <Star className="metric-icon" />
                <span className="metric-label">Total Events</span>
              </div>
              <div className="metric-value">{analytics?.total_events || 0}</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <Clock className="metric-icon" />
                <span className="metric-label">Avg Duration</span>
              </div>
              <div className="metric-value">{analytics?.avg_session_duration || 0}s</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <Calendar className="metric-icon" />
                <span className="metric-label">Period</span>
              </div>
              <div className="metric-subvalue">Last 7 days</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

