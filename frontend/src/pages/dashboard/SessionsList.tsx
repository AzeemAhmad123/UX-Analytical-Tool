import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Download, MoreVertical, Bookmark, MessageSquare, Filter, Calendar, Search, Bell, Trash2, Flame, AlertTriangle, Snowflake, X, Monitor, Smartphone } from 'lucide-react'
import { sessionsAPI, projectsAPI, analyticsAPI } from '../../services/api'
import { DateRangePicker } from '../../components/dashboard/DateRangePicker'
import '../../components/dashboard/Dashboard.css'

type PlatformFilter = 'all' | 'mobile' | 'web'

interface SessionMetrics {
  sessions: number
  users: number
  newUsers: number
  crashes: number
  crashFrequency: number
  rageTaps: number
  rageTapAverage: number
  rageClicks: number // Web-specific
  rageClickAverage: number // Web-specific
  scrollDepth: number // Web-specific
  pageExits: number // Web-specific
  totalTimeInApp: number // seconds
  averageTimeInApp: number // seconds
  screenVisits: number
  averageScreenVisits: number
  screenTransitions: number // Mobile-specific
}

// Helper function to detect platform from session
const detectPlatform = (session: any): 'mobile' | 'web' => {
  const deviceInfo = session.device_info || {}
  const viewportWidth = deviceInfo.viewportWidth || deviceInfo.screenWidth || 0
  const userAgent = deviceInfo.userAgent || ''
  
  // Check viewport width first
  if (viewportWidth > 0 && viewportWidth < 768) {
    return 'mobile'
  }
  
  // Check user agent as fallback
  if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
    return 'mobile'
  }
  
  return 'web'
}

export function SessionsList() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<any[]>([])
  const [allSessions, setAllSessions] = useState<any[]>([]) // Store all sessions for comparison
  // const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [previousMetrics, setPreviousMetrics] = useState<SessionMetrics | null>(null)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  })
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  // Background check for new sessions (non-disruptive)
  useEffect(() => {
    if (!selectedProject) return
    
    // Initial load with loading indicator
    loadSessions(true)
    
    // Check for new sessions in background (every 60 seconds - less frequent)
    // Only start checking after initial load is complete
    let intervalId: number | null = null
    const timeout = setTimeout(() => {
      intervalId = setInterval(() => {
        checkForNewSessions()
      }, 60000) // Check every 60 seconds
    }, 5000) // Wait 5 seconds after initial load before starting background checks
    
    return () => {
      clearTimeout(timeout)
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [selectedProject])

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll()
      const projectsList = response.projects || []
      // setProjects(projectsList)
      if (projectsList.length > 0) {
        setSelectedProject(projectsList[0].id)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSessions = async (showLoading = true) => {
    if (!selectedProject) return
    try {
      if (showLoading) {
      setLoading(true)
      }
      const response = await sessionsAPI.getByProject(selectedProject, {
        limit: 1000, // Load more sessions for accurate metrics
        start_date: dateRange.start.toISOString(),
        end_date: dateRange.end.toISOString()
      })
      const loadedSessions = response.sessions || []
      setAllSessions(loadedSessions)
      // Apply current filters
      applyFilters(loadedSessions, activeFilters, platformFilter)
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      if (showLoading) {
      setLoading(false)
      }
    }
  }

  // Check for new sessions in background (non-disruptive)
  const checkForNewSessions = async () => {
    if (!selectedProject || allSessions.length === 0) return
    
    try {
      // Only fetch recent sessions (last 5 minutes) to check for new ones
      const recentCheckTime = new Date(Date.now() - 5 * 60 * 1000)
      const response = await sessionsAPI.getByProject(selectedProject, {
        limit: 50, // Only check recent sessions
        start_date: recentCheckTime.toISOString(),
        end_date: dateRange.end.toISOString()
      })
      
      const recentSessions = response.sessions || []
      const currentSessionIds = new Set(allSessions.map((s: any) => s.id))
      
      // Find truly new sessions (not in current list)
      const trulyNewSessions = recentSessions.filter((s: any) => !currentSessionIds.has(s.id))
      
      if (trulyNewSessions.length > 0) {
        // Only update if there are new sessions
        // Add new sessions at the top, keep existing ones in their order
        const mergedSessions = [...trulyNewSessions, ...allSessions]
        
        setAllSessions(mergedSessions)
        // Apply current filters to merged sessions (silently, no loading state)
        applyFilters(mergedSessions, activeFilters, platformFilter)
      }
    } catch (error) {
      // Silently fail in background - don't disturb user
      // Only log in development
      if (import.meta.env.DEV) {
        console.error('Error checking for new sessions:', error)
      }
    }
  }

  // Reload sessions when date range changes (with loading indicator)
  useEffect(() => {
    if (selectedProject) {
      loadSessions(true) // Show loading when user changes date range
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.start.getTime(), dateRange.end.getTime(), selectedProject])

  // Handle click outside search box to hide it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchVisible(false)
      }
    }

    if (isSearchVisible) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSearchVisible])

  // Filter sessions based on active filters
  // Filter sessions by platform
  const filterByPlatform = (sessionsToFilter: any[], platform: PlatformFilter): any[] => {
    if (platform === 'all') {
      return sessionsToFilter
    }
    return sessionsToFilter.filter(session => {
      const sessionPlatform = detectPlatform(session)
      return sessionPlatform === platform
    })
  }

  const applyFilters = (sessionsToFilter: any[], filters: Set<string>, platform: PlatformFilter = platformFilter) => {
    // First apply platform filter
    let filtered = filterByPlatform(sessionsToFilter, platform)
    
    if (filters.size === 0) {
      setSessions(filtered)
      return
    }

    // With video: sessions that have snapshots
    if (filters.has('with_video')) {
      filtered = filtered.filter(s => (s.snapshot_count || 0) > 0)
    }

    // Rage tap: sessions with high click rate (more than 3 clicks per second)
    if (filters.has('rage_tap')) {
      filtered = filtered.filter(s => {
        const duration = (s.duration || 0) / 1000 // Convert to seconds
        const clicks = s.event_count || 0
        if (duration === 0) return false
        const clicksPerSecond = clicks / duration
        return clicksPerSecond > 3 // More than 3 clicks per second
      })
    }

    // Rage quit: sessions that ended abruptly (duration < 10 seconds)
    if (filters.has('rage_quit')) {
      filtered = filtered.filter(s => {
        const duration = (s.duration || 0) / 1000
        return duration > 0 && duration < 10
      })
    }

    // App crash: sessions with crash events (placeholder - would need crash detection)
    if (filters.has('app_crash')) {
      // For now, detect crashes as sessions with very short duration and no activity
      filtered = filtered.filter(s => {
        const duration = (s.duration || 0) / 1000
        const events = s.event_count || 0
        return duration < 5 && events < 2
      })
    }

    // UI freeze: sessions with long gaps between events (placeholder)
    if (filters.has('ui_freeze')) {
      // For now, detect as sessions with long duration but few events
      filtered = filtered.filter(s => {
        const duration = (s.duration || 0) / 1000
        const events = s.event_count || 0
        if (duration === 0 || events === 0) return false
        const eventsPerSecond = events / duration
        return duration > 30 && eventsPerSecond < 0.1 // Long session with very few events
      })
    }

    setSessions(filtered)
  }

  // Re-apply filters when platform filter changes
  useEffect(() => {
    if (allSessions.length > 0) {
      applyFilters(allSessions, activeFilters, platformFilter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformFilter])

  // Calculate metrics from filtered sessions
  const calculateMetrics = (sessionsToCalculate: any[]): SessionMetrics => {
    if (sessionsToCalculate.length === 0) {
      return {
        sessions: 0,
        users: 0,
        newUsers: 0,
        crashes: 0,
        crashFrequency: 0,
        rageTaps: 0,
        rageTapAverage: 0,
        rageClicks: 0,
        rageClickAverage: 0,
        scrollDepth: 0,
        pageExits: 0,
        totalTimeInApp: 0,
        averageTimeInApp: 0,
        screenVisits: 0,
        averageScreenVisits: 0,
        screenTransitions: 0
      }
    }

    // Use device_info to identify unique users across platforms
    // Same user on mobile + web counts as ONE user (cross-platform user tracking)
    // Priority: userId > anonymousId > session_id prefix (fallback)
    const uniqueUsers = new Set(
      sessionsToCalculate.map(s => {
        const deviceInfo = s.device_info || {}
        // Use userId if available (most reliable for cross-platform tracking)
        if (deviceInfo.userId) {
          return `user_${deviceInfo.userId}`
        }
        // Fallback to anonymousId if available
        if (deviceInfo.anonymousId) {
          return `anon_${deviceInfo.anonymousId}`
        }
        // Last resort: use session_id prefix (less reliable for cross-platform)
        // Extract a consistent identifier from session_id
        const sessionId = s.session_id || s.id
        return `session_${sessionId.split('_')[0] || sessionId}`
      })
    )
    const totalUsers = uniqueUsers.size
    
    // Calculate new users (sessions from last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const newUserSessions = sessionsToCalculate.filter(s => 
      new Date(s.start_time).getTime() > sevenDaysAgo
    )
    const newUsers = new Set(
      newUserSessions.map(s => {
        const deviceInfo = s.device_info || {}
        if (deviceInfo.userId) {
          return `user_${deviceInfo.userId}`
        }
        if (deviceInfo.anonymousId) {
          return `anon_${deviceInfo.anonymousId}`
        }
        const sessionId = s.session_id || s.id
        return `session_${sessionId.split('_')[0] || sessionId}`
      })
    ).size

    // Crashes (sessions with crash-like behavior)
    const crashes = sessionsToCalculate.filter(s => {
      const duration = (s.duration || 0) / 1000
      const events = s.event_count || 0
      return duration < 5 && events < 2
    }).length
    const crashFrequency = sessionsToCalculate.length > 0 
      ? (crashes / sessionsToCalculate.length) * 100 
      : 0

    // Separate sessions by platform for platform-specific metrics
    const mobileSessions = sessionsToCalculate.filter(s => detectPlatform(s) === 'mobile')
    const webSessions = sessionsToCalculate.filter(s => detectPlatform(s) === 'web')
    
    // Rage taps (mobile-specific: sessions with high tap rate)
    const rageTapSessions = mobileSessions.filter(s => {
      const duration = (s.duration || 0) / 1000
      const clicks = s.event_count || 0
      if (duration === 0) return false
      return (clicks / duration) > 3
    })
    const rageTaps = rageTapSessions.length
    const rageTapAverage = mobileSessions.length > 0 
      ? rageTaps / mobileSessions.length 
      : 0

    // Rage clicks (web-specific: sessions with high click rate)
    const rageClickSessions = webSessions.filter(s => {
      const duration = (s.duration || 0) / 1000
      const clicks = s.event_count || 0
      if (duration === 0) return false
      return (clicks / duration) > 3
    })
    const rageClicks = rageClickSessions.length
    const rageClickAverage = webSessions.length > 0 
      ? rageClicks / webSessions.length 
      : 0

    // Scroll depth (web-specific: average scroll percentage)
    // Estimate from session duration and event count
    const scrollDepth = webSessions.length > 0 
      ? webSessions.reduce((sum, s) => {
          const duration = (s.duration || 0) / 1000
          const events = s.event_count || 0
          // Estimate scroll depth: more events and longer duration = higher scroll
          if (duration === 0 || events === 0) return sum + 0
          // Simple heuristic: events per second * 10% (max 100%)
          const estimatedScroll = Math.min(100, (events / duration) * 10)
          return sum + estimatedScroll
        }, 0) / webSessions.length 
      : 0

    // Page exits (web-specific: sessions that ended quickly)
    const pageExits = webSessions.filter(s => {
      const duration = (s.duration || 0) / 1000
      return duration < 10 && s.event_count < 3
    }).length

    // Screen transitions (mobile-specific: navigation between screens)
    const screenTransitions = mobileSessions.reduce((sum, s) => {
      // Count page_view events or estimate from event count
      // Each screen transition is roughly an event (minus initial page load)
      return sum + Math.max(0, (s.event_count || 0) - 1)
    }, 0)

    // Time in app (mobile-specific: total time spent in mobile app)
    const mobileTotalTime = mobileSessions.reduce((sum, s) => sum + ((s.duration || 0) / 1000), 0)
    const mobileAverageTime = mobileSessions.length > 0 
      ? mobileTotalTime / mobileSessions.length 
      : 0
    // For "all platforms", show combined time
    const totalTime = platformFilter === 'all' 
      ? sessionsToCalculate.reduce((sum, s) => sum + ((s.duration || 0) / 1000), 0)
      : mobileTotalTime
    const averageTime = platformFilter === 'all'
      ? (sessionsToCalculate.length > 0 ? totalTime / sessionsToCalculate.length : 0)
      : mobileAverageTime

    // Screen visits (page views)
    const screenVisits = sessionsToCalculate.reduce((sum, s) => sum + (s.event_count || 0), 0)
    const averageScreenVisits = sessionsToCalculate.length > 0 
      ? screenVisits / sessionsToCalculate.length 
      : 0

    return {
      sessions: sessionsToCalculate.length,
      users: totalUsers,
      newUsers: newUsers,
      crashes: crashes,
      crashFrequency: crashFrequency,
      rageTaps: rageTaps,
      rageTapAverage: rageTapAverage,
      rageClicks: rageClicks,
      rageClickAverage: rageClickAverage,
      scrollDepth: scrollDepth,
      pageExits: pageExits,
      totalTimeInApp: totalTime,
      averageTimeInApp: averageTime,
      screenVisits: screenVisits,
      averageScreenVisits: averageScreenVisits,
      screenTransitions: screenTransitions
    }
  }

  // Calculate current metrics
  const currentMetrics = useMemo(() => calculateMetrics(sessions), [sessions])

  // Calculate previous period metrics for comparison (baseline = all sessions)
  useEffect(() => {
    if (allSessions.length > 0) {
      // Calculate metrics for all sessions (no filters) as baseline
      const baselineMetrics = calculateMetrics(allSessions)
      setPreviousMetrics(baselineMetrics)
    }
  }, [allSessions.length]) // Only depend on length to avoid infinite loops

  // Calculate percentage change
  const calculateChange = (current: number, previous: number): { value: number; isPositive: boolean } => {
    if (previous === 0) {
      // If previous is 0, any current value is 100% increase
      return current > 0 ? { value: 100, isPositive: true } : { value: 0, isPositive: true }
    }
    const change = ((current - previous) / previous) * 100
    return { value: Math.abs(change), isPositive: change >= 0 }
  }

  const toggleFilter = (filterType: string) => {
    const newFilters = new Set(activeFilters)
    if (newFilters.has(filterType)) {
      newFilters.delete(filterType)
    } else {
      newFilters.add(filterType)
    }
    setActiveFilters(newFilters)
    applyFilters(allSessions, newFilters, platformFilter)
  }

  const clearAllFilters = () => {
    setActiveFilters(new Set())
    setSessions(allSessions)
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)} sec`
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hrs`
    return `${(seconds / 86400).toFixed(1)} d`
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
    if (selectedSessions.size === sessions.length && sessions.length > 0) {
      setSelectedSessions(new Set())
    } else {
      setSelectedSessions(new Set(sessions.map(s => s.id)))
    }
  }

  // const deleteSession = async (sessionId: string) => {
  //   if (!selectedProject || !window.confirm('Are you sure you want to delete this session?')) {
  //     return
  //   }

  //   try {
  //     await sessionsAPI.delete(selectedProject, sessionId)
  //     loadSessions()
  //     const newSelected = new Set(selectedSessions)
  //     newSelected.delete(sessionId)
  //     setSelectedSessions(newSelected)
  //   } catch (error) {
  //     console.error('Error deleting session:', error)
  //     alert('Failed to delete session. Please try again.')
  //   }
  // }

  const deleteSelectedSessions = async () => {
    if (!selectedProject || selectedSessions.size === 0) {
      return
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedSessions.size} session(s)?`)) {
      return
    }

    try {
      await sessionsAPI.deleteMultiple(selectedProject, Array.from(selectedSessions))
      loadSessions()
      setSelectedSessions(new Set())
    } catch (error) {
      console.error('Error deleting sessions:', error)
      alert('Failed to delete sessions. Please try again.')
    }
  }

  // Get location from session
  const getLocation = (session: any) => {
    const deviceInfo = session.device_info || {}
    const city = session.city || deviceInfo.city || 'Unknown'
    const country = session.country || deviceInfo.country || deviceInfo.region || 'Unknown'
    return { city, country }
  }

  // Get device name
  const getDeviceName = (session: any) => {
    const deviceInfo = session.device_info || {}
    const userAgent = deviceInfo.userAgent || ''
    // Extract device name from user agent
    if (userAgent.includes('Samsung')) return 'SAMSUNG ' + userAgent.split('Samsung')[1]?.split(' ')[0] || 'UNKNOWN'
    if (userAgent.includes('iPhone')) return 'APPLE IPHONE'
    if (userAgent.includes('Pixel')) return 'GOOGLE PIXEL ' + userAgent.split('Pixel')[1]?.split(' ')[0] || ''
    return userAgent.split(' ')[0] || 'Unknown'
  }

  // Check if session has video (has snapshots)
  const hasVideo = (session: any) => {
    // Check snapshot_count field or check if session has snapshots
    return (session.snapshot_count || 0) > 0
  }

  // Calculate percentage changes (compare filtered vs all sessions)
  const baselineMetrics = previousMetrics || currentMetrics
  const sessionsChange = calculateChange(currentMetrics.sessions, baselineMetrics.sessions)
  // const usersChange = calculateChange(currentMetrics.users, baselineMetrics.users)
  const newUsersChange = calculateChange(currentMetrics.newUsers, baselineMetrics.newUsers)
  const crashesChange = calculateChange(currentMetrics.crashes, baselineMetrics.crashes)
  // const crashFreqChange = calculateChange(currentMetrics.crashFrequency, baselineMetrics.crashFrequency)
  const rageTapsChange = calculateChange(currentMetrics.rageTaps, baselineMetrics.rageTaps || 0)
  // const rageTapAvgChange = calculateChange(currentMetrics.rageTapAverage, baselineMetrics.rageTapAverage || 0)
  // const rageClicksChange = calculateChange(currentMetrics.rageClicks, baselineMetrics.rageClicks || 0)
  // const rageClickAvgChange = calculateChange(currentMetrics.rageClickAverage, baselineMetrics.rageClickAverage || 0)
  const totalTimeChange = calculateChange(currentMetrics.totalTimeInApp, baselineMetrics.totalTimeInApp)
  // const avgTimeChange = calculateChange(currentMetrics.averageTimeInApp, baselineMetrics.averageTimeInApp)
  const screenVisitsChange = calculateChange(currentMetrics.screenVisits, baselineMetrics.screenVisits)
  // const rageClickAvgChange = calculateChange(currentMetrics.rageClickAverage, baselineMetrics.rageClickAverage || 0)
  // const totalTimeChange = calculateChange(currentMetrics.totalTimeInApp, baselineMetrics.totalTimeInApp)
  // const avgTimeChange = calculateChange(currentMetrics.averageTimeInApp, baselineMetrics.averageTimeInApp)
  // const screenVisitsChange = calculateChange(currentMetrics.screenVisits, baselineMetrics.screenVisits)
  // const screenTransitionsChange = calculateChange(currentMetrics.screenTransitions, baselineMetrics.screenTransitions || 0)
  // const scrollDepthChange = calculateChange(currentMetrics.scrollDepth, baselineMetrics.scrollDepth || 0)
  // const pageExitsChange = calculateChange(currentMetrics.pageExits, baselineMetrics.pageExits || 0)

  return (
    <div className="dashboard-page-content" style={{ padding: 0, backgroundColor: '#f9fafb' }}>
      {/* Top Header Bar */}
      <div style={{ 
        padding: '0.75rem 1rem', 
        borderBottom: '1px solid #e5e7eb', 
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 1rem', 
            backgroundColor: '#9333ea', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}>
            <Filter className="icon-small" style={{ width: '14px', height: '14px' }} />
            Filters
            <span style={{ fontSize: '0.75rem' }}>▼</span>
          </button>
          <div ref={searchRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {!isSearchVisible ? (
              <button
                onClick={() => setIsSearchVisible(true)}
                style={{
                  padding: '0.5rem',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280'
                }}
              >
                <Search style={{ width: '20px', height: '20px' }} />
              </button>
            ) : (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search 
                  className="icon-small" 
                  style={{ 
                    position: 'absolute', 
                    left: '0.75rem', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: '#9ca3af', 
                    width: '16px', 
                    height: '16px',
                    pointerEvents: 'none'
                  }} 
                />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  autoFocus
                  style={{ 
                    padding: '0.5rem 1rem 0.5rem 2.5rem', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '5px',
                    fontSize: '0.875rem',
                    width: '200px',
                    outline: 'none'
                  }}
                />
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Platform Filter - Compact style */}
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
              All
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
          
          <DateRangePicker
            startDate={dateRange.start}
            endDate={dateRange.end}
            onApply={(start, end) => {
              setDateRange({ start, end })
            }}
          />
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ 
        padding: '0.5rem', 
        backgroundColor: 'white',
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '0.5rem'
      }}>
        {/* Sessions */}
        <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '5px',
          padding: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '5px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play style={{ width: '12px', height: '12px', color: '#6b7280' }} />
            </div>
            <div style={{ fontSize: '0.625rem', color: '#6b7280', fontWeight: '500' }}>Sessions</div>
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
            {currentMetrics.sessions >= 1000 
              ? (currentMetrics.sessions / 1000).toFixed(1) + 'K' 
              : currentMetrics.sessions.toLocaleString()}
          </div>
          <div style={{ 
            fontSize: '0.625rem', 
            color: sessionsChange.isPositive ? '#10b981' : '#ef4444',
            fontWeight: '500'
          }}>
            {sessionsChange.isPositive ? '+' : '-'}{sessionsChange.value.toFixed(1)}%
        </div>
      </div>

        {/* Users */}
        <div style={{ 
          backgroundColor: 'white', 
          border: '1px solid #e5e7eb',
          borderRadius: '5px',
          padding: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '5px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#6b7280' }}></div>
            </div>
            <div style={{ fontSize: '0.625rem', color: '#6b7280', fontWeight: '500' }}>Users</div>
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
            Total {currentMetrics.users.toLocaleString()}
            </div>
          <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.125rem' }}>
            New {currentMetrics.newUsers.toLocaleString()}
          </div>
          <div style={{ 
            fontSize: '0.625rem', 
            color: newUsersChange.isPositive ? '#10b981' : '#ef4444',
            fontWeight: '500'
          }}>
            {newUsersChange.isPositive ? '+' : '-'}{newUsersChange.value.toFixed(1)}%
          </div>
          </div>

        {/* Crashes - Common metric, shown for all platforms */}
        <div style={{ 
          backgroundColor: 'white', 
          border: '1px solid #e5e7eb',
          borderRadius: '5px',
          padding: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '5px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle style={{ width: '12px', height: '12px', color: '#ef4444' }} />
            </div>
            <div style={{ fontSize: '0.625rem', color: '#6b7280', fontWeight: '500' }}>Crashes</div>
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
            Total {currentMetrics.crashes}
          </div>
          <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.125rem' }}>
            Frequency {currentMetrics.crashFrequency.toFixed(2)}%
          </div>
          <div style={{ 
            fontSize: '0.625rem', 
            color: crashesChange.isPositive ? '#10b981' : '#ef4444',
            fontWeight: '500'
          }}>
            {crashesChange.isPositive ? '+' : '-'}{crashesChange.value.toFixed(1)}%
          </div>
        </div>

        {/* Rage Taps (Mobile-only) - Show when All or Mobile selected */}
        {platformFilter === 'all' ? (
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '5px',
            padding: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '5px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flame style={{ width: '12px', height: '12px', color: '#f97316' }} />
              </div>
              <div style={{ fontSize: '0.625rem', color: '#6b7280', fontWeight: '500' }}>
                Rage Taps <span style={{ fontSize: '0.5625rem', color: '#9ca3af', marginLeft: '0.25rem' }}>(Mobile-only)</span>
              </div>
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
              Total {currentMetrics.rageTaps}
            </div>
            <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.125rem' }}>
              Average {currentMetrics.rageTapAverage.toFixed(2)}
            </div>
            <div style={{ 
              fontSize: '0.625rem', 
              color: rageTapsChange.isPositive ? '#10b981' : '#ef4444',
              fontWeight: '500'
            }}>
              {rageTapsChange.isPositive ? '+' : '-'}{rageTapsChange.value.toFixed(1)}%
            </div>
          </div>
        ) : platformFilter === 'mobile' ? (
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '5px',
            padding: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '5px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flame style={{ width: '12px', height: '12px', color: '#f97316' }} />
              </div>
              <div style={{ fontSize: '0.625rem', color: '#6b7280', fontWeight: '500' }}>Rage Taps</div>
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
              {currentMetrics.rageTaps > 0 ? `Total ${currentMetrics.rageTaps}` : '—'}
            </div>
            <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.125rem' }}>
              {currentMetrics.rageTapAverage > 0 ? `Average ${currentMetrics.rageTapAverage.toFixed(2)}` : '—'}
            </div>
            {currentMetrics.rageTaps > 0 && (
              <div style={{ 
                fontSize: '0.625rem', 
                color: rageTapsChange.isPositive ? '#10b981' : '#ef4444',
                fontWeight: '500'
              }}>
                {rageTapsChange.isPositive ? '+' : '-'}{rageTapsChange.value.toFixed(1)}%
              </div>
            )}
          </div>
        ) : null}

        {/* Rage Clicks (Web-only) - Show when All or Web selected */}
        {platformFilter === 'all' ? (
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '5px',
            padding: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '5px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flame style={{ width: '12px', height: '12px', color: '#f97316' }} />
              </div>
              <div style={{ fontSize: '0.625rem', color: '#6b7280', fontWeight: '500' }}>
                Rage Clicks <span style={{ fontSize: '0.5625rem', color: '#9ca3af', marginLeft: '0.25rem' }}>(Web-only)</span>
              </div>
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
              {currentMetrics.rageClicks > 0 ? `Total ${currentMetrics.rageClicks}` : '—'}
            </div>
            <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.125rem' }}>
              {currentMetrics.rageClickAverage > 0 ? `Average ${currentMetrics.rageClickAverage.toFixed(2)}` : '—'}
            </div>
          </div>
        ) : platformFilter === 'web' ? (
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '5px',
            padding: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '5px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flame style={{ width: '12px', height: '12px', color: '#f97316' }} />
              </div>
              <div style={{ fontSize: '0.625rem', color: '#6b7280', fontWeight: '500' }}>Rage Clicks</div>
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
              {currentMetrics.rageClicks > 0 ? `Total ${currentMetrics.rageClicks}` : '—'}
            </div>
            <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.125rem' }}>
              {currentMetrics.rageClickAverage > 0 ? `Average ${currentMetrics.rageClickAverage.toFixed(2)}` : '—'}
            </div>
          </div>
        ) : null}

        {/* Screen Transitions (Mobile-only) - Show when All or Mobile selected */}
        {platformFilter === 'all' ? (
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '5px',
            padding: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '5px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '12px', height: '12px', border: '1.5px solid #6b7280', borderRadius: '2px' }}></div>
              </div>
              <div style={{ fontSize: '0.625rem', color: '#6b7280', fontWeight: '500' }}>
                Screen Transitions <span style={{ fontSize: '0.5625rem', color: '#9ca3af', marginLeft: '0.25rem' }}>(Mobile-only)</span>
              </div>
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
              {currentMetrics.screenTransitions > 0 
                ? (currentMetrics.screenTransitions >= 1000 
                  ? (currentMetrics.screenTransitions / 1000).toFixed(1) + 'K' 
                  : currentMetrics.screenTransitions.toLocaleString())
                : '—'}
            </div>
          </div>
        ) : platformFilter === 'mobile' ? (
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '5px',
            padding: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '5px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '12px', height: '12px', border: '1.5px solid #6b7280', borderRadius: '2px' }}></div>
              </div>
              <div style={{ fontSize: '0.625rem', color: '#6b7280', fontWeight: '500' }}>Screen Transitions</div>
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
              {currentMetrics.screenTransitions > 0 
                ? (currentMetrics.screenTransitions >= 1000 
                  ? (currentMetrics.screenTransitions / 1000).toFixed(1) + 'K' 
                  : currentMetrics.screenTransitions.toLocaleString())
                : '—'}
            </div>
          </div>
        ) : null}

        {/* Scroll Depth (Web-only) - Show when All or Web selected */}
        {platformFilter === 'all' ? (
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '5px',
            padding: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '5px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '12px', height: '12px', border: '1.5px solid #6b7280', borderRadius: '2px' }}></div>
              </div>
              <div style={{ fontSize: '0.625rem', color: '#6b7280', fontWeight: '500' }}>
                Scroll Depth <span style={{ fontSize: '0.5625rem', color: '#9ca3af', marginLeft: '0.25rem' }}>(Web-only)</span>
              </div>
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
              {currentMetrics.scrollDepth > 0 ? currentMetrics.scrollDepth.toFixed(1) + '%' : '—'}
            </div>
          </div>
        ) : platformFilter === 'web' ? (
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '5px',
            padding: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '5px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '12px', height: '12px', border: '1.5px solid #6b7280', borderRadius: '2px' }}></div>
              </div>
              <div style={{ fontSize: '0.625rem', color: '#6b7280', fontWeight: '500' }}>Scroll Depth</div>
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
              {currentMetrics.scrollDepth > 0 ? currentMetrics.scrollDepth.toFixed(1) + '%' : '—'}
            </div>
          </div>
        ) : null}

        {/* Page Exits (Web-only) - Show when All or Web selected */}
        {platformFilter === 'all' ? (
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '5px',
            padding: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '5px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: '12px', height: '12px', color: '#ef4444' }} />
              </div>
              <div style={{ fontSize: '0.625rem', color: '#6b7280', fontWeight: '500' }}>
                Page Exits <span style={{ fontSize: '0.5625rem', color: '#9ca3af', marginLeft: '0.25rem' }}>(Web-only)</span>
              </div>
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
              {currentMetrics.pageExits > 0 ? currentMetrics.pageExits : '—'}
            </div>
          </div>
        ) : platformFilter === 'web' ? (
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '5px',
            padding: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '5px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: '12px', height: '12px', color: '#ef4444' }} />
              </div>
              <div style={{ fontSize: '0.625rem', color: '#6b7280', fontWeight: '500' }}>Page Exits</div>
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
              {currentMetrics.pageExits > 0 ? currentMetrics.pageExits : '—'}
            </div>
          </div>
        ) : null}

        {/* Time in App (Mobile-only) - Show when All or Mobile selected */}
        {(platformFilter === 'all' || platformFilter === 'mobile') && (
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '5px',
            padding: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '5px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '12px', height: '12px', border: '2px solid #6b7280', borderRadius: '50%', borderTop: 'transparent' }}></div>
              </div>
              <div style={{ fontSize: '0.625rem', color: '#6b7280', fontWeight: '500' }}>
                Time in App {platformFilter === 'all' && <span style={{ fontSize: '0.5625rem', color: '#9ca3af', marginLeft: '0.25rem' }}>(Mobile-only)</span>}
              </div>
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
              {currentMetrics.totalTimeInApp > 0 ? `Total ${formatTime(currentMetrics.totalTimeInApp)}` : '—'}
            </div>
            <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.125rem' }}>
              {currentMetrics.averageTimeInApp > 0 ? `Average ${formatTime(currentMetrics.averageTimeInApp)}` : '—'}
            </div>
            {currentMetrics.totalTimeInApp > 0 && (
              <div style={{ 
                fontSize: '0.625rem', 
                color: totalTimeChange.isPositive ? '#10b981' : '#ef4444',
                fontWeight: '500'
              }}>
                {totalTimeChange.isPositive ? '+' : '-'}{totalTimeChange.value.toFixed(1)}%
              </div>
            )}
          </div>
        )}

        {/* Screen Visits */}
        <div style={{ 
          backgroundColor: 'white', 
          border: '1px solid #e5e7eb',
          borderRadius: '5px',
          padding: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '5px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '12px', height: '12px', border: '1.5px solid #6b7280', borderRadius: '2px' }}></div>
            </div>
            <div style={{ fontSize: '0.625rem', color: '#6b7280', fontWeight: '500' }}>Screen Visits</div>
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.125rem' }}>
            {currentMetrics.screenVisits >= 1000 
              ? (currentMetrics.screenVisits / 1000).toFixed(1) + 'K' 
              : currentMetrics.screenVisits.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.125rem' }}>
            Average {currentMetrics.averageScreenVisits.toFixed(2)}
          </div>
          <div style={{ 
            fontSize: '0.625rem', 
            color: screenVisitsChange.isPositive ? '#10b981' : '#ef4444',
            fontWeight: '500'
          }}>
            {screenVisitsChange.isPositive ? '+' : '-'}{screenVisitsChange.value.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div style={{ 
        padding: '0.75rem 1rem', 
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        alignItems: 'center'
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
            borderRadius: '5px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          <Play style={{ width: '14px', height: '14px' }} />
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
            borderRadius: '5px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          <Flame style={{ width: '14px', height: '14px' }} />
          Rage tap
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
            borderRadius: '5px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          <X style={{ width: '14px', height: '14px' }} />
          Rage quit
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
            borderRadius: '5px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          <AlertTriangle style={{ width: '14px', height: '14px' }} />
          App crash
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
            borderRadius: '5px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          <Snowflake style={{ width: '14px', height: '14px' }} />
          UI freeze
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
          cursor: 'pointer',
          fontWeight: '500'
        }}>
          Labels
          <span style={{ fontSize: '0.75rem' }}>▼</span>
        </button>
        {activeFilters.size > 0 && (
          <button 
            onClick={clearAllFilters}
            style={{ 
              color: '#2563eb', 
              border: 'none', 
              background: 'none',
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontWeight: '500',
              padding: '0.5rem 0'
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Session List Header */}
      <div style={{ 
        padding: '0.75rem 1rem', 
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
          {sessions.length.toLocaleString()} sessions
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
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              <Trash2 style={{ width: '16px', height: '16px' }} />
              Delete ({selectedSessions.size})
            </button>
          )}
          <button style={{ 
            padding: '0.5rem', 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}>
            <MoreVertical style={{ width: '16px', height: '16px', color: '#6b7280' }} />
          </button>
          <button style={{ 
            padding: '0.5rem', 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}>
            <Download style={{ width: '16px', height: '16px', color: '#6b7280' }} />
          </button>
        </div>
      </div>

      {/* Sessions Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'white' }}>
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
        <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: 'white' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>No sessions</h3>
          <p style={{ color: '#6b7280' }}>No sessions match the current filters.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedSessions.size === sessions.length && sessions.length > 0}
                    onChange={toggleAllSessions}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Session</th>
                <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                  Upload time
                  <span style={{ marginLeft: '0.25rem', fontSize: '0.625rem' }}>▼</span>
                </th>
                <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Location</th>
                <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Session #</th>
                <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Device</th>
                <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>App version</th>
                <th style={{ padding: '0.625rem 0.75rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Events</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, index) => {
                const durationSeconds = session.duration ? Math.round(session.duration / 1000) : 0
                const location = getLocation(session)
                const deviceName = getDeviceName(session)
                const sessionHasVideo = hasVideo(session)
                
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
                      if ((e.target as HTMLElement).closest('input[type="checkbox"]') || 
                          (e.target as HTMLElement).closest('button')) {
                        return
                      }
                      const sessionIdForNav = session.session_id || session.id
                      navigate(`/dashboard/sessions/${selectedProject}/${sessionIdForNav}`)
                    }}
                  >
                    <td style={{ padding: '0.75rem' }}>
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
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {sessionHasVideo && (
                        <button 
                          style={{ 
                            padding: '0.25rem', 
                              backgroundColor: '#2563eb', 
                            border: 'none', 
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                              const sessionIdForNav = session.session_id || session.id
                              navigate(`/dashboard/sessions/${selectedProject}/${sessionIdForNav}`)
                          }}
                        >
                            <Play style={{ width: '12px', height: '12px', color: 'white' }} />
                        </button>
                        )}
                        <div>
                          <div style={{ fontSize: '0.8125rem', fontWeight: '500', color: '#111827' }}>
                            {formatDuration(durationSeconds)}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: '#6b7280', fontFamily: 'monospace' }}>
                            {session.session_id?.substring(0, 16) || session.id.substring(0, 16)}...
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>
                            Session {index + 1}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontSize: '0.8125rem', color: '#111827' }}>
                        {formatTimeAgo(session.start_time)}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                        {new Date(session.start_time).toLocaleString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8125rem', color: '#111827' }}>
                      <div>{location.city}</div>
                      <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>{location.country}</div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8125rem', color: '#111827' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8125rem', color: '#111827' }}>
                      {deviceName}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8125rem', color: '#111827' }}>
                      {session.device_info?.appVersion || '1.0.0'}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8125rem', color: '#111827' }}>
                      {session.event_count || 0}
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
