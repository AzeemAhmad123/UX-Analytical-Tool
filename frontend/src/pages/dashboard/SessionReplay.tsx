import { useState, useEffect } from 'react'
import { Plus, SlidersHorizontal, Link2, ChevronDown, LayoutGrid } from 'lucide-react'
import { sessionsAPI, projectsAPI } from '../../services/api'
import '../../components/dashboard/Dashboard.css'

export function SessionReplay() {
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all')
  const [showBy, setShowBy] = useState('Sessions')
  const [sessions, setSessions] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadSessions()
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
    } finally {
      setLoading(false)
    }
  }

  const loadSessions = async () => {
    if (!selectedProject) return
    try {
      setLoading(true)
      const response = await sessionsAPI.getByProject(selectedProject, {
        limit: 50,
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString()
      })
      setSessions(response.sessions || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-page-content">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Session Replay</h1>
        <button className="icon-button">
          <Link2 className="icon" />
        </button>
      </div>

      {/* Project Selector */}
      {projects.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <select 
            className="time-filter-select"
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

      {/* Filters Row */}
      <div className="filters-row">
        <button className="filter-button">
          <LayoutGrid className="icon-small" />
          <span>All</span>
        </button>
        
        <button className="filter-button">
          <svg className="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
            <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/>
            <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/>
            <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
          </svg>
          <span>Dec 28, 2025 - Jan 3, 2026 (7 days)</span>
        </button>

        <button className="filter-button">
          <svg className="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>All users</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            onClick={() => setActiveTab('all')}
            className={`tab ${activeTab === 'all' ? 'tab-active' : ''}`}
          >
            All replays
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`tab ${activeTab === 'favorites' ? 'tab-active' : ''}`}
          >
            <svg className="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            Favorites
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="action-bar">
        <div className="action-bar-left">
          <button className="filter-button">
            <Plus className="icon-small" />
            <span>Filter by page</span>
          </button>
          
          <button className="filter-button">
            <SlidersHorizontal className="icon-small" />
            <span>Filters</span>
          </button>
        </div>

        <div className="action-bar-right">
          <div className="show-by-group">
            <span className="show-by-label">Show by</span>
            <button className="show-by-btn">
              <span className="show-by-text">{showBy}</span>
              <ChevronDown className="show-by-icon" />
            </button>
          </div>

          <button className="layout-grid-btn">
            <LayoutGrid className="layout-grid-icon" />
          </button>
        </div>
      </div>

      {/* Sessions List or Empty State */}
      {loading ? (
        <div className="empty-state-card">
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '2px solid #9333ea', 
            borderTop: 'transparent', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#4b5563' }}>Loading sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="empty-state-card">
          <h3 className="empty-state-title">No replays available</h3>
          <p className="empty-state-description">The filters don't match any sessions. Try broadening your filters.</p>
          <p className="empty-state-description">You can also increase your traffic coverage.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {sessions.map((session) => {
            // Use session_id from SDK (not database id) for navigation
            const displaySessionId = session.session_id || session.id
            const durationSeconds = session.duration ? Math.round(session.duration / 1000) : 0
            const formattedDuration = durationSeconds > 0 
              ? `${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')}`
              : '0:00'
            
            return (
              <div 
                key={session.id} 
                className="stats-card" 
                style={{ cursor: 'pointer' }} 
                onClick={() => window.location.href = `/dashboard/sessions/${selectedProject}/${displaySessionId}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                      Session {displaySessionId.substring(0, 12)}...
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280', flexWrap: 'wrap' }}>
                      <span>⏱️ {formattedDuration}</span>
                      <span>📊 {session.event_count || 0} events</span>
                      <span>🕐 {new Date(session.start_time).toLocaleString()}</span>
                    </div>
                  </div>
                  <div style={{ marginLeft: '1rem' }}>
                    <button 
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#9333ea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        window.location.href = `/dashboard/sessions/${selectedProject}/${displaySessionId}`
                      }}
                    >
                      ▶️ Play
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
