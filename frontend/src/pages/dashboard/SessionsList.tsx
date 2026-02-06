import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Download, MoreVertical, Filter, Search, Trash2, Flame, AlertTriangle, Snowflake, X, Monitor, Smartphone } from 'lucide-react'
import { sessionsAPI, projectsAPI } from '../../services/api'
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

// LocalStorage cache helpers for sessions
const SESSIONS_CACHE_PREFIX = 'uxcam_sessions_cache_'
const LAST_PROJECT_KEY = 'uxcam_last_selected_project'
const CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes cache expiry

const getLastSelectedProject = (): string | null => {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY)
  } catch (error) {
    return null
  }
}

const setLastSelectedProject = (projectId: string): void => {
  try {
    localStorage.setItem(LAST_PROJECT_KEY, projectId)
  } catch (error) {
    // Ignore errors
  }
}

const getCachedSessions = (projectId: string): any[] => {
  try {
    const cacheKey = `${SESSIONS_CACHE_PREFIX}${projectId}`
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return []
    
    const { sessions, timestamp } = JSON.parse(cached)
    const age = Date.now() - timestamp
    
    // Return cached sessions if not expired
    if (age < CACHE_EXPIRY_MS && Array.isArray(sessions)) {
      console.log(`📦 Loaded ${sessions.length} cached sessions for project ${projectId}`)
      return sessions
    } else {
      // Cache expired, remove it
      localStorage.removeItem(cacheKey)
      return []
    }
  } catch (error) {
    console.error('Error reading cached sessions:', error)
    return []
  }
}

const setCachedSessions = (projectId: string, sessions: any[]): void => {
  try {
    const cacheKey = `${SESSIONS_CACHE_PREFIX}${projectId}`
    const cacheData = {
      sessions,
      timestamp: Date.now()
    }
    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    console.log(`💾 Cached ${sessions.length} sessions for project ${projectId}`)
  } catch (error) {
    console.error('Error caching sessions:', error)
  }
}

const mergeSessions = (existing: any[], newSessions: any[]): any[] => {
  const sessionMap = new Map<string, any>()
  
  // Helper to get unique session identifier (try id first, then session_id)
  const getSessionKey = (session: any): string | null => {
    return session?.id || session?.session_id || null
  }
  
  // Add existing sessions to map
  existing.forEach(session => {
    const key = getSessionKey(session)
    if (key) {
      sessionMap.set(key, session)
    }
  })
  
  // Add/update with new sessions (newer sessions override older ones)
  newSessions.forEach(session => {
    const key = getSessionKey(session)
    if (key) {
      const existingSession = sessionMap.get(key)
      if (!existingSession) {
        // New session, add it
        sessionMap.set(key, session)
      } else {
        // Existing session, keep the newer one
        const existingTime = new Date(existingSession.start_time || existingSession.created_at || 0).getTime()
        const newTime = new Date(session.start_time || session.created_at || 0).getTime()
        if (newTime > existingTime) {
          sessionMap.set(key, session)
        }
      }
    }
  })
  
  // Convert back to array and sort by time (newest first)
  const merged = Array.from(sessionMap.values()).sort((a: any, b: any) => {
    const timeA = new Date(a.start_time || a.created_at || 0).getTime()
    const timeB = new Date(b.start_time || b.created_at || 0).getTime()
    return timeB - timeA
  })
  
  return merged
}

// Helper function to apply default filters: exclude sessions < 10 seconds and sessions without video
const applyDefaultFilters = (sessionsToFilter: any[]): any[] => {
  return sessionsToFilter.filter(s => {
    // Exclude sessions with duration < 10 seconds
    const duration = (s.duration || 0) / 1000 // Convert to seconds
    if (duration < 10) {
      return false
    }
    
    // Exclude sessions without video recordings (no snapshots)
    const snapshotCount = s.snapshot_count || 0
    if (snapshotCount === 0) {
      return false
    }
    
    return true
  })
}

export function SessionsList() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<any[]>([])
  const [allSessions, setAllSessions] = useState<any[]>([]) // Store all sessions for comparison
  // const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  // Track if we've loaded from database at least once (to know if "no sessions" is real)
  const [hasLoadedFromDatabase, setHasLoadedFromDatabase] = useState<boolean>(false)
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [previousMetrics, setPreviousMetrics] = useState<SessionMetrics | null>(null)
  const [dateRange, setDateRange] = useState(() => {
    // Default to last 2 days including today (end date is always today)
    const end = new Date()
    end.setHours(23, 59, 59, 999) // End of today
    const start = new Date(end)
    start.setDate(start.getDate() - 2) // 2 days ago
    start.setHours(0, 0, 0, 0) // Start of day
    return { start, end }
  })
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // CRITICAL: Load cached sessions for last selected project IMMEDIATELY on mount
  // This prevents "no sessions" flash even before projects load
  useLayoutEffect(() => {
    // Check if page was just refreshed - if so, clear cache to force fresh load
    const isPageRefresh = performance.navigation?.type === 1 || 
                         (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'reload'
    
    const lastProjectId = getLastSelectedProject()
    if (lastProjectId) {
      // If page was refreshed, clear cache to ensure we get latest sessions
      if (isPageRefresh) {
        try {
          const cacheKey = `${SESSIONS_CACHE_PREFIX}${lastProjectId}`
          localStorage.removeItem(cacheKey)
          console.log('🔄 Page refreshed - cleared cache to load fresh sessions')
        } catch (error) {
          // Ignore errors
        }
      }
      
      const cachedSessions = getCachedSessions(lastProjectId)
      if (cachedSessions.length > 0 && !isPageRefresh) {
        console.log(`⚡ Loading ${cachedSessions.length} cached sessions for last project (${lastProjectId}) immediately`)
        setAllSessions(cachedSessions)
        // Apply default filters to cached sessions (exclude < 10s and no video)
        const filteredCached = applyDefaultFilters(cachedSessions)
        setSessions(filteredCached)
        // Set project ID so other effects can use it
        setSelectedProject(lastProjectId)
      } else if (isPageRefresh) {
        // On refresh, set project but don't use cache - force fresh load
        setSelectedProject(lastProjectId)
      }
    }
  }, []) // Run only once on mount

  useEffect(() => {
    loadProjects()
  }, [])

  // CRITICAL: Load cached sessions synchronously BEFORE first render (useLayoutEffect)
  // This prevents "no sessions" flash - sessions appear instantly
  useLayoutEffect(() => {
    if (!selectedProject) {
      // Reset database load flag when project changes
      setHasLoadedFromDatabase(false)
      return
    }
    
    // Remember this project for next time
    setLastSelectedProject(selectedProject)
    
    // Reset database load flag when project changes (we need to check DB for new project)
    setHasLoadedFromDatabase(false)
    
    // Load cached sessions synchronously (runs before paint)
    const cachedSessions = getCachedSessions(selectedProject)
    if (cachedSessions.length > 0) {
      console.log(`⚡ Loading ${cachedSessions.length} cached sessions synchronously (before render)`)
      setAllSessions(cachedSessions)
      // Apply default filters to cached sessions (exclude < 10s and no video)
      const filteredCached = applyDefaultFilters(cachedSessions)
      // This prevents "no sessions" flash - sessions show immediately
      setSessions(filteredCached)
    }
  }, [selectedProject])
  
  // Load fresh sessions in background after cached sessions are shown
  useEffect(() => {
    if (!selectedProject) return
    
    // Ensure date range includes today for new sessions
    const now = new Date()
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)
    
    // Update date range if end date is not today
    if (dateRange.end.getTime() < now.getTime() - 60000) { // More than 1 minute ago
      setDateRange(prev => ({
        start: prev.start,
        end: endOfToday
      }))
    }
    
    // Load fresh sessions in background (non-blocking)
    // Cached sessions are already shown, so this just updates them
    loadSessions()
    
    // Check for new sessions in background (every 5 seconds for faster updates)
    let intervalId: number | null = null
    // Check immediately after a short delay to ensure checkForNewSessions is defined
    const initialTimeout = setTimeout(() => {
      checkForNewSessions()
    }, 1000) // Check after 1 second
    
    const timeout = setTimeout(() => {
      intervalId = setInterval(() => {
        checkForNewSessions()
      }, 5000) // Check every 5 seconds for faster updates
    }, 2000) // Start interval after 2 seconds
    
    // Also check when page becomes visible (user comes back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForNewSessions()
        loadSessions() // Also reload all sessions when tab becomes visible
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearTimeout(initialTimeout)
      clearTimeout(timeout)
      if (intervalId) {
        clearInterval(intervalId)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [selectedProject])

  const loadProjects = async () => {
    try {
      // Increased timeout to 30 seconds to handle slow Supabase queries
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000) // 30 second timeout
      )
      
      const apiPromise = projectsAPI.getAll()
      const response = await Promise.race([apiPromise, timeoutPromise]) as any
      const projectsList = response.projects || []
      // setProjects(projectsList)
      if (projectsList.length > 0) {
        const projectId = projectsList[0].id
        setSelectedProject(projectId)
        // Remember this project for next time
        setLastSelectedProject(projectId)
        } else {
          // No projects - nothing to do
        }
    } catch (error: any) {
      // Only log non-timeout errors (timeout might be expected on slow connections)
      if (error?.message !== 'Request timeout') {
        console.error('Error loading projects:', error)
      }
    }
  }

  const loadSessions = async () => {
    if (!selectedProject) {
      console.log('⚠️ loadSessions: No selected project')
      return
    }
    try {
      console.log('📡 Loading sessions for project:', selectedProject)
      console.log('📅 Date range:', {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      })
      
      // Load in background without blocking UI - no loading spinner
      // Increased timeout to 30 seconds to handle slow Supabase queries
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000) // 30 second timeout
      )
      
      const apiPromise = sessionsAPI.getByProject(selectedProject, {
        limit: 100, // Reduced from 1000 to 100 for faster initial load
        start_date: dateRange.start.toISOString(),
        end_date: dateRange.end.toISOString()
      })
      
      const response = await Promise.race([apiPromise, timeoutPromise]) as any
      console.log('✅ Sessions API response:', {
        hasResponse: !!response,
        hasSessions: !!(response?.sessions),
        sessionCount: response?.sessions?.length || 0,
        total: response?.total || 0,
        count: response?.count || 0
      })
      
      const loadedSessions = response.sessions || []
      console.log(`📊 Loaded ${loadedSessions.length} sessions from API`)
      
      // Sort sessions by start_time descending (newest first)
      const sortedSessions = [...loadedSessions].sort((a: any, b: any) => {
        const timeA = new Date(a.start_time || a.created_at || 0).getTime()
        const timeB = new Date(b.start_time || b.created_at || 0).getTime()
        return timeB - timeA // Descending order (newest first)
      })
      
      // Merge with existing sessions (from cache or previous load)
      const mergedSessions = mergeSessions(allSessions, sortedSessions)
      
      // Update cache with merged sessions
      setCachedSessions(selectedProject, mergedSessions)
      
      setAllSessions(mergedSessions)
      // Apply current filters
      applyFilters(mergedSessions, activeFilters, platformFilter)
      // Mark that we've successfully loaded from database
      setHasLoadedFromDatabase(true)
    } catch (error: any) {
      // Log all errors for debugging
      console.error('❌ Error loading sessions:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        error: error
      })
      // DON'T clear sessions on error - keep cached sessions visible
      // Only clear if we have no cached sessions
      if (allSessions.length === 0) {
        // No cached sessions, show empty state
        setAllSessions([])
        setSessions([])
        // If we've tried to load and got an error, mark as loaded (so we show "no sessions" not "loading")
        // But only if it's not a timeout (timeout means we're still trying)
        if (error?.message !== 'Request timeout') {
          setHasLoadedFromDatabase(true)
        }
      } else {
        // Keep cached sessions visible even if API fails
        console.log('⚠️ API error, but keeping cached sessions visible')
        // Mark as loaded since we have cached data to show
        setHasLoadedFromDatabase(true)
      }
    }
    // No finally block - we don't set loading state anymore
  }

  // Check for new sessions in background (non-disruptive)
  const checkForNewSessions = async () => {
    if (!selectedProject) return
    
    try {
      // Always check from the last 30 minutes to current time (increased from 10 minutes)
      // This ensures new sessions are always found regardless of date range filter
      const recentCheckTime = new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
      const now = new Date()
      
      const response = await sessionsAPI.getByProject(selectedProject, {
        limit: 100, // Increased from 50 to catch more recent sessions
        start_date: recentCheckTime.toISOString(),
        end_date: now.toISOString() // Always use current time, not dateRange.end
      })
      
      const recentSessions = response.sessions || []
      
      // If we have no sessions yet, just reload all sessions
      if (allSessions.length === 0) {
        console.log('🔄 No sessions yet, reloading all sessions...')
        loadSessions()
        return
      }
      
      // Get all existing session identifiers (try id first, then session_id)
      const currentSessionIds = new Set(
        allSessions.map((s: any) => s.id || s.session_id).filter(Boolean)
      )
      
      // Find truly new sessions (not in current list)
      const trulyNewSessions = recentSessions.filter((s: any) => {
        const sessionKey = s.id || s.session_id
        return sessionKey && !currentSessionIds.has(sessionKey)
      })
      
      // Mark as loaded since we successfully checked the database (even if no new sessions found)
      setHasLoadedFromDatabase(true)
      
      if (trulyNewSessions.length > 0) {
        console.log(`🆕 Found ${trulyNewSessions.length} new session(s)`, trulyNewSessions.map((s: any) => ({
          id: s.id,
          start_time: s.start_time,
          created_at: s.created_at,
          session_id: s.session_id
        })))
        // Merge new sessions with existing ones
        const mergedSessions = mergeSessions(allSessions, trulyNewSessions)
        
        // Update cache with merged sessions
        setCachedSessions(selectedProject, mergedSessions)
        
        setAllSessions(mergedSessions)
        // Apply current filters to merged sessions (silently, no loading state)
        applyFilters(mergedSessions, activeFilters, platformFilter)
      }
    } catch (error) {
      // Silently fail in background - don't disturb user
      // Keep existing sessions visible even if check fails
      // Only log in development
      if (import.meta.env.DEV) {
        console.error('Error checking for new sessions:', error)
      }
      // Don't clear sessions on error - keep cached sessions visible
      // Don't mark as loaded on error - we want to keep showing loading if we haven't successfully loaded yet
    }
  }

  // Reload sessions when date range changes
  useEffect(() => {
    if (selectedProject) {
      loadSessions() // Reload when date range changes
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
    console.log('🔍 Applying filters:', {
      inputCount: sessionsToFilter.length,
      filters: Array.from(filters),
      platform: platform
    })
    
    // First apply platform filter
    let filtered = filterByPlatform(sessionsToFilter, platform)
    console.log(`  After platform filter (${platform}): ${filtered.length} sessions`)
    
    // ALWAYS apply default filters: exclude sessions < 10 seconds and sessions without video recordings
    const beforeDefaultFilters = filtered.length
    filtered = applyDefaultFilters(filtered)
    console.log(`  After default filters (≥10s duration, has video): ${filtered.length} sessions (removed ${beforeDefaultFilters - filtered.length})`)
    
    if (filters.size === 0) {
      console.log(`✅ No additional filters, showing ${filtered.length} sessions`)
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

    console.log(`✅ Final filtered sessions: ${filtered.length}`)
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

    // Page exits (web-specific: sessions that ended quickly or abruptly)
    // A page exit is when a user leaves quickly (bounce) or the session ends unexpectedly
    const pageExits = webSessions.filter(s => {
      const duration = (s.duration || 0) / 1000 // Convert to seconds
      const events = s.event_count || 0
      const snapshots = s.snapshot_count || 0
      
      // Criteria for page exit:
      // 1. Very short duration (< 10 seconds) AND very few events (< 5)
      // 2. OR short duration (< 5 seconds) regardless of events (immediate bounce)
      // 3. OR has snapshots but very short duration (loaded but left quickly)
      const isQuickExit = duration < 10 && events < 5
      const isImmediateBounce = duration < 5
      const isLoadedButLeftQuickly = snapshots > 0 && duration < 8 && events < 3
      
      return isQuickExit || isImmediateBounce || isLoadedButLeftQuickly
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

    // Screen visits (page views) - use page_view_count if available, otherwise estimate from session activity
    // Screen visits = number of unique pages/screens viewed during sessions
    const screenVisits = sessionsToCalculate.reduce((sum, s) => {
      // Prefer page_view_count if available and > 0 (from backend) - this is the most accurate
      if (s.page_view_count !== undefined && s.page_view_count !== null && s.page_view_count > 0) {
        return sum + s.page_view_count
      }
      
      // Fallback: Estimate screen visits from session activity
      // Every active session has at least 1 screen visit (the initial page/screen)
      const hasActivity = (s.duration && s.duration > 0) || (s.event_count && s.event_count > 0) || (s.snapshot_count && s.snapshot_count > 0)
      
      if (!hasActivity) {
        // No activity = no screen visits
        return sum + 0
      }
      
      // Estimate additional screen visits based on activity
      let estimatedVisits = 1 // At least 1 screen visit per active session
      
      // If we have snapshots, estimate based on snapshot batches
      // Multiple snapshot batches might indicate page changes
      if (s.snapshot_count && s.snapshot_count > 0) {
        // Rough heuristic: every 20-30 snapshots might indicate a new page view
        // But also consider duration - longer sessions = more likely to have multiple pages
        const durationSeconds = (s.duration || 0) / 1000
        const snapshotsPerPage = 25 // Average snapshots per page
        const estimatedFromSnapshots = Math.max(1, Math.floor(s.snapshot_count / snapshotsPerPage))
        
        // Also consider duration: if session is > 30 seconds, likely multiple pages
        const estimatedFromDuration = durationSeconds > 30 ? Math.floor(durationSeconds / 30) : 1
        
        // Take the higher estimate (more conservative)
        estimatedVisits = Math.max(estimatedFromSnapshots, estimatedFromDuration, 1)
      } else if (s.duration && s.duration > 0) {
        // No snapshots but has duration - estimate from duration
        const durationSeconds = s.duration / 1000
        // Rough estimate: 1 page per 20-30 seconds of activity
        estimatedVisits = Math.max(1, Math.floor(durationSeconds / 25))
      } else if (s.event_count && s.event_count > 0) {
        // No snapshots or duration, but has events - estimate from event count
        // Rough heuristic: every 10-15 events might indicate a new page view
        estimatedVisits = Math.max(1, Math.floor(s.event_count / 12))
      }
      
      return sum + estimatedVisits
    }, 0)
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
    // Apply default filters even when clearing all filters
    applyFilters(allSessions, new Set(), platformFilter)
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
    // Try multiple possible field names for location data
    const city = deviceInfo.city || session.city || 'Unknown'
    const country = deviceInfo.country || session.country || deviceInfo.region || session.region || 'Unknown'
    return { city, country }
  }

  // Get device name
  const getDeviceName = (session: any) => {
    const deviceInfo = session.device_info || {}
    
    // Prefer deviceModel or device_model from device_info
    if (deviceInfo.deviceModel) {
      return deviceInfo.deviceModel.toUpperCase()
    }
    if (deviceInfo.device_model) {
      return deviceInfo.device_model.toUpperCase()
    }
    
    // Fallback to deviceType or device_type
    if (deviceInfo.deviceType) {
      return deviceInfo.deviceType.toUpperCase()
    }
    if (deviceInfo.device_type) {
      return deviceInfo.device_type.toUpperCase()
    }
    
    // Extract from user agent as last resort
    const userAgent = deviceInfo.userAgent || ''
    if (userAgent.includes('Samsung')) {
      const match = userAgent.match(/Samsung[\/\s]([A-Za-z0-9-]+)/i)
      return match ? `SAMSUNG ${match[1].toUpperCase()}` : 'SAMSUNG'
    }
    if (userAgent.includes('iPhone')) {
      const match = userAgent.match(/iPhone\s?(\d+)/i)
      return match ? `APPLE IPHONE ${match[1]}` : 'APPLE IPHONE'
    }
    if (userAgent.includes('Pixel')) {
      const match = userAgent.match(/Pixel\s?(\d+)/i)
      return match ? `GOOGLE PIXEL ${match[1]}` : 'GOOGLE PIXEL'
    }
    if (userAgent.includes('iPad')) {
      return 'APPLE IPAD'
    }
    
    // Default fallback
    return deviceInfo.platform ? deviceInfo.platform.toUpperCase() : 'UNKNOWN'
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
      {sessions.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: 'white' }}>
          {!hasLoadedFromDatabase ? (
            // Show loading state until we've checked the database
            <>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                border: '3px solid #e5e7eb', 
                borderTop: '3px solid #9333ea', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem'
              }}></div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>Loading sessions...</h3>
              <p style={{ color: '#6b7280' }}>Please wait while we fetch your sessions.</p>
            </>
          ) : (
            // Only show "no sessions" if we've confirmed there are none in the database
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>No sessions</h3>
              <p style={{ color: '#6b7280' }}>No sessions match the current filters.</p>
            </>
          )}
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
