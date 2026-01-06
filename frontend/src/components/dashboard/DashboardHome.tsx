import { Video, User, Star, Calendar, Clock, Hand, MapPin, Smartphone, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { analyticsAPI, projectsAPI } from '../../services/api'
import './Dashboard.css'

export function DashboardHome() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadAnalytics()
    }
  }, [selectedProject])

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
        end_date: new Date().toISOString()
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
        <div style={{ marginBottom: '1.5rem' }}>
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

