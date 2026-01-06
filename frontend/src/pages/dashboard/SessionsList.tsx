import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Download, MoreVertical, Bookmark, MessageSquare, Filter, Calendar, Search, Bell, Trash2 } from 'lucide-react'
import { sessionsAPI, projectsAPI, analyticsAPI } from '../../services/api'
import '../../components/dashboard/Dashboard.css'

export function SessionsList() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<any[]>([])
  const [filteredSessions, setFilteredSessions] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadSessions()
      loadStats()
      
      // Auto-refresh sessions every 10 seconds to show real-time updates
      const interval = setInterval(() => {
        loadSessions()
      }, 10000)
      
      return () => clearInterval(interval)
    }
  }, [selectedProject])

  // Initialize filteredSessions when sessions change
  useEffect(() => {
    if (sessions.length > 0 && filteredSessions.length === 0) {
      setFilteredSessions(sessions)
    }
  }, [sessions])

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
        limit: 100,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString()
      })
      setSessions(response.sessions || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!selectedProject) return
    try {
      const response = await analyticsAPI.getOverview(selectedProject, {
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString()
      })
      setStats(response)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
  }

  const toggleSessionSelection = (sessionId: string) => {
    const newSelected = new Set(selectedSessions)
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId)
    } else {
      newSelected.add(sessionId)
    }
    setSelectedSessions(newSelected)
  }

  const toggleAllSessions = () => {
    if (selectedSessions.size === filteredSessions.length && filteredSessions.length > 0) {
      setSelectedSessions(new Set())
    } else {
      setSelectedSessions(new Set(filteredSessions.map(s => s.id)))
    }
  }

  const toggleFilter = (filterType: string) => {
    const newFilters = new Set(activeFilters)
    if (newFilters.has(filterType)) {
      newFilters.delete(filterType)
    } else {
      newFilters.add(filterType)
    }
    setActiveFilters(newFilters)
    
    // Apply filters to sessions
    if (newFilters.size === 0) {
      setFilteredSessions(sessions)
    } else {
      // For now, just show all sessions (filtering logic can be added later)
      setFilteredSessions(sessions)
    }
  }

  const deleteSession = async (sessionId: string) => {
    if (!selectedProject || !window.confirm('Are you sure you want to delete this session?')) {
      return
    }

    try {
      await sessionsAPI.delete(selectedProject, sessionId)
      // Reload sessions
      loadSessions()
      // Remove from selected
      const newSelected = new Set(selectedSessions)
      newSelected.delete(sessionId)
      setSelectedSessions(newSelected)
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Failed to delete session. Please try again.')
    }
  }

  const deleteSelectedSessions = async () => {
    if (!selectedProject || selectedSessions.size === 0) {
      return
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedSessions.size} session(s)?`)) {
      return
    }

    try {
      await sessionsAPI.deleteMultiple(selectedProject, Array.from(selectedSessions))
      // Reload sessions
      loadSessions()
      // Clear selection
      setSelectedSessions(new Set())
    } catch (error) {
      console.error('Error deleting sessions:', error)
      alert('Failed to delete sessions. Please try again.')
    }
  }

  return (
    <div className="dashboard-page-content" style={{ padding: 0 }}>
      {/* Top Header Bar */}
      <div style={{ 
        padding: '1rem 1.5rem', 
        borderBottom: '1px solid #e5e7eb', 
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button style={{ padding: '0.5rem', border: 'none', background: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: '1.25rem' }}>←</span>
          </button>
          <button style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 1rem', 
            backgroundColor: '#9333ea', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}>
            Filters
            <span style={{ fontSize: '0.75rem' }}>▼</span>
          </button>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 1rem', 
            backgroundColor: '#f3f4f6', 
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            Segments | All sessions
          </div>
          <div style={{ position: 'relative' }}>
            <Search className="icon-small" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input 
              type="text" 
              placeholder="Search..." 
              style={{ 
                padding: '0.5rem 1rem 0.5rem 2.5rem', 
                border: '1px solid #e5e7eb', 
                borderRadius: '6px',
                fontSize: '0.875rem',
                width: '200px'
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 1rem', 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}>
            <Bell className="icon-small" />
            Create alert
          </button>
          <button style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 1rem', 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}>
            <Calendar className="icon-small" />
            Last 30 days
            <span style={{ fontSize: '0.75rem' }}>▼</span>
          </button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      {stats && (
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: '#f9fafb',
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '1rem'
        }}>
          <div className="stats-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Sessions</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
              {stats.sessions ? (stats.sessions / 1000).toFixed(1) + 'K' : '0'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>-4.5%</div>
          </div>
          <div className="stats-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Users</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
              {stats.active_users || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#22c55e' }}>+96.7%</div>
          </div>
          <div className="stats-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Crashes</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>2</div>
            <div style={{ fontSize: '0.75rem', color: '#22c55e' }}>+4.7%</div>
          </div>
          <div className="stats-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Rage Taps</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>70</div>
            <div style={{ fontSize: '0.75rem', color: '#22c55e' }}>+75%</div>
          </div>
          <div className="stats-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Time in App</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>6.5 days</div>
            <div style={{ fontSize: '0.75rem', color: '#22c55e' }}>+5.9%</div>
          </div>
          <div className="stats-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Screen Visits</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
              {stats.sessions ? (stats.sessions / 1000).toFixed(1) + 'K' : '0'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>-4.5%</div>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div style={{ 
        padding: '1rem 1.5rem', 
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap'
      }}>
        <button 
          onClick={() => toggleFilter('with_video')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 1rem', 
            backgroundColor: activeFilters.has('with_video') ? '#2563eb' : '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            opacity: activeFilters.has('with_video') ? 1 : 0.9
          }}
        >
          <Play className="icon-small" style={{ width: '14px', height: '14px' }} />
          With video
        </button>
        <button 
          onClick={() => toggleFilter('rage_tap')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 1rem', 
            backgroundColor: activeFilters.has('rage_tap') ? '#ea580c' : '#f97316', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            opacity: activeFilters.has('rage_tap') ? 1 : 0.9
          }}
        >
          🔥 Rage tap
        </button>
        <button 
          onClick={() => toggleFilter('rage_quit')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 1rem', 
            backgroundColor: activeFilters.has('rage_quit') ? '#dc2626' : '#ef4444', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            opacity: activeFilters.has('rage_quit') ? 1 : 0.9
          }}
        >
          → Rage quit
        </button>
        <button 
          onClick={() => toggleFilter('app_crash')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 1rem', 
            backgroundColor: activeFilters.has('app_crash') ? '#dc2626' : '#ef4444', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            opacity: activeFilters.has('app_crash') ? 1 : 0.9
          }}
        >
          ⚠️ App crash
        </button>
        <button 
          onClick={() => toggleFilter('ui_freeze')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 1rem', 
            backgroundColor: activeFilters.has('ui_freeze') ? '#2563eb' : '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            opacity: activeFilters.has('ui_freeze') ? 1 : 0.9
          }}
        >
          ❄️ UI freeze
        </button>
        <button style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          padding: '0.5rem 1rem', 
          backgroundColor: 'white', 
          border: '1px solid #e5e7eb', 
          borderRadius: '6px',
          fontSize: '0.875rem',
          cursor: 'pointer'
        }}>
          Labels
          <span style={{ fontSize: '0.75rem' }}>▼</span>
        </button>
      </div>

      {/* Session List Header */}
      <div style={{ 
        padding: '1rem 1.5rem', 
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
          {filteredSessions.length > 0 ? filteredSessions.length : sessions.length} sessions
          {activeFilters.size > 0 && ` (filtered from ${sessions.length})`}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {selectedSessions.size > 0 && (
            <button 
              onClick={deleteSelectedSessions}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem', 
                backgroundColor: '#fee2e2', 
                color: '#dc2626',
                border: '1px solid #fca5a5', 
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              <Trash2 className="icon-small" style={{ width: '16px', height: '16px' }} />
              Delete ({selectedSessions.size})
            </button>
          )}
          <button style={{ 
            padding: '0.5rem', 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            <MoreVertical className="icon-small" />
          </button>
          <button style={{ 
            padding: '0.5rem', 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            <Download className="icon-small" />
          </button>
        </div>
      </div>

      {/* Sessions Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
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
        <div className="empty-state">
          <h3>No sessions found</h3>
          <p>Start tracking events to see sessions here.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedSessions.size === (filteredSessions.length > 0 ? filteredSessions : sessions).length && (filteredSessions.length > 0 ? filteredSessions : sessions).length > 0}
                    onChange={toggleAllSessions}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}></th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Session</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Upload time</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Location</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Session #</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Device</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>App version</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Events</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, index) => {
                // Duration is stored in milliseconds, convert to seconds for display
                const durationSeconds = session.duration ? Math.round(session.duration / 1000) : 0
                const deviceInfo = session.device_info || {}
                const deviceName = deviceInfo.userAgent ? deviceInfo.userAgent.split(' ')[0] : 'Unknown'
                
                return (
                  <tr 
                    key={session.id} 
                    style={{ 
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    onClick={(e) => {
                      // Don't navigate if clicking on checkbox or delete button
                      if ((e.target as HTMLElement).closest('input[type="checkbox"]') || 
                          (e.target as HTMLElement).closest('button')) {
                        return
                      }
                      // Use session_id (SDK session ID) for navigation, not database id
                      const sessionIdForNav = session.session_id || session.id
                      navigate(`/dashboard/sessions/${selectedProject}/${sessionIdForNav}`)
                    }}
                  >
                    <td style={{ padding: '1rem' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedSessions.has(session.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          toggleSessionSelection(session.id)
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%' }}></div>
                        <Bookmark className="icon-small" style={{ color: '#9ca3af', width: '14px', height: '14px' }} />
                        <MessageSquare className="icon-small" style={{ color: '#9ca3af', width: '14px', height: '14px' }} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteSession(session.id)
                          }}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          title="Delete session"
                        >
                          <Trash2 style={{ width: '12px', height: '12px' }} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button 
                          style={{ 
                            padding: '0.25rem', 
                            backgroundColor: '#f3f4f6', 
                            border: 'none', 
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            // Use session_id (SDK session ID) for navigation, not database id
                            const sessionIdForNav = session.session_id || session.id
                            navigate(`/dashboard/sessions/${selectedProject}/${sessionIdForNav}`)
                          }}
                        >
                          <Play className="icon-small" style={{ width: '12px', height: '12px', color: '#6b7280' }} />
                        </button>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                            {formatDuration(durationSeconds)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>
                            {session.session_id?.substring(0, 16) || session.id.substring(0, 16)}...
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                            Session {index + 1}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.875rem', color: '#111827' }}>
                        {formatTimeAgo(session.start_time)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {new Date(session.start_time).toLocaleString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#111827' }}>
                      {deviceInfo.timezone || 'Unknown'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#111827' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#111827' }}>
                      {deviceName}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#111827' }}>
                      {deviceInfo.appVersion || '1.0.0'}
                    </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#111827' }}>
                          {session.snapshot_count || session.event_count || 0}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteSession(session.id)
                            }}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fca5a5',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontWeight: '500'
                            }}
                            title="Delete session"
                          >
                            <Trash2 style={{ width: '16px', height: '16px' }} />
                            Delete
                          </button>
                        </td>
                      </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

