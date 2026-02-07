import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Play, Pause, ChevronRight, FastForward, User, MapPin, Calendar, Tag, MousePointer, MousePointerClick, Scroll, Type, Move, Eye, Focus, Bookmark, Circle, Settings, Maximize, Minimize, MessageCircle, SkipBack, SkipForward, RotateCcw } from 'lucide-react'
import { sessionsAPI } from '../../services/api'
import { Replayer } from 'rrweb'
import '../../components/dashboard/Dashboard.css'

type Platform = 'web' | 'mobile'

// LocalStorage cache helpers for session replay data
const SESSION_DATA_CACHE_PREFIX = 'uxcam_session_data_'
const SESSION_SNAPSHOTS_CACHE_PREFIX = 'uxcam_session_snapshots_'
const SESSION_EVENTS_CACHE_PREFIX = 'uxcam_session_events_'
const CACHE_EXPIRY_MS = 30 * 60 * 1000 // 30 minutes cache expiry (sessions don't change)

const getCachedSessionData = (projectId: string, sessionId: string): any | null => {
  try {
    const cacheKey = `${SESSION_DATA_CACHE_PREFIX}${projectId}_${sessionId}`
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null
    
    const { data, timestamp } = JSON.parse(cached)
    const age = Date.now() - timestamp
    
    if (age < CACHE_EXPIRY_MS && data) {
      console.log(`📦 Loaded cached session data for ${sessionId}`)
      return data
    } else {
      localStorage.removeItem(cacheKey)
      return null
    }
  } catch (error) {
    return null
  }
}

const setCachedSessionData = (projectId: string, sessionId: string, data: any): void => {
  try {
    const cacheKey = `${SESSION_DATA_CACHE_PREFIX}${projectId}_${sessionId}`
    localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }))
  } catch (error) {
    // Ignore errors
  }
}

const getCachedSnapshots = (projectId: string, sessionId: string): any[] => {
  try {
    const cacheKey = `${SESSION_SNAPSHOTS_CACHE_PREFIX}${projectId}_${sessionId}`
    const cached = localStorage.getItem(cacheKey)
    if (!cached) {
      console.log(`📭 No cached snapshots found for ${sessionId}`)
      return []
    }
    
    const { snapshots, timestamp } = JSON.parse(cached)
    const age = Date.now() - timestamp
    
    if (age < CACHE_EXPIRY_MS && Array.isArray(snapshots)) {
      console.log(`📦 Loaded ${snapshots.length} cached snapshots for ${sessionId} (age: ${Math.round(age / 1000)}s)`)
      return snapshots
    } else {
      console.log(`⏰ Cache expired for ${sessionId} (age: ${Math.round(age / 1000)}s)`)
      localStorage.removeItem(cacheKey)
      return []
    }
  } catch (error) {
    console.error('Error reading cached snapshots:', error)
    return []
  }
}

const setCachedSnapshots = (projectId: string, sessionId: string, snapshots: any[]): void => {
  try {
    const cacheKey = `${SESSION_SNAPSHOTS_CACHE_PREFIX}${projectId}_${sessionId}`
    localStorage.setItem(cacheKey, JSON.stringify({ snapshots, timestamp: Date.now() }))
    console.log(`💾 Cached ${snapshots.length} snapshots for ${sessionId}`)
  } catch (error) {
    // Ignore errors
  }
}

const getCachedEvents = (projectId: string, sessionId: string): any[] => {
  try {
    const cacheKey = `${SESSION_EVENTS_CACHE_PREFIX}${projectId}_${sessionId}`
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return []
    
    const { events, timestamp } = JSON.parse(cached)
    const age = Date.now() - timestamp
    
    if (age < CACHE_EXPIRY_MS && Array.isArray(events)) {
      console.log(`📦 Loaded ${events.length} cached events for ${sessionId}`)
      return events
    } else {
      localStorage.removeItem(cacheKey)
      return []
    }
  } catch (error) {
    return []
  }
}

const setCachedEvents = (projectId: string, sessionId: string, events: any[]): void => {
  try {
    const cacheKey = `${SESSION_EVENTS_CACHE_PREFIX}${projectId}_${sessionId}`
    localStorage.setItem(cacheKey, JSON.stringify({ events, timestamp: Date.now() }))
  } catch (error) {
    // Ignore errors
  }
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

export function SessionReplayPlayer() {
  const { projectId, sessionId } = useParams()
  const navigate = useNavigate()
  const replayContainerRef = useRef<HTMLDivElement>(null)
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true) // Track if data is being loaded
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([]) // All sessions for left panel
  const [events, setEvents] = useState<any[]>([]) // Events for activity timeline
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFinished, setIsFinished] = useState(false) // Track if replay has finished
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [skipInactivity, setSkipInactivity] = useState(false)
  const [isSkippingInactivity, setIsSkippingInactivity] = useState(false)
  const basePlaybackSpeedRef = useRef(1) // Use ref to avoid stale closures
  const inactivityCheckIntervalRef = useRef<number | null>(null)
  const playerRef = useRef<Replayer | null>(null)
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null)
  const progressUpdateIntervalRef = useRef<number | null>(null) // For continuous progress updates
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [hasVideo, setHasVideo] = useState(false)
  const [activeTab, setActiveTab] = useState<'activity' | 'info' | 'notes' | 'logs'>('activity')
  const [activeFilter, setActiveFilter] = useState<'events' | 'gestures' | 'screens'>('events')
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('web')
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null)
  const [bookmarkedSessions, setBookmarkedSessions] = useState<Set<string>>(new Set())
  const [isReplayExpanded, setIsReplayExpanded] = useState<boolean>(false) // Track if replay container is expanded

  // CRITICAL: Clean up previous session when switching sessions
  useLayoutEffect(() => {
    if (!projectId || !sessionId) return
    
    // Clean up previous player if it exists (when switching sessions)
    if (playerRef.current) {
      try {
        console.log('🧹 Cleaning up previous player before loading new session')
        
        // Clean up cursor overlay BEFORE destroying player or clearing container
        if ((playerRef.current as any)._cursorOverlay) {
          const overlay = (playerRef.current as any)._cursorOverlay
          try {
            // Safely remove overlay - check if it's still connected to DOM
            if (overlay && overlay.parentNode && overlay.parentNode.contains(overlay)) {
              overlay.parentNode.removeChild(overlay)
            } else if (overlay && overlay.remove) {
              // Use remove() method if available (more modern)
              overlay.remove()
            }
          } catch (e) {
            // Ignore errors - overlay might already be removed
            console.debug('Overlay already removed or not in DOM')
          }
        }
        
        // Clean up all intervals and listeners
        if ((playerRef.current as any)._sandboxObserver) {
          (playerRef.current as any)._sandboxObserver.disconnect()
        }
        if ((playerRef.current as any)._sandboxCheckInterval) {
          clearInterval((playerRef.current as any)._sandboxCheckInterval)
        }
        if ((playerRef.current as any)._timeUpdateInterval) {
          clearInterval((playerRef.current as any)._timeUpdateInterval)
        }
        if ((playerRef.current as any)._progressListener) {
          try {
            playerRef.current.off('progress', (playerRef.current as any)._progressListener)
          } catch (e) {
            // Ignore errors
          }
        }
        if ((playerRef.current as any)._mouseMoveInterval) {
          clearInterval((playerRef.current as any)._mouseMoveInterval)
        }
        if ((playerRef.current as any)._inactivityCheckInterval) {
          clearInterval((playerRef.current as any)._inactivityCheckInterval)
        }
        if ((playerRef.current as any)._visibilityCheckInterval) {
          clearInterval((playerRef.current as any)._visibilityCheckInterval)
        }
        if ((playerRef.current as any)._progressUpdateInterval) {
          cancelAnimationFrame((playerRef.current as any)._progressUpdateInterval)
        }
        if (progressUpdateIntervalRef.current) {
          cancelAnimationFrame(progressUpdateIntervalRef.current)
          progressUpdateIntervalRef.current = null
        }
        if ((playerRef.current as any)._eventCheckInterval) {
          clearInterval((playerRef.current as any)._eventCheckInterval)
        }
        // Clean up click and scroll containers
        if ((playerRef.current as any)._clickContainer) {
          try {
            const container = (playerRef.current as any)._clickContainer
            if (container && container.parentNode) {
              container.parentNode.removeChild(container)
            }
          } catch (e) {
            // Ignore errors
          }
        }
        if ((playerRef.current as any)._scrollContainer) {
          try {
            const container = (playerRef.current as any)._scrollContainer
            if (container && container.parentNode) {
              container.parentNode.removeChild(container)
            }
          } catch (e) {
            // Ignore errors
          }
        }
        
        // Pause and destroy player
        try {
          playerRef.current.pause()
          playerRef.current.destroy()
        } catch (e) {
          // Ignore destroy errors
          console.debug('Error destroying player (may already be destroyed):', e)
        }
        playerRef.current = null
      } catch (e) {
        console.error('Error cleaning up previous player:', e)
      }
    }
    
    // Clear container for new session (AFTER cleaning up player)
    // Don't clear here - let initializePlayer() handle it to avoid React conflicts
    // The container will be cleared in initializePlayer() before creating new player
    
    // Load cached data FIRST for new session (before clearing state)
    const cachedSessionData = getCachedSessionData(projectId, sessionId)
    const cachedSnapshots = getCachedSnapshots(projectId, sessionId)
    const cachedEvents = getCachedEvents(projectId, sessionId)
    
    // Reset state for new session (only if no cached data, or always reset to ensure clean state)
    setCurrentTime(0)
    setIsPlaying(false)
    setIsFinished(false) // Reset finished state when loading new session
    setError(null)
    setHasVideo(false)
    setVideoUrl(null)
    
    // Set cached data immediately (or clear if no cache)
    if (cachedSessionData) {
      console.log(`⚡ Loading cached session data immediately for ${sessionId}`)
      setSession(cachedSessionData.session || cachedSessionData)
      
      // Set platform if available
      if (cachedSessionData.session?.device_info || cachedSessionData.device_info) {
        const deviceInfo = cachedSessionData.session?.device_info || cachedSessionData.device_info
        const viewportWidth = deviceInfo.viewportWidth || deviceInfo.screenWidth || 0
        const detectedPlatform: Platform = viewportWidth > 0 && viewportWidth < 768 ? 'mobile' : 'web'
        setSelectedPlatform(detectedPlatform)
      }
      
      // Check for video in cached data
      const videoUrl = cachedSessionData.session?.video_url || cachedSessionData.session?.videoUrl || cachedSessionData.video_url || cachedSessionData.videoUrl || null
      const hasVideoFlag = cachedSessionData.session?.has_video || cachedSessionData.session?.hasVideo || cachedSessionData.has_video || cachedSessionData.hasVideo || false
      
      if (hasVideoFlag && videoUrl) {
        setHasVideo(true)
        setVideoUrl(videoUrl)
        const videoDuration = cachedSessionData.session?.video_duration || cachedSessionData.session?.videoDuration || cachedSessionData.video_duration || cachedSessionData.videoDuration
        if (videoDuration) {
          setDuration(videoDuration)
        }
      } else if (videoUrl) {
        setHasVideo(true)
        setVideoUrl(videoUrl)
        const videoDuration = cachedSessionData.session?.video_duration || cachedSessionData.session?.videoDuration || cachedSessionData.video_duration || cachedSessionData.videoDuration
        if (videoDuration) {
          setDuration(videoDuration)
        }
      }
      
      // Set duration
      if (cachedSessionData.session) {
        const startTime = new Date(cachedSessionData.session.start_time).getTime()
        const endTime = new Date(cachedSessionData.session.last_activity_time).getTime()
        const calculatedDuration = endTime - startTime
        if (calculatedDuration > 0) {
          setDuration(calculatedDuration)
        }
      }
    } else {
      setSession(null)
      setDuration(0)
    }
    
    // Set cached snapshots (or clear if no cache)
    if (cachedSnapshots.length > 0) {
      console.log(`⚡ Loading ${cachedSnapshots.length} cached snapshots immediately for ${sessionId}`)
      setSnapshots(cachedSnapshots)
    } else {
      setSnapshots([])
    }
    
    // Set cached events (or clear if no cache)
    if (cachedEvents.length > 0) {
      console.log(`⚡ Loading ${cachedEvents.length} cached events immediately for ${sessionId}`)
      setEvents(cachedEvents)
    } else {
      setEvents([])
    }
    
    // If we have cached data (snapshots or video), we're not loading
    // Otherwise, we need to fetch data, so set loading to true
    // Check for video in cached data (we may have just set it above)
    const cachedVideoUrl = cachedSessionData?.session?.video_url || cachedSessionData?.session?.videoUrl || cachedSessionData?.video_url || cachedSessionData?.videoUrl || null
    const hasCachedData = cachedSnapshots.length > 0 || !!cachedVideoUrl
    setIsLoadingData(!hasCachedData)
  }, [projectId, sessionId])

  useEffect(() => {
    let isMounted = true
    
    if (projectId) {
      loadAllSessions().catch((error: any) => {
        if (error?.name !== 'AbortError' && isMounted) {
          console.error('Error loading sessions:', error)
        }
      })
    }
    if (projectId && sessionId) {
      // Set loading state when starting to fetch data
      // (Only if we don't have cached data - useLayoutEffect already handled that)
      const cachedSnapshots = getCachedSnapshots(projectId, sessionId)
      const cachedSessionData = getCachedSessionData(projectId, sessionId)
      const hasCachedData = cachedSnapshots.length > 0 || (cachedSessionData?.session?.video_url || cachedSessionData?.session?.videoUrl)
      
      if (!hasCachedData) {
        setIsLoadingData(true)
      }
      
      // Load fresh data in parallel for faster loading (non-blocking)
      // Cached data is already shown, so this just updates it
      
      // Add timeout to prevent infinite loading (70 seconds - longer than backend 60s timeout)
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn('⚠️ Session data loading timeout after 70 seconds')
          setIsLoadingData(false)
          setError('Loading timeout: The session data is taking too long to load. This may be due to network issues, CORS problems, or a very large session. Please check the browser console for errors and try refreshing the page.')
        }
      }, 70000)
      
      Promise.all([
        loadSessionData(),
        loadSnapshots(),
        loadEvents()
      ])
        .then(() => {
          // Data loading complete
          clearTimeout(timeoutId)
          if (isMounted) {
            setIsLoadingData(false)
          }
        })
        .catch((error: any) => {
          clearTimeout(timeoutId)
          if (error?.name !== 'AbortError' && isMounted) {
            console.error('Error loading session replay data:', error)
            setIsLoadingData(false) // Stop loading on error
            // Error messages are already set by individual load functions
          }
        })
    }
    
    return () => {
      isMounted = false
    }
  }, [projectId, sessionId])

  useEffect(() => {
    // CRITICAL: Create Replayer when snapshots are loaded for current session
    // This will reinitialize when switching sessions (snapshots change)
    if (snapshots.length > 0 && replayContainerRef.current && !playerRef.current && sessionId) {
      console.log('🎬 useEffect: Conditions met, initializing player', {
        sessionId,
        snapshotsCount: snapshots.length,
        hasContainer: !!replayContainerRef.current,
        containerReady: replayContainerRef.current.offsetWidth > 0,
        platform: selectedPlatform,
        skipInactivity: skipInactivity,
        playerExists: !!playerRef.current
      })
      // Initialize immediately - use double RAF for guaranteed DOM readiness
      // First RAF ensures we're in the next frame, second ensures DOM is painted
      let rafId1: number
      const rafId2 = requestAnimationFrame(() => {
        rafId1 = requestAnimationFrame(() => {
        initializePlayer()
        })
      })
      return () => {
        cancelAnimationFrame(rafId2)
        if (rafId1) cancelAnimationFrame(rafId1)
      }
    }
  }, [snapshots.length, sessionId, selectedPlatform, skipInactivity])

  // Skip Inactivity Detection and Speed Control
  // This implements UXCam-style skip inactivity by dynamically changing playback speed
  // Set up/tear down when skipInactivity toggle changes or player is initialized
  useEffect(() => {
      // Only set up if skip inactivity is enabled and player exists
      if (!skipInactivity || !playerRef.current || snapshots.length === 0) {
        // Clean up if disabled
        if (inactivityCheckIntervalRef.current) {
          clearInterval(inactivityCheckIntervalRef.current)
          inactivityCheckIntervalRef.current = null
        }
        // Reset speed if we were skipping
        if (isSkippingInactivity && playerRef.current && !(playerRef.current as any).destroyed) {
          try {
            playerRef.current.setConfig({ speed: basePlaybackSpeedRef.current })
            setIsSkippingInactivity(false)
          } catch (e) {
            // Ignore errors
          }
        }
        return
      }
      
      const INACTIVITY_THRESHOLD = 3000 // 3 seconds in milliseconds
      const SKIP_SPEED = 12 // 12x speed during inactivity
      
      // Calculate first event timestamp for relative time calculations
      const firstEvent = snapshots.find((e: any) => e && e.timestamp)
      if (!firstEvent || !firstEvent.timestamp) {
        return // Can't calculate without timestamps
      }
      const firstEventTimestamp = firstEvent.timestamp
      
      const checkInactivity = () => {
        // Check if replayer is still valid
        if (!playerRef.current || (playerRef.current as any).destroyed || !isPlaying) {
          // If not playing, ensure we're at normal speed
          if (isSkippingInactivity) {
            try {
              if (playerRef.current && !(playerRef.current as any).destroyed) {
                playerRef.current.setConfig({ speed: basePlaybackSpeedRef.current })
              }
              setIsSkippingInactivity(false)
            } catch (e) {
              // Ignore errors
            }
          }
          return
        }
        
        try {
          // Get current playback time (relative to session start) - use replayer's time for accuracy
          let currentPlaybackTime = currentTime
          try {
            if (playerRef.current && !(playerRef.current as any).destroyed) {
              const replayerTime = playerRef.current.getCurrentTime()
              if (typeof replayerTime === 'number' && !isNaN(replayerTime)) {
                currentPlaybackTime = replayerTime
              }
            }
          } catch (e) {
            // Fallback to state
          }
          
          // Find the last event that has occurred (relative timestamp <= currentPlaybackTime)
          let lastEventIndex = -1
          let lastEventRelativeTime = 0
          for (let i = snapshots.length - 1; i >= 0; i--) {
            const event = snapshots[i]
            if (event && event.timestamp) {
              const relativeTime = event.timestamp - firstEventTimestamp
              if (relativeTime <= currentPlaybackTime) {
                lastEventIndex = i
                lastEventRelativeTime = relativeTime
                break
              }
            }
          }
          
          // Find the next event that will occur (relative timestamp > currentPlaybackTime)
          let nextEventIndex = -1
          let nextEventRelativeTime = Infinity
          for (let i = 0; i < snapshots.length; i++) {
            const event = snapshots[i]
            if (event && event.timestamp) {
              const relativeTime = event.timestamp - firstEventTimestamp
              if (relativeTime > currentPlaybackTime) {
                nextEventIndex = i
                nextEventRelativeTime = relativeTime
                break
              }
            }
          }
          
          // Calculate time gap between last and next event
          if (lastEventIndex >= 0 && nextEventIndex >= 0) {
            const timeGap = nextEventRelativeTime - lastEventRelativeTime
            const timeSinceLastEvent = currentPlaybackTime - lastEventRelativeTime
            const timeUntilNextEvent = nextEventRelativeTime - currentPlaybackTime
            
            // Check if we're in an inactivity period (gap > 3 seconds and we're between events)
            // Only skip if we're more than 100ms into the gap and more than 100ms before the next event
            if (timeGap > INACTIVITY_THRESHOLD && timeSinceLastEvent > 100 && timeUntilNextEvent > 100) {
              // We're in an inactive period - speed up
              if (!isSkippingInactivity) {
                try {
                  if (playerRef.current && !(playerRef.current as any).destroyed) {
                    playerRef.current.setConfig({ speed: SKIP_SPEED })
                    setIsSkippingInactivity(true)
                    console.log('⏩ Skipping inactivity period', {
                      gap: timeGap,
                      timeSinceLast: timeSinceLastEvent,
                      timeUntilNext: timeUntilNextEvent,
                      currentTime: currentPlaybackTime,
                      lastEventTime: lastEventRelativeTime,
                      nextEventTime: nextEventRelativeTime
                    })
                  }
                } catch (e) {
                  console.warn('Error setting skip speed:', e)
                }
              }
            } else {
              // We're in an active period or near an event - normal speed
              if (isSkippingInactivity) {
                try {
                  if (playerRef.current && !(playerRef.current as any).destroyed) {
                    playerRef.current.setConfig({ speed: basePlaybackSpeedRef.current })
                    setIsSkippingInactivity(false)
                    console.log('▶️ Resuming normal speed', {
                      gap: timeGap,
                      timeUntilNext: timeUntilNextEvent
                    })
                  }
                } catch (e) {
                  console.warn('Error resetting speed:', e)
                }
              }
            }
          } else if (nextEventIndex === -1) {
            // No more events, return to normal speed
            if (isSkippingInactivity) {
              try {
                if (playerRef.current && !(playerRef.current as any).destroyed) {
                  playerRef.current.setConfig({ speed: basePlaybackSpeedRef.current })
                }
                setIsSkippingInactivity(false)
              } catch (e) {
                // Ignore errors
              }
            }
          }
        } catch (error) {
          console.warn('Error checking inactivity:', error)
        }
      }
      
      // Check inactivity every 200ms for responsive speed changes
      inactivityCheckIntervalRef.current = setInterval(checkInactivity, 200) as any
      
      // Initial check
      checkInactivity()
      
      // Cleanup
      return () => {
        if (inactivityCheckIntervalRef.current) {
          clearInterval(inactivityCheckIntervalRef.current)
          inactivityCheckIntervalRef.current = null
        }
        // Reset speed on cleanup
        if (isSkippingInactivity && playerRef.current && !(playerRef.current as any).destroyed) {
          try {
            playerRef.current.setConfig({ speed: basePlaybackSpeedRef.current })
            setIsSkippingInactivity(false)
          } catch (e) {
            // Ignore errors
          }
        }
      }
    }, [skipInactivity, isPlaying, currentTime, snapshots, isSkippingInactivity])
    
    // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          console.log('🧹 Cleaning up player on unmount')
          // Clean up MutationObserver if it exists
          if ((playerRef.current as any)._sandboxObserver) {
            (playerRef.current as any)._sandboxObserver.disconnect()
          }
          // Clean up interval if it exists
          if ((playerRef.current as any)._sandboxCheckInterval) {
            clearInterval((playerRef.current as any)._sandboxCheckInterval)
          }
          // Clean up time update interval
          if ((playerRef.current as any)._timeUpdateInterval) {
            clearInterval((playerRef.current as any)._timeUpdateInterval)
          }
          // Clean up progress listener
          if ((playerRef.current as any)._progressListener) {
            playerRef.current.off('progress', (playerRef.current as any)._progressListener)
          }
          // Clean up cursor overlay
          if ((playerRef.current as any)._cursorOverlay) {
            const overlay = (playerRef.current as any)._cursorOverlay
            try {
              // Safely remove overlay - check if it's still connected to DOM
              if (overlay && overlay.parentNode && overlay.parentNode.contains(overlay)) {
              overlay.parentNode.removeChild(overlay)
              } else if (overlay && overlay.remove) {
                // Use remove() method if available (more modern)
                overlay.remove()
              }
            } catch (e) {
              // Ignore errors - overlay might already be removed
              console.debug('Overlay already removed or not in DOM')
            }
          }
          // Clean up mouse move interval
          if ((playerRef.current as any)._mouseMoveInterval) {
            clearInterval((playerRef.current as any)._mouseMoveInterval)
          }
          // Clean up inactivity check interval
          if ((playerRef.current as any)._inactivityCheckInterval) {
            clearInterval((playerRef.current as any)._inactivityCheckInterval)
          }
          if (inactivityCheckIntervalRef.current) {
            clearInterval(inactivityCheckIntervalRef.current)
            inactivityCheckIntervalRef.current = null
          }
          // Clean up visibility check interval
          if ((playerRef.current as any)._visibilityCheckInterval) {
            clearInterval((playerRef.current as any)._visibilityCheckInterval)
          }
          // Clean up progress update interval (requestAnimationFrame)
          if ((playerRef.current as any)._progressUpdateInterval) {
            cancelAnimationFrame((playerRef.current as any)._progressUpdateInterval)
          }
          if (progressUpdateIntervalRef.current) {
            cancelAnimationFrame(progressUpdateIntervalRef.current)
            progressUpdateIntervalRef.current = null
          }
          // Clean up event check interval
          if ((playerRef.current as any)._eventCheckInterval) {
            clearInterval((playerRef.current as any)._eventCheckInterval)
          }
          // Clean up click and scroll containers
          if ((playerRef.current as any)._clickContainer) {
            try {
              const container = (playerRef.current as any)._clickContainer
              if (container && container.parentNode) {
                container.parentNode.removeChild(container)
              }
            } catch (e) {
              // Ignore errors
            }
          }
          if ((playerRef.current as any)._scrollContainer) {
            try {
              const container = (playerRef.current as any)._scrollContainer
              if (container && container.parentNode) {
                container.parentNode.removeChild(container)
              }
            } catch (e) {
              // Ignore errors
            }
          }
          // No need to restore - we're not overriding anything globally anymore
          playerRef.current.pause()
          playerRef.current.destroy()
          playerRef.current = null
          if (replayContainerRef.current) {
            replayContainerRef.current.innerHTML = ''
          }
        } catch (e) {
          console.error('Error cleaning up player:', e)
        }
      }
    }
  }, []) // Only run on unmount

  const loadAllSessions = async () => {
    if (!projectId) return
    try {
      const response = await sessionsAPI.getByProject(projectId, {
        limit: 50,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString()
      })
      // Apply default filters: exclude sessions < 10 seconds and sessions without video
      const allSessions = response.sessions || []
      const filteredSessions = applyDefaultFilters(allSessions)
      console.log(`📊 Loaded ${allSessions.length} sessions, filtered to ${filteredSessions.length} (excluded < 10s and no video)`)
      setSessions(filteredSessions)
    } catch (error: any) {
      // Only log non-abort errors (abort errors are expected when component unmounts or requests are cancelled)
      if (error?.name !== 'AbortError' && error?.message !== 'signal is aborted without reason') {
        console.error('Error loading sessions:', error)
      }
    }
  }

  const loadSessionData = async () => {
    if (!projectId || !sessionId) return
    
    try {
      const response = await sessionsAPI.getById(projectId, sessionId)
      
      // Cache session data
      setCachedSessionData(projectId, sessionId, response)
      
      setSession(response.session)
      
      // Detect platform from device_info
      if (response.session?.device_info) {
        const deviceInfo = response.session.device_info
        const viewportWidth = deviceInfo.viewportWidth || deviceInfo.screenWidth || 0
        // If viewport width is less than 768px, it's likely mobile
        const detectedPlatform: Platform = viewportWidth > 0 && viewportWidth < 768 ? 'mobile' : 'web'
        setSelectedPlatform(detectedPlatform)
      }
      
      // Debug: Log location data
      console.log('📍 Session location data:', {
        device_info: response.session?.device_info,
        location: response.session?.location,
        city: response.session?.device_info?.city || response.session?.location?.city,
        country: response.session?.device_info?.country || response.session?.location?.country,
      })
      
      // Set duration from session data (prefer session.duration from database)
      if (response.session) {
        // Prefer session.duration from database (most accurate)
        if (response.session.duration) {
          setDuration(response.session.duration)
          const durationSeconds = Math.round(response.session.duration / 1000)
          console.log(`✅ Using session duration from database: ${response.session.duration}ms (${durationSeconds}s)`)
        } else {
          // Fallback: calculate from timestamps
        const startTime = new Date(response.session.start_time).getTime()
        const endTime = new Date(response.session.last_activity_time).getTime()
        const calculatedDuration = endTime - startTime
        if (calculatedDuration > 0) {
          setDuration(calculatedDuration)
            const durationSeconds = Math.round(calculatedDuration / 1000)
            console.log(`✅ Calculated duration from timestamps: ${calculatedDuration}ms (${durationSeconds}s)`)
          }
        }
        
        // Check for video (mobile sessions) - check multiple possible fields
        const videoUrl = response.session.video_url || response.session.videoUrl || null
        const hasVideoFlag = response.session.has_video || response.session.hasVideo || false
        
        if (hasVideoFlag && videoUrl) {
          setHasVideo(true)
          setVideoUrl(videoUrl)
          // Use video duration if available
          const videoDuration = response.session.video_duration || response.session.videoDuration
          if (videoDuration) {
            setDuration(videoDuration)
          }
          console.log('📹 Mobile session with video:', videoUrl)
        } else if (videoUrl) {
          // If video URL exists but flag is not set, still show video
          setHasVideo(true)
          setVideoUrl(videoUrl)
          const videoDuration = response.session.video_duration || response.session.videoDuration
          if (videoDuration) {
            setDuration(videoDuration)
          }
          console.log('📹 Video URL found (flag not set):', videoUrl)
        }
      }
      
      if (response.events) {
        setEvents(response.events)
      }
    } catch (error: any) {
      // Only log non-abort errors (abort errors are expected when component unmounts or requests are cancelled)
      if (error?.name === 'AbortError' || error?.message === 'signal is aborted without reason') {
        // Don't set error state for abort errors - they're expected when component unmounts
        console.log('Request was cancelled (this is normal when navigating away)')
        return
      }
      
      console.error('Error loading session:', error)
      setError('Failed to load session data')
    }
  }

  const loadEvents = async (): Promise<void> => {
    if (!projectId || !sessionId) return
    try {
      // Load events for the activity timeline
      // The backend returns snapshots, not separate events
      // We'll extract event information from snapshots if needed
      const response = await sessionsAPI.getById(projectId, sessionId)
      if (response.snapshots && Array.isArray(response.snapshots)) {
        // Convert snapshots to events for the activity timeline
        const eventList = response.snapshots
          .filter((e: any) => e && typeof e.type === 'number')
          .map((e: any) => ({
            id: e.timestamp || Date.now(),
            type: e.type,
            timestamp: e.timestamp,
            data: e.data
          }))
        setEvents(eventList)
        // Cache events
        setCachedEvents(projectId, sessionId, eventList)
        console.log(`✅ Loaded ${eventList.length} events for activity timeline`)
      } else if (response.events) {
        setEvents(response.events)
        // Cache events
        setCachedEvents(projectId, sessionId, response.events)
      }
    } catch (error: any) {
      // Only log non-abort errors (abort errors are expected when component unmounts or requests are cancelled)
      if (error?.name !== 'AbortError' && error?.message !== 'signal is aborted without reason') {
        console.error('Error loading events:', error)
      }
    }
  }

  const loadSnapshots = async (): Promise<void> => {
    if (!projectId || !sessionId) return
    
    try {
      // Load in background without blocking UI
      setError(null)
      
      // Use sessions API which returns snapshots in correct format
      const data = await sessionsAPI.getById(projectId, sessionId)
      
      let events: any[] = []
      
      // Check for video first (mobile sessions) - check multiple possible fields
      const videoUrl = data.session?.video_url || data.session?.videoUrl || null
      const hasVideoFlag = data.session?.has_video || data.session?.hasVideo || false
      
      if (hasVideoFlag && videoUrl) {
        console.log('📹 Mobile session with video detected:', videoUrl)
        setHasVideo(true)
        setVideoUrl(videoUrl)
        const videoDuration = data.session?.video_duration || data.session?.videoDuration
        if (videoDuration) {
          setDuration(videoDuration)
        }
        setSnapshots([]) // No snapshots for mobile
        return // Don't try to load snapshots
      } else if (videoUrl) {
        // If video URL exists but flag is not set, still show video
        console.log('📹 Video URL found (flag not set):', videoUrl)
        setHasVideo(true)
        setVideoUrl(videoUrl)
        const videoDuration = data.session?.video_duration || data.session?.videoDuration
        if (videoDuration) {
          setDuration(videoDuration)
        }
        setSnapshots([]) // No snapshots for mobile
        return // Don't try to load snapshots
      }
      
      // Backend returns snapshots array directly
      if (data.snapshots && Array.isArray(data.snapshots)) {
        events = data.snapshots
      } else if (data.snapshots) {
        // Fallback for other formats
        if (typeof data.snapshots === 'string') {
          try {
            const parsed = JSON.parse(data.snapshots)
            events = Array.isArray(parsed) ? parsed : [parsed]
          } catch (parseError) {
            console.error('❌ Failed to parse snapshots string:', parseError)
            setError('Invalid snapshot data format')
            return
          }
        } else {
          events = [data.snapshots]
        }
      }
      
      if (events.length === 0) {
        // Check if this is a mobile session with video instead of snapshots
        const videoUrl = data.session?.video_url || data.session?.videoUrl || null
        const hasVideoFlag = data.session?.has_video || data.session?.hasVideo || false
        
        if (hasVideoFlag && videoUrl) {
          setHasVideo(true)
          setVideoUrl(videoUrl)
          const videoDuration = data.session?.video_duration || data.session?.videoDuration
          if (videoDuration) {
            setDuration(videoDuration)
          }
          setSnapshots([]) // No snapshots for mobile
          return // Don't show error, video will be displayed
        } else if (videoUrl) {
          // If video URL exists but flag is not set, still show video
          setHasVideo(true)
          setVideoUrl(videoUrl)
          const videoDuration = data.session?.video_duration || data.session?.videoDuration
          if (videoDuration) {
            setDuration(videoDuration)
          }
          setSnapshots([]) // No snapshots for mobile
          return // Don't show error, video will be displayed
        }
        
        // Check if this might be due to SDK key authentication failure
        const sessionStartTime = data.session?.start_time ? new Date(data.session.start_time).getTime() : null
        const now = Date.now()
        const sessionAge = sessionStartTime ? now - sessionStartTime : null
        
        // If session is recent (within last hour), it might be due to SDK key/auth issues
        if (sessionAge && sessionAge < 3600000) {
          setError('No snapshots available. This session may have failed to upload snapshots due to authentication issues. Please verify your SDK key is correct and test with a new session.')
        } else {
          setError('No snapshots available for this session. This session was recorded before DOM recording was enabled or snapshots failed to upload.')
        }
        return
      }
      
      // Handle old wrapped format if present
      events = events.map((event: any) => {
        // If event is wrapped in old format { type: 'snapshot', data: {...} }
        if (event && event.type === 'snapshot' && event.data) {
          return event.data // Unwrap to get actual rrweb event
        }
        return event
      })
      
      // Validate events have required rrweb properties and normalize timestamps in one pass
      let firstTimestamp: number | null = null
      const validEvents: any[] = []
      
      for (let i = 0; i < events.length; i++) {
        const event = events[i]
        if (!event || typeof event.type !== 'number' || event.data === undefined) {
          continue
        }
        
        // Normalize timestamp
        let timestamp = event.timestamp
        if (!timestamp) {
          if (i > 0 && validEvents.length > 0) {
            const prevEvent = validEvents[validEvents.length - 1]
            timestamp = (prevEvent.timestamp || 0) + 100 // 100ms between events
          } else {
            timestamp = 0
          }
        } else if (typeof timestamp === 'string') {
          timestamp = new Date(timestamp).getTime()
        }
        
        if (firstTimestamp === null) {
          firstTimestamp = timestamp
        }
        
        validEvents.push({
          ...event,
          timestamp
        })
      }
      
      // Sort by timestamp to ensure chronological order
      // This is critical for navigation events - Type 4 Meta must come before new Type 2 snapshots
      validEvents.sort((a: any, b: any) => {
        const timeA = a.timestamp || 0
        const timeB = b.timestamp || 0
        // If timestamps are equal, prioritize Type 4 (navigation) before Type 2 (new page snapshot)
        if (timeA === timeB) {
          if (a.type === 4 && b.type === 2) return -1 // Type 4 before Type 2
          if (a.type === 2 && b.type === 4) return 1  // Type 2 after Type 4
        }
        return timeA - timeB
      })
      
      events = validEvents
      
      // Validate type 2 snapshot has content (only warn if issue)
      const type2Event = events.find((e: any) => e.type === 2);
      if (type2Event) {
        const dataSize = JSON.stringify(type2Event.data).length;
        if (dataSize < 100) {
          console.warn(`⚠️ Type 2 snapshot data is very small (${dataSize} bytes) - replay may be empty!`);
        }
      }
      
      // Normalize timestamps to be relative (starting from 0) for rrweb
      // This is important because rrweb expects relative timestamps, not absolute Unix timestamps
      if (events.length > 0 && firstTimestamp !== null && firstTimestamp !== 0) {
        // Normalize all timestamps to be relative to the first event (start at 0)
        for (let i = 0; i < events.length; i++) {
          events[i].timestamp = events[i].timestamp - firstTimestamp
        }
      }
      
      setSnapshots(events)
      
      // Cache snapshots
      setCachedSnapshots(projectId, sessionId, events)
    } catch (error: any) {
      // Only log non-abort errors (abort errors are expected when component unmounts or requests are cancelled)
      if (error?.name === 'AbortError' || error?.message === 'signal is aborted without reason') {
        // Don't set error state for abort errors - they're expected when component unmounts
        console.log('Request was cancelled (this is normal when navigating away)')
        setIsLoadingData(false) // Clear loading state even on abort
        return
      }
      
      console.error('Error loading snapshots:', error)
      
      // Check for CORS errors
      if (error.message?.includes('CORS') || error.message?.includes('Access-Control-Allow-Origin') || error.message?.includes('blocked by CORS')) {
        setError('CORS error: Cannot load session data. The backend may not be allowing requests from this domain. Please check CORS configuration.')
        setIsLoadingData(false)
        return
      }
      
      // Check for network errors
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || error.message?.includes('ERR_FAILED')) {
        setError('Network error: Cannot connect to the backend server. Please check your internet connection and try again.')
        setIsLoadingData(false)
        return
      }
      
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        // Check if session exists but has no snapshots (might be due to upload failure)
        if (session && session.duration && session.duration > 0) {
          setError('No snapshots available. Session was recorded but snapshots failed to upload. This may be due to authentication issues or network problems during recording.')
        } else {
          setError('No snapshots available for this session. This session was recorded before DOM recording was enabled.')
        }
      } else {
        setError(error.message || 'Failed to load snapshots')
      }
      
      // CRITICAL: Always clear loading state on error
      setIsLoadingData(false)
    }
  }

  const initializePlayer = () => {
    // CRITICAL: Do NOT recreate Replayer if it already exists
    if (playerRef.current) {
      console.log('⚠️ Replayer already exists, skipping initialization to prevent recreation')
      return
    }
    
    if (!replayContainerRef.current || snapshots.length === 0) {
      console.warn('Cannot initialize player: container or snapshots missing', {
        hasContainer: !!replayContainerRef.current,
        snapshotCount: snapshots.length
      })
      return
    }

    try {
      // Clear container safely - check if it exists and has children
      if (replayContainerRef.current) {
        try {
          // Remove children one by one to avoid React conflicts
          const container = replayContainerRef.current
          while (container.firstChild) {
            const child = container.firstChild
            // Only remove if child is still a child of container
            if (child.parentNode === container) {
              container.removeChild(child)
            } else {
              break
            }
          }
        } catch (e) {
          // If removing children fails, try innerHTML as fallback
          try {
      if (replayContainerRef.current) {
        replayContainerRef.current.innerHTML = ''
            }
          } catch (e2) {
            console.error('Error clearing container:', e2)
          }
        }
      }

      // Validate snapshots format
      const validSnapshots = snapshots.filter((event: any) => {
        // rrweb events must have type (number) and data
        return event && 
               typeof event.type === 'number' && 
               event.data !== undefined
      })

      if (validSnapshots.length === 0) {
        console.error('No valid rrweb events found. Event format:', snapshots[0])
        setError('Invalid snapshot format. Events must have type (number) and data properties.')
        return
      }

      // CRITICAL: Ensure first event is a full snapshot (type 2)
      // rrweb Replayer REQUIRES type 2 as the first event
      // BUT: We must preserve chronological order for navigation events
      // Only move the FIRST Type 2 (chronologically) to position 0
      // Subsequent Type 2 snapshots (for new pages) must stay in their chronological position
      const allType2Events = validSnapshots.filter((e: any) => e.type === 2)
      const firstType2Index = validSnapshots.findIndex((e: any) => e.type === 2)
      
      if (allType2Events.length > 1) {
        console.log('🔍 Multiple Type 2 snapshots detected - preserving chronological order for navigation', {
          totalType2: allType2Events.length,
          firstType2Index: firstType2Index,
          firstType2Timestamp: allType2Events[0]?.timestamp,
          allType2Timestamps: allType2Events.map((e: any) => e.timestamp)
        })
      }
      
      if (firstType2Index > 0) {
        // Move ONLY the first type 2 to front (chronologically first)
        // This is the initial page snapshot
        const firstType2Event = validSnapshots.splice(firstType2Index, 1)[0]
        validSnapshots.unshift(firstType2Event)
        console.log('Moved first type 2 (initial full snapshot) to first position, preserving order for subsequent pages')
      } else if (firstType2Index === -1) {
        console.error('ERROR: No full snapshot (type 2) found! Replay will NOT work.')
        console.error('Event types:', validSnapshots.map((e: any) => e.type))
        console.error('Total events:', validSnapshots.length)
        console.error('First few events:', validSnapshots.slice(0, 3))
        
        // Try to find Type 2 in a different format or location
        // Sometimes Type 2 might be nested or have a different structure
        let foundType2 = false
        for (let i = 0; i < validSnapshots.length; i++) {
          const event = validSnapshots[i]
          // Check if event has nested data with type 2
          if (event.data && typeof event.data === 'object') {
            if (event.data.type === 2 || (Array.isArray(event.data) && event.data.some((e: any) => e?.type === 2))) {
              console.log('Found Type 2 in nested structure, attempting to extract...')
              // Try to extract Type 2 from nested structure
              if (Array.isArray(event.data)) {
                const type2InArray = event.data.find((e: any) => e?.type === 2)
                if (type2InArray) {
                  validSnapshots.unshift(type2InArray)
                  foundType2 = true
                  console.log('Extracted Type 2 from nested array')
                  break
                }
              }
            }
          }
        }
        
        if (!foundType2) {
          setError('Missing full snapshot. This session cannot be replayed. Please record a new session.')
          return
        }
      }

      // Check for navigation events (Type 4 Meta events and multiple Type 2 FullSnapshots)
      const type4Events = validSnapshots.filter((e: any) => e.type === 4)
      const type2Events = validSnapshots.filter((e: any) => e.type === 2)
      
      // Verify event order: Type 4 Meta should come before corresponding Type 2 snapshot
      let navigationOrderValid = true
      if (type4Events.length > 0 && type2Events.length > 1) {
        for (let i = 0; i < type4Events.length; i++) {
          const type4Event = type4Events[i]
          const type4Index = validSnapshots.indexOf(type4Event)
          // Find the next Type 2 after this Type 4
          const nextType2 = type2Events.find((t2: any) => {
            const t2Index = validSnapshots.indexOf(t2)
            return t2Index > type4Index && t2.timestamp >= type4Event.timestamp
          })
          if (nextType2) {
            const nextType2Index = validSnapshots.indexOf(nextType2)
            if (nextType2Index <= type4Index) {
              navigationOrderValid = false
              console.warn('⚠️ Navigation event order issue: Type 4 at', type4Index, 'but next Type 2 at', nextType2Index)
            }
          }
        }
      }

      console.log(`Initializing replay player with ${validSnapshots.length} events`, {
        firstEvent: validSnapshots[0],
        eventTypes: validSnapshots.map((e: any) => e.type),
        type2Count: type2Events.length,
        type4Count: type4Events.length,
        hasNavigation: type2Events.length > 1 || type4Events.length > 0,
        navigationOrderValid: navigationOrderValid,
        type4Events: type4Events.map((e: any) => ({
          type: e.type,
          href: e.data?.href || e.data?.url || 'no url',
          timestamp: e.timestamp,
          position: validSnapshots.indexOf(e)
        })),
        type2Events: type2Events.map((e: any) => ({
          type: e.type,
          timestamp: e.timestamp,
          position: validSnapshots.indexOf(e)
        }))
      })
      
      if (type2Events.length > 1) {
        console.log('✅ Multiple Type 2 events detected - this session has page navigations', {
          count: type2Events.length,
          timestamps: type2Events.map((e: any) => e.timestamp)
        })
      }
      if (type4Events.length > 0) {
        console.log('✅ Type 4 Meta events detected - navigation events found:', type4Events.map((e: any) => ({
          href: e.data?.href || e.data?.url,
          timestamp: e.timestamp,
          position: validSnapshots.indexOf(e)
        })))
      }

      // CRITICAL: rrweb Replayer requires at least 2 events (Type 2 + at least one incremental event)
      if (validSnapshots.length < 2) {
        console.error('❌ Insufficient events for replay:', {
          eventCount: validSnapshots.length,
          eventTypes: validSnapshots.map((e: any) => e.type),
          hasType2: validSnapshots.some((e: any) => e.type === 2)
        })
        // Redirect back to sessions list instead of showing error
        // This session should have been filtered out, but if it wasn't, redirect gracefully
        setTimeout(() => {
          navigate(`/dashboard/sessions/${projectId}`)
        }, 1000)
        return
      }

      // Create a wrapper div for the replay
      const wrapper = document.createElement('div')
      wrapper.className = 'replay-container'
      wrapper.style.width = '100%'
      wrapper.style.height = '100%'
      wrapper.style.position = 'relative'
      wrapper.style.backgroundColor = '#f9fafb'
      wrapper.style.overflow = 'hidden' // Changed from 'auto' to 'hidden' for better rendering
      wrapper.style.display = 'block'
      wrapper.style.flex = '1' // Take full available space
      wrapper.style.minHeight = '0' // Important for flexbox
      wrapper.setAttribute('data-replay-wrapper', 'true')
      
      // Create an overlay to block all user interactions (like a video player)
      const interactionBlocker = document.createElement('div')
      interactionBlocker.className = 'replay-interaction-blocker'
      interactionBlocker.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999999;
        pointer-events: auto;
        cursor: default;
        background: transparent;
      `
      interactionBlocker.setAttribute('data-interaction-blocker', 'true')
      
      // Prevent all mouse and keyboard events
      interactionBlocker.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }, true)
      
      interactionBlocker.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }, true)
      
      interactionBlocker.addEventListener('mouseup', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }, true)
      
      interactionBlocker.addEventListener('dblclick', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }, true)
      
      interactionBlocker.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }, true)
      
      interactionBlocker.addEventListener('keydown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }, true)
      
      interactionBlocker.addEventListener('keyup', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }, true)
      
      interactionBlocker.addEventListener('keypress', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }, true)
      
      interactionBlocker.addEventListener('submit', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }, true)
      
      interactionBlocker.addEventListener('focus', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }, true)
      
      interactionBlocker.addEventListener('blur', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }, true)
      console.log('📦 Created wrapper div for replay player', {
        containerWidth: replayContainerRef.current?.offsetWidth,
        containerHeight: replayContainerRef.current?.offsetHeight,
        wrapperCreated: !!wrapper,
        wrapperStyles: {
          width: wrapper.style.width,
          height: wrapper.style.height,
          display: wrapper.style.display
        }
      })
      replayContainerRef.current.appendChild(wrapper)
      console.log('✅ Wrapper appended to container', {
        containerChildren: replayContainerRef.current.children.length,
        wrapperInDOM: replayContainerRef.current.contains(wrapper)
      })

      // Override createElement to intercept iframe creation BEFORE rrweb sets sandbox
      // This is more aggressive but necessary to prevent sandbox restrictions
      const originalCreateElement = document.createElement.bind(document)
      const createElementOverride = function(tagName: string, options?: any) {
        const element = originalCreateElement(tagName, options)
        
        if (tagName.toLowerCase() === 'iframe') {
          const iframe = element as HTMLIFrameElement
          
          // Override setAttribute to prevent restrictive sandbox
          const originalSetAttribute = iframe.setAttribute.bind(iframe)
          iframe.setAttribute = function(name: string, value: string) {
            if (name === 'sandbox') {
              // Always ensure allow-scripts and allow-same-origin are present
              const sandboxValue = value || ''
              if (!sandboxValue.includes('allow-scripts') || !sandboxValue.includes('allow-same-origin')) {
                const newValue = sandboxValue 
                  ? `${sandboxValue} allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation`
                  : 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation'
                console.log('🔧 Intercepted sandbox setAttribute, ensuring allow-scripts:', newValue)
                return originalSetAttribute(name, newValue)
              }
            }
            return originalSetAttribute(name, value)
          }
          
          // Also override sandbox property setter
          let sandboxValue = ''
          Object.defineProperty(iframe, 'sandbox', {
            get() {
              return sandboxValue
            },
            set(value: string) {
              if (!value.includes('allow-scripts') || !value.includes('allow-same-origin')) {
                const newValue = value 
                  ? `${value} allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation`
                  : 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation'
                console.log('🔧 Intercepted sandbox property setter, ensuring allow-scripts:', newValue)
                sandboxValue = newValue
                iframe.setAttribute('sandbox', newValue)
              } else {
                sandboxValue = value
              }
            },
            configurable: true,
            enumerable: true
          })
          
          console.log('🔧 Intercepted iframe creation, sandbox protection enabled')
        }
        
        return element
      }
      
      // Temporarily override createElement only for iframe creation
      document.createElement = createElementOverride as any

      // Create Replayer instance with validated events
      // Enhanced cursor visualization like Hotjar/UXCam
      // Note: We don't use skipInactive from rrweb - we implement our own dynamic speed control
      const replayer = new Replayer(validSnapshots, {
        root: wrapper,
        liveMode: false,
        speed: basePlaybackSpeedRef.current, // Use base speed, we'll dynamically adjust
        skipInactive: false, // We handle this ourselves
        showWarning: false, // Suppress warnings about missing nodes (they're often false positives)
        // Enhanced mouse cursor visualization - MUST be enabled
        mouseTail: {
          strokeStyle: '#9333ea',
          lineWidth: 3,
          duration: 2000, // Show cursor trail for 2 seconds
        },
        // Enable cursor plugin for better visibility
        plugins: [],
        // Unpack function
        unpackFn: (data: any) => {
          return data
        },
        // Suppress console warnings for missing nodes (they're often false positives)
        // The replayer will still work even if some nodes are missing
        // IMPORTANT: Ensure navigation events are processed
        // The replayer should automatically handle Type 4 Meta events and multiple Type 2 FullSnapshots
      })
      
      // Mark replayer as not destroyed
      ;(replayer as any).destroyed = false
      
      // Override destroy method to mark as destroyed
      const originalDestroy = replayer.destroy.bind(replayer)
      replayer.destroy = function() {
        ;(this as any).destroyed = true
        return originalDestroy()
      }
      
      // Restore original createElement after replayer is created
      document.createElement = originalCreateElement

      // Suppress rrweb console warnings about missing nodes (they're often false positives)
      const originalConsoleWarn = console.warn
      const suppressRrwebWarnings = (message: any, ...args: any[]) => {
        const messageStr = String(message || '')
        // Suppress specific rrweb warnings that are often false positives
        if (
          messageStr.includes('Node with id') && messageStr.includes('not found') ||
          messageStr.includes('Timeout in the loop') ||
          messageStr.includes('resolve tree data') ||
          messageStr.includes('Looks like your replayer has been destroyed')
        ) {
          // Suppress these warnings - they're often false positives
          return
        }
        // Allow other warnings through
        originalConsoleWarn(message, ...args)
      }
      
      // Temporarily override console.warn to suppress rrweb warnings
      console.warn = suppressRrwebWarnings as any
      
      // Restore console.warn after a delay (rrweb warnings happen during initialization)
      setTimeout(() => {
        console.warn = originalConsoleWarn
      }, 5000)

      // Ensure iframe doesn't cover controls - set lower z-index
      setTimeout(() => {
        const iframe = wrapper.querySelector('iframe')
        if (iframe) {
          (iframe as any).style.zIndex = '1'
          console.log('✅ Set iframe z-index to 1 to keep controls visible')
        }
      }, 500)

      // Add custom cursor overlay for better visibility
      // This creates a visible cursor element that follows mouse movements
      const cursorOverlay = document.createElement('div')
      cursorOverlay.id = 'rrweb-cursor-overlay'
      cursorOverlay.innerHTML = '●' // Simple dot for cursor
      cursorOverlay.style.cssText = `
        position: absolute;
        width: 20px;
        height: 20px;
        border: 2px solid #9333ea;
        border-radius: 50%;
        background: rgba(147, 51, 234, 0.8);
        pointer-events: none;
        z-index: 999999;
        transform: translate(-50%, -50%);
        display: none;
        transition: left 0.05s linear, top 0.05s linear;
        box-shadow: 0 0 10px rgba(147, 51, 234, 1), 0 0 20px rgba(147, 51, 234, 0.5);
        font-size: 8px;
        text-align: center;
        line-height: 16px;
        color: white;
        font-weight: bold;
      `
      wrapper.style.position = 'relative'
      wrapper.appendChild(cursorOverlay)
      
      // Create click visualization container
      const clickContainer = document.createElement('div')
      clickContainer.id = 'rrweb-click-container'
      clickContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 999998;
        overflow: hidden;
      `
      wrapper.appendChild(clickContainer)
      
      // Create scroll visualization container
      const scrollContainer = document.createElement('div')
      scrollContainer.id = 'rrweb-scroll-container'
      scrollContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 999997;
        overflow: hidden;
      `
      wrapper.appendChild(scrollContainer)
      
      // Ensure interaction blocker is always on top (after iframe is created)
      // Move it to the end so it's the last child and highest z-index
      setTimeout(() => {
        if (interactionBlocker.parentElement) {
          interactionBlocker.parentElement.appendChild(interactionBlocker)
        }
      }, 1000)
      
      // Store containers for cleanup
      ;(replayer as any)._clickContainer = clickContainer
      ;(replayer as any)._scrollContainer = scrollContainer
      
      // Also add cursor trail element
      const cursorTrail = document.createElement('div')
      cursorTrail.id = 'rrweb-cursor-trail'
      cursorTrail.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: rgba(147, 51, 234, 0.4);
        pointer-events: none;
        z-index: 999998;
        transform: translate(-50%, -50%);
        display: none;
      `
      wrapper.appendChild(cursorTrail)
      
      // Make cursor overlay globally accessible for debugging
      ;(window as any).cursorOverlay = cursorOverlay
      ;(window as any).cursorWrapper = wrapper
      
      console.log('✅ Cursor overlay created and added to wrapper', {
        wrapper: wrapper,
        overlay: cursorOverlay,
        wrapperChildren: wrapper.children.length,
        overlayId: cursorOverlay.id,
        overlayStyles: {
          display: cursorOverlay.style.display,
          position: cursorOverlay.style.position,
          zIndex: cursorOverlay.style.zIndex
        }
      })
      
      // Cursor will be shown when mouse events are detected

      // Track mouse movements and clicks from replay events
      // Use a more direct approach - iterate through events and track mouse positions
      let mouseMoveInterval: ReturnType<typeof setInterval> | null = null
      let lastKnownMouseX = 0
      let lastKnownMouseY = 0
      
      // Function to find latest mouse position from events
      const findLatestMousePosition = () => {
        try {
          const service = (replayer as any).service
          if (!service || !service.state) {
            return { x: lastKnownMouseX, y: lastKnownMouseY, found: false }
          }
          
          const currentIndex = service.state.currentIndex || 0
          const events = service.state.events || validSnapshots
          
          // Search backwards from current position to find most recent mouse event
          // Check up to 200 events back for better coverage
          for (let i = Math.min(currentIndex, events.length - 1); i >= Math.max(0, currentIndex - 200); i--) {
            const event = events[i]
            if (!event || event.type !== 3 || !event.data) continue
            
            const data = event.data
            
            // Mouse move events (source: 1) - most common
            if (data.source === 1) {
              // Check positions array
              if (data.positions && Array.isArray(data.positions) && data.positions.length > 0) {
                const lastPos = data.positions[data.positions.length - 1]
                if (lastPos && typeof lastPos.x === 'number' && typeof lastPos.y === 'number' && !isNaN(lastPos.x) && !isNaN(lastPos.y)) {
                  lastKnownMouseX = lastPos.x
                  lastKnownMouseY = lastPos.y
                  return { x: lastPos.x, y: lastPos.y, found: true }
                }
              }
              // Check x/y directly
              if (typeof data.x === 'number' && typeof data.y === 'number' && !isNaN(data.x) && !isNaN(data.y)) {
                lastKnownMouseX = data.x
                lastKnownMouseY = data.y
                return { x: data.x, y: data.y, found: true }
              }
            }
            
            // Click events (source: 2) - also have mouse position
            if (data.source === 2 && typeof data.x === 'number' && typeof data.y === 'number' && !isNaN(data.x) && !isNaN(data.y)) {
              lastKnownMouseX = data.x
              lastKnownMouseY = data.y
              return { x: data.x, y: data.y, found: true }
            }
          }
          
          return { x: lastKnownMouseX, y: lastKnownMouseY, found: lastKnownMouseX > 0 || lastKnownMouseY > 0 }
        } catch (error) {
          console.warn('Error finding mouse position:', error)
          return { x: lastKnownMouseX, y: lastKnownMouseY, found: false }
        }
      }
      
      // Function to update cursor overlay position
      const updateCursorPosition = () => {
        try {
          const pos = findLatestMousePosition()
          if (!pos.found || (pos.x === 0 && pos.y === 0 && lastKnownMouseX === 0 && lastKnownMouseY === 0)) {
            return // No valid position found
          }
          
          // Get iframe for positioning
          const iframe = wrapper.querySelector('iframe') as HTMLIFrameElement
          let cursorX = pos.x
          let cursorY = pos.y
          
          if (iframe) {
            try {
              const iframeRect = iframe.getBoundingClientRect()
              const wrapperRect = wrapper.getBoundingClientRect()
              
              // Calculate position relative to wrapper
              // Mouse positions in events are relative to the iframe content
              cursorX = pos.x + iframeRect.left - wrapperRect.left
              cursorY = pos.y + iframeRect.top - wrapperRect.top
              
              // Debug logging (only first few times)
              if (!(cursorOverlay as any)._debugLogged) {
                console.log('🖱️ Cursor position found:', { 
                  eventX: pos.x, 
                  eventY: pos.y, 
                  cursorX, 
                  cursorY,
                  iframeRect: { left: iframeRect.left, top: iframeRect.top },
                  wrapperRect: { left: wrapperRect.left, top: wrapperRect.top }
                })
                ;(cursorOverlay as any)._debugLogged = true
              }
            } catch (e) {
              // Use relative positioning if iframe access fails
              console.warn('Iframe access failed, using relative positioning')
            }
          } else {
            // No iframe yet, use event coordinates directly
            cursorX = pos.x
            cursorY = pos.y
          }
          
          // Update cursor overlay - make it very visible
          cursorOverlay.style.display = 'block'
          cursorOverlay.style.left = cursorX + 'px'
          cursorOverlay.style.top = cursorY + 'px'
          cursorOverlay.style.opacity = '1'
          cursorOverlay.style.zIndex = '999999'
          cursorOverlay.style.visibility = 'visible'
          
          // Keep cursor visible
          clearTimeout((cursorOverlay as any)._hideTimeout)
          ;(cursorOverlay as any)._hideTimeout = setTimeout(() => {
            if (cursorOverlay.style.opacity === '1') {
              cursorOverlay.style.opacity = '0.7'
            }
          }, 2000) // Keep visible for 2 seconds
        } catch (error) {
          console.warn('Error updating cursor position:', error)
        }
      }
      
      // Update cursor on state changes
      replayer.on('state-change', () => {
        updateCursorPosition()
      })
      
      // Also update cursor continuously while playing (more reliable)
      if (mouseMoveInterval) {
        clearInterval(mouseMoveInterval)
      }
      mouseMoveInterval = setInterval(() => {
        if (playerRef.current) {
          updateCursorPosition()
        }
      }, 16) // Update every 16ms (~60fps) for smooth cursor movement
      
      // Store interval for cleanup
      ;(replayer as any)._mouseMoveInterval = mouseMoveInterval
      
      // Reset cursor on snapshot rebuild
      replayer.on('fullsnapshot-rebuilded', () => {
        cursorOverlay.style.display = 'none'
        lastKnownMouseX = 0
        lastKnownMouseY = 0
      })
      
      // Initial cursor position - try multiple times to ensure it shows
      setTimeout(() => {
        updateCursorPosition()
        console.log('🖱️ Initial cursor update attempted')
      }, 500)
      
      setTimeout(() => {
        updateCursorPosition()
        console.log('🖱️ Second cursor update attempted')
      }, 1000)
      
      setTimeout(() => {
        updateCursorPosition()
        console.log('🖱️ Third cursor update attempted')
      }, 2000)
      
      // Log event structure for debugging
      console.log('📊 Events structure:', {
        totalEvents: validSnapshots.length,
        eventTypes: validSnapshots.slice(0, 20).map((e: any) => ({
          type: e.type,
          hasData: !!e.data,
          source: e.data?.source,
          hasPositions: !!e.data?.positions,
          hasXY: typeof e.data?.x === 'number' && typeof e.data?.y === 'number'
        })),
        mouseEvents: validSnapshots.filter((e: any) => 
          e.type === 3 && e.data && (e.data.source === 1 || e.data.source === 2)
        ).length
      })
      
      // Store cursor overlay for cleanup
      ;(replayer as any)._cursorOverlay = cursorOverlay

      // Fix iframe sandbox permissions using MutationObserver
      // This watches for when rrweb creates the iframe and fixes it immediately
      const fixSandboxAttribute = (iframe: HTMLIFrameElement) => {
        try {
          // Set sandbox with allow-scripts permission instead of removing it
          // This prevents rrweb from re-adding restrictive sandbox and allows scripts to run
          const currentSandbox = iframe.getAttribute('sandbox') || ''
          
          // Check if allow-scripts is already present
          if (currentSandbox.includes('allow-scripts') && currentSandbox.includes('allow-same-origin')) {
            return true // Already fixed
          }
          
          // Set sandbox with proper permissions - always include all necessary permissions
          // Remove any existing sandbox restrictions and set full permissions
          const newSandbox = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation'
          
          // Multiple attempts to set sandbox attribute
          try {
            iframe.setAttribute('sandbox', newSandbox)
          } catch (e) {
            // Try alternative method
            try {
              Object.defineProperty(iframe, 'sandbox', {
                value: newSandbox,
                writable: true,
                configurable: true
              })
            } catch (e2) {
              console.warn('Could not set sandbox via defineProperty:', e2)
            }
          }
          
          // Verify it was set
          const verifySandbox = iframe.getAttribute('sandbox') || ''
          if (verifySandbox.includes('allow-scripts') && verifySandbox.includes('allow-same-origin')) {
            console.log('✅ Fixed iframe sandbox attribute with allow-scripts', {
              iframeSrc: iframe.src?.substring(0, 50),
              iframeId: iframe.id,
              newSandbox: verifySandbox
            })
            return true
          } else {
            console.warn('⚠️ Sandbox fix may not have applied correctly', {
              expected: newSandbox,
              actual: verifySandbox
            })
          }
          return true // Return true anyway to prevent repeated attempts
        } catch (e) {
          console.warn('⚠️ Could not modify iframe sandbox:', e)
        }
        return false
      }

      // Use MutationObserver to catch iframe when it's created AND when attributes change
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          // Watch for new iframes being added
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'IFRAME') {
              const iframe = node as HTMLIFrameElement
              console.log('🔍 Detected iframe created, fixing sandbox...')
              fixSandboxAttribute(iframe)
            }
            // Also check if iframe was added inside a child element
            if (node.nodeType === 1) { // Element node
              const iframes = (node as Element).querySelectorAll('iframe')
              iframes.forEach(iframe => {
                fixSandboxAttribute(iframe as HTMLIFrameElement)
              })
            }
          })
          
          // Watch for attribute changes (in case sandbox is added after creation)
          if (mutation.type === 'attributes' && mutation.attributeName === 'sandbox') {
            const target = mutation.target as HTMLIFrameElement
            if (target.nodeName === 'IFRAME') {
              console.log('🔍 Detected sandbox attribute change, fixing...')
              fixSandboxAttribute(target)
            }
          }
        })
      })

      // Start observing the wrapper for iframe creation AND attribute changes
      observer.observe(wrapper, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['sandbox'] // Only watch for sandbox attribute changes
      })

      // Also try to fix any existing iframe immediately and periodically
      const checkAndFixIframes = () => {
        const iframes = wrapper.querySelectorAll('iframe')
        iframes.forEach(iframe => {
          fixSandboxAttribute(iframe as HTMLIFrameElement)
        })
      }
      
      checkAndFixIframes() // Check immediately
      
      // Also check periodically for the first 15 seconds (increased to catch late iframe creation)
      // Use a more frequent interval to catch sandbox changes immediately
      const checkInterval = setInterval(() => {
        checkAndFixIframes()
      }, 50) // Check every 50ms for faster response
      
      // Stop checking after 15 seconds (increased to catch late iframe creation)
      setTimeout(() => {
        clearInterval(checkInterval)
        console.log('✅ Stopped sandbox monitoring (iframe should be created by now)')
      }, 15000)

      // No need to restore - we're not overriding anything globally anymore

      // Store observer and interval for cleanup
      ;(replayer as any)._sandboxObserver = observer
      ;(replayer as any)._sandboxCheckInterval = checkInterval

      playerRef.current = replayer

      // DON'T recalculate duration from event timestamps here either
      // The duration is already set correctly from session.duration or calculated from
      // start_time and last_activity_time in loadSessionData()
      // Event timestamps are now normalized to be relative (starting from 0), so
      // calculating duration from them would be incorrect
      // The duration state should already have the correct value from the database

      // Handle navigation events manually
      // Listen for full snapshot rebuilds which indicate page navigation
      replayer.on('fullsnapshot-rebuilded', () => {
        if (!(replayer as any).destroyed && playerRef.current === replayer) {
          console.log('🔄 Full snapshot rebuilt - page navigation detected')
          // Force iframe to update - sometimes the replayer needs a nudge
          const iframe = wrapper.querySelector('iframe') as HTMLIFrameElement
          if (iframe) {
            try {
              // Ensure iframe can handle navigation
              const currentSandbox = iframe.getAttribute('sandbox') || ''
              if (!currentSandbox.includes('allow-top-navigation')) {
                const newSandbox = `${currentSandbox} allow-top-navigation`.trim()
                iframe.setAttribute('sandbox', newSandbox)
                console.log('🔧 Updated iframe sandbox for navigation after rebuild:', newSandbox)
              }
            } catch (e) {
              console.warn('Could not update iframe sandbox after rebuild:', e)
            }
          }
        }
      })
      
      // Also listen for any event that might indicate navigation
      // Check if we have Type 4 events and log when they're processed
      const navType4Events = validSnapshots.filter((e: any) => e.type === 4)
      if (navType4Events.length > 0) {
        console.log('📍 Type 4 navigation events will be processed:', navType4Events.map((e: any) => ({
          timestamp: e.timestamp,
          href: e.data?.href || e.data?.url,
          position: validSnapshots.indexOf(e)
        })))
      }

      // Listen for state changes that might indicate navigation
      // Note: This is separate from the state-change listener below which handles progress updates
      replayer.on('state-change', (state: any) => {
        if (!(replayer as any).destroyed && playerRef.current === replayer) {
          // Check if this is a navigation event
          if (state && state.mirror) {
            const iframe = wrapper.querySelector('iframe') as HTMLIFrameElement
            if (iframe) {
              // Ensure iframe can handle navigation
              try {
                const currentSandbox = iframe.getAttribute('sandbox') || ''
                if (!currentSandbox.includes('allow-top-navigation')) {
                  const newSandbox = `${currentSandbox} allow-top-navigation`.trim()
                  iframe.setAttribute('sandbox', newSandbox)
                  console.log('🔧 Updated iframe sandbox for navigation:', newSandbox)
                }
              } catch (e) {
                console.warn('Could not update iframe sandbox for navigation:', e)
              }
            }
          }
        }
      })

      // Set up event listeners with error handling (optimized - no console logs)
      replayer.on('start', () => {
        if (!(replayer as any).destroyed && playerRef.current === replayer) {
        setIsPlaying(true)
        setIsFinished(false) // Reset finished state when replay starts
        }
      })

      replayer.on('pause', () => {
        if (!(replayer as any).destroyed && playerRef.current === replayer) {
        setIsPlaying(false)
        }
      })

      replayer.on('resume', () => {
        if (!(replayer as any).destroyed && playerRef.current === replayer) {
        setIsPlaying(true)
        setIsFinished(false) // Reset finished state when replay resumes
        }
      })

      replayer.on('finish', () => {
        if (!(replayer as any).destroyed && playerRef.current === replayer) {
        setIsPlaying(false)
        setIsFinished(true) // Mark replay as finished
          // Ensure progress bar shows final time when finished
          try {
            const finalTime = playerRef.current.getCurrentTime()
            if (typeof finalTime === 'number' && finalTime >= 0) {
              setCurrentTime(finalTime)
            } else {
              // Fallback to duration if getCurrentTime doesn't work
              setCurrentTime(duration)
            }
          } catch (error) {
            // Fallback to duration
            setCurrentTime(duration)
          }
        }
      })

      // CRITICAL: Continuous progress bar sync using multiple methods
      // 1. Listen to progress events (primary method)
      const progressListener = (payload: any) => {
        try {
          if (!(replayer as any).destroyed && playerRef.current === replayer) {
        if (payload && typeof payload.timeOffset === 'number') {
          setCurrentTime(payload.timeOffset)
            }
          }
        } catch (error) {
          // Silently ignore errors from destroyed replayer
        }
      }
      replayer.on('progress', progressListener)
      
      // Store listener for cleanup
      ;(replayer as any)._progressListener = progressListener
      
      // Click and Scroll Visualization
      // Track processed events to show visual indicators
      let lastProcessedEventIndex = -1
      const processedClickEvents = new Set<number>()
      const processedScrollEvents = new Set<number>()
      
      // Function to create click ripple effect with enhanced visualization and clear message
      const createClickRipple = (x: number, y: number, clickType: 'left' | 'right' | 'double' = 'left') => {
        if (!clickContainer || !clickContainer.parentElement) {
          console.warn('Click container not available')
          return
        }
        
        // Ensure coordinates are valid numbers
        if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
          console.warn('Invalid click coordinates:', { x, y })
          return
        }
        
        const colors = {
          left: '#3b82f6',    // Blue for left click
          right: '#ef4444',   // Red for right click
          double: '#10b981'   // Green for double click
        }
        const color = colors[clickType]
        const clickLabel = clickType === 'double' ? 'DOUBLE CLICK' : clickType === 'right' ? 'RIGHT CLICK' : 'BUTTON CLICKED'
        
        // Create large, prominent ripple effect
        const ripple = document.createElement('div')
        ripple.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: ${color};
          opacity: 0.7;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 999998;
          animation: clickRipple 1s ease-out forwards;
        `
        
        // Add large, visible click marker (circle)
        const marker = document.createElement('div')
        marker.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 4px solid ${color};
          background: rgba(255, 255, 255, 1);
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 999999;
          animation: clickMarker 1.5s ease-out forwards;
          box-shadow: 0 0 0 8px rgba(${clickType === 'left' ? '59, 130, 246' : clickType === 'right' ? '239, 68, 68' : '16, 185, 129'}, 0.4), 0 0 20px ${color};
        `
        
        // Add large, prominent click message banner
        const messageBanner = document.createElement('div')
        messageBanner.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y - 60}px;
          transform: translateX(-50%);
          background: ${color};
          color: white;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          pointer-events: none;
          z-index: 1000000;
          white-space: nowrap;
          animation: clickMessageBanner 2s ease-out forwards;
          border: 2px solid white;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 30px ${color};
          text-transform: uppercase;
          letter-spacing: 1px;
        `
        messageBanner.textContent = clickLabel
        
        // Add click label badge near the click point
        const label = document.createElement('div')
        label.style.cssText = `
          position: absolute;
          left: ${x + 20}px;
          top: ${y - 10}px;
          background: rgba(0, 0, 0, 0.9);
          color: ${color};
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          pointer-events: none;
          z-index: 999999;
          white-space: nowrap;
          animation: clickLabel 1.5s ease-out forwards;
          border: 2px solid ${color};
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
        `
        label.textContent = '✓ Click'
        
        clickContainer.appendChild(ripple)
        clickContainer.appendChild(marker)
        clickContainer.appendChild(messageBanner)
        clickContainer.appendChild(label)
        
        // Remove after animation (longer duration for better visibility)
        setTimeout(() => {
          if (ripple.parentElement) ripple.remove()
          if (marker.parentElement) marker.remove()
          if (messageBanner.parentElement) messageBanner.remove()
          if (label.parentElement) label.remove()
        }, 2000)
      }
      
      // Track scroll path for visualization
      let scrollPathPoints: Array<{x: number, y: number, time: number}> = []
      
      // Function to create enhanced scroll visualization with path
      const createScrollIndicator = (scrollX: number, scrollY: number, direction: 'up' | 'down' | 'left' | 'right') => {
        if (!scrollContainer || !scrollContainer.parentElement) {
          console.warn('Scroll container not available')
          return
        }
        
        // Ensure coordinates are valid numbers
        if (isNaN(scrollX) || isNaN(scrollY) || !isFinite(scrollX) || !isFinite(scrollY)) {
          console.warn('Invalid scroll coordinates:', { scrollX, scrollY })
          return
        }
        
        const colors = {
          up: '#9333ea',      // Purple for up
          down: '#f59e0b',    // Orange for down
          left: '#8b5cf6',    // Violet for left
          right: '#06b6d4'    // Cyan for right
        }
        const color = colors[direction]
        const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : direction === 'left' ? '←' : '→'
        
        // Get container dimensions for positioning
        const containerRect = scrollContainer.getBoundingClientRect()
        const containerWidth = containerRect.width
        const containerHeight = containerRect.height
        
        // Calculate scroll position indicators on screen edges
        const scrollPercentX = containerWidth > 0 ? (scrollX / (containerWidth * 2)) * 100 : 0
        const scrollPercentY = containerHeight > 0 ? (scrollY / (containerHeight * 2)) * 100 : 0
        
        // Add current scroll point to path
        const currentTime = Date.now()
        scrollPathPoints.push({ x: scrollX, y: scrollY, time: currentTime })
        
        // Clean up old path points (older than 2 seconds)
        scrollPathPoints = scrollPathPoints.filter(point => currentTime - point.time < 2000)
        
        // Draw scroll path line if we have previous point
        if (scrollPathPoints.length > 1) {
          const prevPoint = scrollPathPoints[scrollPathPoints.length - 2]
          const currentPoint = scrollPathPoints[scrollPathPoints.length - 1]
          
          // Create SVG path element for scroll visualization
          let pathSvg = scrollContainer.querySelector('svg.scroll-path-svg') as SVGElement
          if (!pathSvg) {
            pathSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            pathSvg.setAttribute('class', 'scroll-path-svg')
            pathSvg.style.cssText = `
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              pointer-events: none;
              z-index: 999996;
              overflow: visible;
            `
            scrollContainer.appendChild(pathSvg)
          }
          
          // Create path line
          const pathLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
          pathLine.setAttribute('x1', prevPoint.x.toString())
          pathLine.setAttribute('y1', prevPoint.y.toString())
          pathLine.setAttribute('x2', currentPoint.x.toString())
          pathLine.setAttribute('y2', currentPoint.y.toString())
          pathLine.setAttribute('stroke', color)
          pathLine.setAttribute('stroke-width', '2')
          pathLine.setAttribute('stroke-opacity', '0.6')
          pathLine.setAttribute('stroke-dasharray', '5,5')
          pathLine.style.cssText = `
            animation: scrollPathFade 2s ease-out forwards;
          `
          pathSvg.appendChild(pathLine)
          
          // Remove path line after animation
          setTimeout(() => {
            if (pathLine.parentElement) pathLine.remove()
          }, 2000)
        }
        
        // Create scroll position indicator on appropriate edge
        let indicatorPosition: { top?: string, bottom?: string, left?: string, right?: string } = {}
        if (direction === 'up' || direction === 'down') {
          // Vertical scroll - show on right edge
          indicatorPosition = {
            right: '10px',
            top: `${Math.min(95, Math.max(5, scrollPercentY))}%`
          }
        } else {
          // Horizontal scroll - show on bottom edge
          indicatorPosition = {
            bottom: '10px',
            left: `${Math.min(95, Math.max(5, scrollPercentX))}%`
          }
        }
        
        const indicator = document.createElement('div')
        indicator.style.cssText = `
          position: absolute;
          ${indicatorPosition.top ? `top: ${indicatorPosition.top};` : ''}
          ${indicatorPosition.bottom ? `bottom: ${indicatorPosition.bottom};` : ''}
          ${indicatorPosition.left ? `left: ${indicatorPosition.left};` : ''}
          ${indicatorPosition.right ? `right: ${indicatorPosition.right};` : ''}
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.75);
          color: ${color};
          border: 2px solid ${color};
          border-radius: 6px;
          font-size: 14px;
          font-weight: bold;
          pointer-events: none;
          z-index: 999997;
          animation: scrollIndicator 1s ease-out forwards;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          transform: ${indicatorPosition.right ? 'translateX(0)' : indicatorPosition.bottom ? 'translateY(0)' : 'none'};
        `
        indicator.textContent = `${arrow}`
        
        // Add scroll position text for better context
        const positionText = document.createElement('div')
        positionText.style.cssText = `
          position: absolute;
          ${indicatorPosition.top ? `top: ${parseFloat(indicatorPosition.top.replace('%', '')) + 5}%;` : ''}
          ${indicatorPosition.bottom ? `bottom: ${parseFloat(indicatorPosition.bottom.replace('px', '')) + 25}px;` : ''}
          ${indicatorPosition.left ? `left: ${indicatorPosition.left};` : ''}
          ${indicatorPosition.right ? `right: ${indicatorPosition.right};` : ''}
          padding: 4px 8px;
          background: rgba(0, 0, 0, 0.6);
          color: ${color};
          border-radius: 4px;
          font-size: 10px;
          font-weight: 500;
          pointer-events: none;
          z-index: 999997;
          animation: scrollPositionText 1s ease-out forwards;
          white-space: nowrap;
        `
        positionText.textContent = `Y: ${Math.round(scrollY)}`
        if (scrollX > 0) {
          positionText.textContent += ` X: ${Math.round(scrollX)}`
        }
        
        scrollContainer.appendChild(indicator)
        scrollContainer.appendChild(positionText)
        
        // Remove after animation
        setTimeout(() => {
          if (indicator.parentElement) indicator.remove()
          if (positionText.parentElement) positionText.remove()
        }, 1000)
      }
      
      // Monitor events as they're processed
      const checkForNewEvents = () => {
        try {
          if (!playerRef.current || (playerRef.current as any).destroyed || playerRef.current !== replayer) {
            return
          }
          
          const service = (replayer as any).service
          if (!service || !service.state) return
          
          const currentIndex = service.state.currentIndex || 0
          
          // Process new events since last check
          for (let i = lastProcessedEventIndex + 1; i <= currentIndex && i < validSnapshots.length; i++) {
            const event = validSnapshots[i]
            if (!event || event.type !== 3 || !event.data) continue
            
            const data = event.data
            const source = data.source
            
            // Handle click events - MouseInteraction events (source: 2)
            // In rrweb, clicks are MouseInteraction events with type 0 (click), 1 (mousedown), 2 (mouseup), etc.
            if (source === 2 && !processedClickEvents.has(i)) {
              // Check if this is actually a click event (type 0 = click, type 1 = mousedown, type 2 = mouseup)
              const mouseType = data.type
              // Accept click (0), mousedown (1), and also check for any mouse interaction
              if (mouseType === 0 || mouseType === 1 || mouseType === undefined) { // 0 = click, 1 = mousedown, undefined = default click
                processedClickEvents.add(i)
                
                
                // Get click coordinates - rrweb stores these relative to the viewport
                let clickX = data.x || 0
                let clickY = data.y || 0
                
                // Get iframe and wrapper for coordinate conversion
                const iframe = wrapper.querySelector('iframe') as HTMLIFrameElement
                if (iframe) {
                  const iframeRect = iframe.getBoundingClientRect()
                  const wrapperRect = wrapper.getBoundingClientRect()
                  
                  // Try to get element position if we have an element ID
                  if (data.id !== undefined && typeof data.id === 'number') {
                    try {
                      if (iframe.contentDocument) {
                        const element = iframe.contentDocument.querySelector(`[data-rrweb-id="${data.id}"]`)
                        if (element) {
                          const elementRect = element.getBoundingClientRect()
                          // Element rect is relative to viewport, convert to wrapper coordinates
                          clickX = elementRect.left + (elementRect.width / 2) - wrapperRect.left
                          clickY = elementRect.top + (elementRect.height / 2) - wrapperRect.top
                        } else {
                          // No element found, use provided coordinates and convert from iframe space
                          clickX = clickX - wrapperRect.left + iframeRect.left
                          clickY = clickY - wrapperRect.top + iframeRect.top
                        }
                      }
                    } catch (e) {
                      // Fallback: convert coordinates assuming they're relative to iframe
                      clickX = clickX - wrapperRect.left + iframeRect.left
                      clickY = clickY - wrapperRect.top + iframeRect.top
                    }
                  } else {
                    // No element ID, coordinates should be viewport-relative, convert to wrapper
                    clickX = clickX - wrapperRect.left
                    clickY = clickY - wrapperRect.top
                  }
                }
                
                // Determine click type
                let clickType: 'left' | 'right' | 'double' = 'left'
                // Check for double click or right click in the event data
                if (data.type === 2) clickType = 'double'
                else if (data.button === 2 || data.buttons === 2) clickType = 'right'
                
                createClickRipple(clickX, clickY, clickType)
              }
            }
            
            // Handle scroll events - Scroll events (source: 3) or Input events with scroll (source: 5)
            if ((source === 3 || source === 5) && !processedScrollEvents.has(i)) {
              // Source 3 = Scroll event, Source 5 = Input event (can include scroll)
              const isScrollEvent = source === 3 || (source === 5 && (data.x !== undefined || data.y !== undefined))
              
              if (isScrollEvent) {
                processedScrollEvents.add(i)
                
                const scrollX = data.x || 0
                const scrollY = data.y || 0
                
                // Determine scroll direction based on scroll deltas
                let direction: 'up' | 'down' | 'left' | 'right' = 'down'
                
                // Compare with previous scroll position
                const prevScrollY = (replayer as any)._lastScrollY || 0
                const prevScrollX = (replayer as any)._lastScrollX || 0
                
                if (Math.abs(scrollY - prevScrollY) > Math.abs(scrollX - prevScrollX)) {
                  // Vertical scroll
                  if (scrollY < prevScrollY) direction = 'up'
                  else if (scrollY > prevScrollY) direction = 'down'
                } else {
                  // Horizontal scroll
                  if (scrollX < prevScrollX) direction = 'left'
                  else if (scrollX > prevScrollX) direction = 'right'
                }
                
                // Store current scroll position for next comparison
                ;(replayer as any)._lastScrollX = scrollX
                ;(replayer as any)._lastScrollY = scrollY
                
                createScrollIndicator(scrollX, scrollY, direction)
              }
            }
          }
          
          lastProcessedEventIndex = currentIndex
        } catch (error) {
          // Silently ignore errors
        }
      }
      
      // Check for new events periodically during playback
      const eventCheckInterval = setInterval(() => {
        if (isPlaying && !(replayer as any).destroyed) {
          checkForNewEvents()
        }
      }, 50) // Check every 50ms for more responsive visualization
      
      ;(replayer as any)._eventCheckInterval = eventCheckInterval
      
      // Also listen to replayer's internal events to catch events in real-time
      // Try multiple event names as rrweb versions may differ
      const eventListeners = ['event-cast', 'fullsnapshot-rebuilded', 'incremental-snapshot']
      eventListeners.forEach(eventName => {
        try {
          replayer.on(eventName as any, (event: any) => {
        try {
          if (!(replayer as any).destroyed && playerRef.current === replayer) {
            // Handle incremental snapshot events
            if (event && event.type === 3 && event.data) {
              const data = event.data
              const source = data.source
              
              // Handle click events immediately - catch all mouse interactions
              if (source === 2) {
                const mouseType = data.type
                // Accept click (0), mousedown (1), and any mouse interaction that has coordinates
                if ((mouseType === 0 || mouseType === 1 || mouseType === undefined) && (data.x !== undefined || data.y !== undefined)) {
                  let clickX = data.x || 0
                  let clickY = data.y || 0
                  
                  // Get iframe for coordinate conversion
                  const iframe = wrapper.querySelector('iframe') as HTMLIFrameElement
                  if (iframe) {
                    const iframeRect = iframe.getBoundingClientRect()
                    const wrapperRect = wrapper.getBoundingClientRect()
                    
                    // Convert viewport coordinates to wrapper-relative coordinates
                    clickX = clickX - wrapperRect.left
                    clickY = clickY - wrapperRect.top
                    
                    // If coordinates seem to be within iframe, they might be iframe-relative
                    if (clickX >= 0 && clickX <= iframeRect.width && clickY >= 0 && clickY <= iframeRect.height) {
                      // Coordinates are already correct (within iframe bounds in wrapper space)
                    } else {
                      // Try converting as if they're viewport-relative
                      clickX = clickX - wrapperRect.left + iframeRect.left
                      clickY = clickY - wrapperRect.top + iframeRect.top
                    }
                  }
                  
                  let clickType: 'left' | 'right' | 'double' = 'left'
                  if (data.button === 2 || data.buttons === 2) clickType = 'right'
                  
                  createClickRipple(clickX, clickY, clickType)
                }
              }
              
              // Handle scroll events immediately
              if (source === 3 || (source === 5 && (data.x !== undefined || data.y !== undefined))) {
                const scrollX = data.x || 0
                const scrollY = data.y || 0
                
                const prevScrollY = (replayer as any)._lastScrollY || 0
                const prevScrollX = (replayer as any)._lastScrollX || 0
                
                let direction: 'up' | 'down' | 'left' | 'right' = 'down'
                if (Math.abs(scrollY - prevScrollY) > Math.abs(scrollX - prevScrollX)) {
                  if (scrollY < prevScrollY) direction = 'up'
                  else if (scrollY > prevScrollY) direction = 'down'
                } else {
                  if (scrollX < prevScrollX) direction = 'left'
                  else if (scrollX > prevScrollX) direction = 'right'
                }
                
                ;(replayer as any)._lastScrollX = scrollX
                ;(replayer as any)._lastScrollY = scrollY
                
                createScrollIndicator(scrollX, scrollY, direction)
              }
            }
          }
        } catch (error) {
          // Silently ignore errors
        }
          })
        } catch (e) {
          // Event name might not exist in this rrweb version, ignore
        }
      })
      
      // 2. Listen to state-change events (fallback)
      replayer.on('state-change', (state: any) => {
        try {
          if (!(replayer as any).destroyed && playerRef.current === replayer) {
            if (state && typeof state.timeOffset === 'number') {
          setCurrentTime(state.timeOffset)
              }
            }
          } catch (error) {
          // Silently ignore errors from destroyed replayer
        }
      })
      
      // 3. Continuous polling using requestAnimationFrame for guaranteed updates
      // This ensures the progress bar always stays in sync, even if events are missed
      // This runs continuously regardless of play/pause state to keep progress bar accurate
      const updateProgress = () => {
        try {
          if (playerRef.current && !(playerRef.current as any).destroyed && playerRef.current === replayer) {
            // Always get the current time from the replayer (works even when paused)
            const currentTime = playerRef.current.getCurrentTime()
            if (typeof currentTime === 'number' && currentTime >= 0) {
              setCurrentTime(currentTime)
              }
            }
          } catch (error) {
          // Ignore errors - continue polling
        }
        
        // Continue polling as long as replayer exists (even when paused or finished)
        // Only stop when replayer is destroyed
        if (playerRef.current && !(playerRef.current as any).destroyed) {
          progressUpdateIntervalRef.current = requestAnimationFrame(updateProgress) as any
              } else {
          // Replayer destroyed, stop polling
          progressUpdateIntervalRef.current = null
        }
      }
      
      // Start continuous progress updates
      progressUpdateIntervalRef.current = requestAnimationFrame(updateProgress) as any
      ;(replayer as any)._progressUpdateInterval = progressUpdateIntervalRef.current

      // Skip inactivity will be set up via useEffect when skipInactivity state changes
      // This ensures it works when toggled on/off dynamically

      // Auto-play to show the replay immediately
      // Small delay to ensure container is ready
      setTimeout(() => {
        try {
          console.log('🎬 Starting replay playback...', {
            wrapperExists: !!wrapper,
            wrapperChildren: wrapper.children.length,
            containerExists: !!replayContainerRef.current,
            eventsCount: validSnapshots.length,
            wrapperOffsetWidth: wrapper.offsetWidth,
            wrapperOffsetHeight: wrapper.offsetHeight
          })
          
          // Ensure wrapper is visible
          wrapper.style.display = 'block'
          wrapper.style.visibility = 'visible'
          wrapper.style.opacity = '1'
          
          // Check if replayer is still valid before playing
          if (!(replayer as any).destroyed && playerRef.current === replayer) {
          // Auto-play from the beginning (time 0) on initial load
          replayer.play(0)
          setIsPlaying(true)
          console.log('✅ Auto-playing replay from start')
          } else {
            console.warn('⚠️ Cannot auto-play: replayer has been destroyed')
          }
          
          // Ensure controls remain visible after playback starts
          const ensureControlsVisible = () => {
            const controls = document.getElementById('session-replay-controls')
            if (controls) {
              const controlEl = controls as HTMLElement
              controlEl.style.display = 'flex'
              controlEl.style.visibility = 'visible'
              controlEl.style.opacity = '1'
              controlEl.style.zIndex = '99999'
              controlEl.style.position = 'absolute'
              console.log('✅ Ensured controls are visible')
            }
            // Also ensure iframe doesn't cover controls - set very low z-index
            const iframe = wrapper.querySelector('iframe')
            if (iframe) {
              const iframeEl = iframe as HTMLElement
              iframeEl.style.zIndex = '1'
              iframeEl.style.pointerEvents = 'none' // Disable all interactions - replay is view-only
              console.log('✅ Set iframe z-index to 1 and disabled pointer events')
            }
            // Ensure wrapper doesn't cover controls
            if (wrapper) {
              (wrapper as HTMLElement).style.zIndex = '1'
              console.log('✅ Set wrapper z-index to 1')
            }
          }
          
          // Check immediately and after delays
          ensureControlsVisible()
          setTimeout(ensureControlsVisible, 100)
          setTimeout(ensureControlsVisible, 500)
          setTimeout(ensureControlsVisible, 1000)
          
          // Also check periodically to ensure controls stay visible
          const visibilityCheckInterval = setInterval(() => {
            const controls = document.getElementById('session-replay-controls')
            if (controls) {
              const controlEl = controls as HTMLElement
              const computedStyle = window.getComputedStyle(controlEl)
              if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || parseFloat(computedStyle.opacity) < 0.1) {
                controlEl.style.display = 'flex'
                controlEl.style.visibility = 'visible'
                controlEl.style.opacity = '1'
                controlEl.style.zIndex = '99999'
                controlEl.style.position = 'absolute'
                console.log('⚠️ Controls were hidden, restored visibility')
              }
            }
          }, 500)
          
          // Store interval for cleanup
          ;(replayer as any)._visibilityCheckInterval = visibilityCheckInterval
          
          // Log wrapper content after delays to verify rendering
          setTimeout(() => {
            const iframe = wrapper.querySelector('iframe')
            const canvas = wrapper.querySelector('canvas')
            console.log('📊 Replay container state (500ms):', {
              wrapperHTML: wrapper.innerHTML.substring(0, 300),
              wrapperChildren: wrapper.children.length,
              firstChild: wrapper.firstElementChild?.tagName,
              firstChildClassName: wrapper.firstElementChild?.className,
              hasIframe: !!iframe,
              iframeSrc: iframe?.src,
              iframeStyle: iframe ? window.getComputedStyle(iframe).display : null,
              hasCanvas: !!canvas,
              wrapperDisplay: window.getComputedStyle(wrapper).display,
              wrapperVisibility: window.getComputedStyle(wrapper).visibility
            })
          }, 500)
          
          setTimeout(() => {
            const iframe = wrapper.querySelector('iframe')
            console.log('📊 Replay container state (2s):', {
              wrapperChildren: wrapper.children.length,
              hasIframe: !!iframe,
              iframeDisplay: iframe ? window.getComputedStyle(iframe).display : null,
              iframeWidth: iframe?.offsetWidth,
              iframeHeight: iframe?.offsetHeight,
              playerState: playerRef.current ? 'exists' : 'null'
            })
          }, 2000)
        } catch (error) {
          console.error('❌ Error auto-playing:', error)
        }
      }, 200) // Increased delay to ensure DOM is ready
    } catch (error: any) {
      console.error('Error creating player:', error)
      setError('Failed to initialize replay player: ' + error.message)
    }
  }

  const restartReplay = () => {
    // Handle video player for mobile sessions
    if (hasVideo && videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = 0
      videoPlayerRef.current.play()
      setIsPlaying(true)
      setIsFinished(false)
      setCurrentTime(0)
      return
    }
    
    // Handle rrweb replayer for web sessions
    if (playerRef.current) {
      try {
        // Check if replayer is still valid
        if ((playerRef.current as any).destroyed) {
          console.warn('Replayer has been destroyed, cannot restart')
          return
        }
        
        // Restart from beginning
        playerRef.current.play(0)
        setIsPlaying(true)
        setIsFinished(false)
        setCurrentTime(0)
      } catch (error) {
        console.error('Error restarting replay:', error)
      }
    }
  }

  const togglePlay = () => {
    // If finished, restart instead of toggle
    if (isFinished) {
      restartReplay()
      return
    }
    
    // Handle video player for mobile sessions
    if (hasVideo && videoPlayerRef.current) {
      if (isPlaying) {
        videoPlayerRef.current.pause()
      } else {
        videoPlayerRef.current.play()
      }
      setIsPlaying(!isPlaying)
      setIsFinished(false) // Reset finished state when playing
      return
    }
    
    // Handle rrweb replayer for web sessions
    if (playerRef.current) {
      try {
        // Check if replayer is still valid
        if ((playerRef.current as any).destroyed) {
          console.warn('Replayer has been destroyed, cannot toggle play')
          return
        }
        
        if (isPlaying) {
          // Pause the replay
          playerRef.current.pause()
          setIsPlaying(false)
        } else {
          // Resume from current time - get the current playback time before resuming
          let resumeTime = currentTime
          
          // Try to get the actual current time from the replayer
          try {
            const replayerTime = playerRef.current.getCurrentTime()
            if (typeof replayerTime === 'number' && replayerTime >= 0) {
              resumeTime = replayerTime
            }
          } catch (e) {
            // Fallback to state currentTime if getCurrentTime fails
            resumeTime = currentTime
          }
          
          // Resume playback from the current time
          playerRef.current.play(resumeTime)
          setIsPlaying(true)
          setIsFinished(false) // Reset finished state when playing
        }
      } catch (error) {
        console.error('Error toggling play:', error)
      }
    }
  }

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed)
    basePlaybackSpeedRef.current = speed // Update base speed ref
    
    // Handle video player
    if (hasVideo && videoPlayerRef.current) {
      videoPlayerRef.current.playbackRate = speed
      return
    }
    
    // Handle rrweb replayer
    // Only update if not currently skipping inactivity (skip speed takes priority)
    if (playerRef.current) {
      try {
        // Check if replayer is still valid
        if ((playerRef.current as any).destroyed) {
          console.warn('Replayer has been destroyed, cannot change speed')
          return
        }
        
      if (!isSkippingInactivity || !skipInactivity) {
        playerRef.current.setConfig({ speed })
        }
      } catch (error) {
        console.error('Error changing speed:', error)
      }
    }
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Format time relative to session start (MM:SS.ms format like picture 1)
  const formatTime = (timestamp: number) => {
    if (!timestamp || snapshots.length === 0) return '00:00.0'
    
    // Get first event timestamp as session start
    const firstEvent = snapshots.find((s: any) => s.timestamp)
    if (!firstEvent || !firstEvent.timestamp) return '00:00.0'
    
    // Calculate time offset from session start
    const timeOffset = timestamp - firstEvent.timestamp
    const totalSeconds = Math.floor(timeOffset / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const milliseconds = Math.floor((timeOffset % 1000) / 100) // First decimal of milliseconds
    
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${milliseconds}`
  }
  

  // Convert raw events into user-friendly descriptions with metadata
  const parseEventDescription = (event: any): { 
    icon: any, 
    title: string, 
    description: string, 
    category: 'events' | 'gestures' | 'screens',
    metadata?: { x?: number, y?: number, id?: number, elementId?: string, text?: string }
  } => {
    // rrweb event types: 0=DomContentLoaded, 2=FullSnapshot, 3=IncrementalSnapshot, 4=Meta, 5=Custom
    if (event.type === 2) {
      // Check if this is the first snapshot or a navigation (new page)
      // We'll track this by checking if there's a URL in the data
      const url = event.data?.href || event.data?.url || ''
      return {
        icon: <Eye className="icon-small" style={{ color: '#9333ea' }} />,
        title: 'Page Loaded',
        description: url || 'Initial page snapshot captured',
        category: 'screens'
      }
    }

    // Type 4 = Meta events (URL changes, page navigation)
    if (event.type === 4 && event.data) {
      const url = event.data.href || event.data.url || ''
      if (url) {
        return {
          icon: <Eye className="icon-small" style={{ color: '#9333ea' }} />,
          title: 'Page Changed',
          description: url,
          category: 'screens'
        }
      }
    }

    if (event.type === 3 && event.data) {
      const data = event.data
      const source = data.source

      // Mouse/Touch movements (source: 1)
      if (source === 1 && data.positions) {
        const positions = Array.isArray(data.positions) ? data.positions : [data.positions]
        const lastPos = positions[positions.length - 1]
        return {
          icon: <MousePointer className="icon-small" style={{ color: '#3b82f6' }} />,
          title: 'Mouse Moved',
          description: `Cursor moved to (${lastPos?.x || 0}, ${lastPos?.y || 0})`,
          category: 'gestures',
          metadata: { x: lastPos?.x, y: lastPos?.y }
        }
      }

      // Mouse interactions (source: 2) - type 0 = Click
      if (source === 2) {
        if (data.type === 0 || data.type === 1) {
          return {
            icon: <MousePointerClick className="icon-small" style={{ color: '#10b981' }} />,
            title: 'Clicked Element',
            description: '',
            category: 'gestures',
            metadata: { x: data.x, y: data.y, id: data.id }
          }
        }
        if (data.type === 2) {
          return {
            icon: <MousePointerClick className="icon-small" style={{ color: '#f59e0b' }} />,
            title: 'Double Clicked Element',
            description: '',
            category: 'gestures',
            metadata: { x: data.x, y: data.y, id: data.id }
          }
        }
        if (data.type === 3) {
          return {
            icon: <MousePointerClick className="icon-small" style={{ color: '#ef4444' }} />,
            title: 'Right Clicked Element',
            description: '',
            category: 'gestures',
            metadata: { x: data.x, y: data.y, id: data.id }
          }
        }
      }

      // Scroll events (source: 3)
      if (source === 3) {
        return {
          icon: <Scroll className="icon-small" style={{ color: '#8b5cf6' }} />,
          title: 'Scrolled',
          description: '',
          category: 'gestures',
          metadata: { x: data.x, y: data.y }
        }
      }

      // Input events (source: 5) - type 5 = Input, type 6 = Focus
      if (source === 5) {
        if (data.type === 0 || data.type === 5) {
          // Check if there's text data (user typed)
          const hasText = data.text !== undefined && data.text !== null && data.text !== ''
          return {
            icon: <Type className="icon-small" style={{ color: '#06b6d4' }} />,
            title: hasText ? 'User typed in input' : 'Input Changed',
            description: '',
            category: 'events',
            metadata: { id: data.id, text: data.text }
          }
        }
        if (data.type === 6) {
          return {
            icon: <Focus className="icon-small" style={{ color: '#8b5cf6' }} />,
            title: 'Element Focused',
            description: '',
            category: 'events',
            metadata: { id: data.id }
          }
        }
      }

      // DOM mutations (source: 0) - these are NOT page changes, just DOM updates
      // Don't show these as "Page Changed" - they're just regular DOM updates
      if (source === 0) {
        return {
          icon: <Move className="icon-small" style={{ color: '#6b7280' }} />,
          title: 'DOM Updated',
          description: 'Content updated',
          category: 'events',
          metadata: { id: data.id }
        }
      }
    }

    // Custom events (type: 5)
    if (event.type === 5 && event.data) {
      const eventData = event.data
      if (eventData.tag === 'page_view') {
        return {
          icon: <Eye className="icon-small" style={{ color: '#9333ea' }} />,
          title: 'Page View',
          description: eventData.payload?.page || 'Viewed page',
          category: 'events'
        }
      }
      if (eventData.tag === 'button_click') {
        return {
          icon: <MousePointerClick className="icon-small" style={{ color: '#10b981' }} />,
          title: 'Button Clicked',
          description: eventData.payload?.button_id || eventData.payload?.button_text || 'Clicked button',
          category: 'events'
        }
      }
      if (eventData.tag === 'form_submit') {
        return {
          icon: <Type className="icon-small" style={{ color: '#f59e0b' }} />,
          title: 'Form Submitted',
          description: eventData.payload?.form_id || 'Submitted form',
          category: 'events'
        }
      }
    }

    // Default fallback - try to extract useful info from raw data
    const metadata: any = {}
    if (event.data) {
      if (event.data.x !== undefined) metadata.x = event.data.x
      if (event.data.y !== undefined) metadata.y = event.data.y
      if (event.data.id !== undefined) metadata.id = event.data.id
    }

    // Try to determine event type from data structure
    let title = 'Event'
    if (event.type === 3 && event.data) {
      if (event.data.source === 2 && (event.data.type === 0 || event.data.type === 1)) {
        title = 'Clicked Element'
      } else if (event.data.source === 5 && event.data.type === 6) {
        title = 'Element Focused'
      } else if (event.data.source === 5 && (event.data.type === 0 || event.data.type === 5)) {
        title = event.data.text ? 'User typed in input' : 'Input Changed'
      }
    }

    return {
      icon: <Move className="icon-small" style={{ color: '#6b7280' }} />,
      title: title,
      description: '',
      category: 'events',
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined
    }
  }

  // Highlight element in replay by ID
  const highlightElement = (elementId: number) => {
    if (!playerRef.current || !replayContainerRef.current) return
    
    try {
      // Get the iframe containing the replay
      const iframe = replayContainerRef.current.querySelector('iframe') as HTMLIFrameElement
      if (!iframe || !iframe.contentWindow || !iframe.contentDocument) return
      
      const iframeDoc = iframe.contentDocument
      
      // Find element by ID (rrweb stores node IDs)
      // rrweb uses data-rrweb-id attribute or we can search by node ID
      const element = iframeDoc.querySelector(`[data-rrweb-id="${elementId}"]`) ||
                     iframeDoc.querySelector(`[id="${elementId}"]`) ||
                     Array.from(iframeDoc.querySelectorAll('*')).find((el: any) => {
                       // Try to match by various attributes
                       return el.getAttribute('data-rrweb-id') === String(elementId) ||
                              el.id === String(elementId)
                     })
      
      if (element) {
        // Add pulse animation and red border
        const htmlElement = element as HTMLElement
        const originalBorder = htmlElement.style.border
        const originalOutline = htmlElement.style.outline
        const originalTransition = htmlElement.style.transition
        
        htmlElement.style.border = '3px solid #ef4444'
        htmlElement.style.outline = '2px solid rgba(239, 68, 68, 0.3)'
        htmlElement.style.transition = 'all 0.3s ease'
        htmlElement.style.animation = 'pulse 1s ease-in-out 3'
        
        // Scroll element into view
        htmlElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
          htmlElement.style.border = originalBorder
          htmlElement.style.outline = originalOutline
          htmlElement.style.transition = originalTransition
          htmlElement.style.animation = ''
        }, 3000)
        
        console.log(`✨ Highlighted element with ID: ${elementId}`)
      } else {
        console.warn(`⚠️ Could not find element with ID: ${elementId}`)
      }
    } catch (error) {
      console.error('Error highlighting element:', error)
    }
  }

  // Seek to a specific event timestamp
  const seekToEvent = (event: any, index: number) => {
    if (!event.timestamp) return
    
    setSelectedEventIndex(index)
    
    // Calculate time offset from first event
    const firstEvent = snapshots.find((s: any) => s.timestamp)
    if (!firstEvent) return
    
    const eventTime = event.timestamp
    const firstTime = firstEvent.timestamp
    const timeOffset = eventTime - firstTime
    
    // Pause playback first
    if (playerRef.current && isPlaying) {
      playerRef.current.pause()
      setIsPlaying(false)
    }
    
    // Seek to the event timestamp
    if (playerRef.current) {
      try {
        playerRef.current.pause()
        setIsPlaying(false)
        // CRITICAL: Use seek() instead of goto() to prevent restarting
        console.log("Seeking to:", timeOffset)
        const currentTime = playerRef.current.getCurrentTime()
        console.log("Current time:", currentTime)
        
        try {
          // Use type assertion since seek() may not be in TypeScript definitions
          ;(playerRef.current as any).seek(timeOffset)
          setCurrentTime(timeOffset)
          setIsFinished(false) // Reset finished state when seeking
          console.log(`🎯 Seeking to event at ${timeOffset}ms (${formatDuration(timeOffset)})`, { event, index })
          playerRef.current.play()
          setIsPlaying(true)
        } catch (error) {
          // Fallback to goto if seek doesn't work
          console.warn('seek() not available, using goto():', error)
          try {
            ;(playerRef.current as any).goto(timeOffset)
            setCurrentTime(timeOffset)
            setIsFinished(false) // Reset finished state when seeking
            playerRef.current.play()
            setIsPlaying(true)
          } catch (error2) {
            // Last resort: use play with timeOffset
            playerRef.current.play(timeOffset)
            setIsPlaying(true)
            setIsFinished(false) // Reset finished state when seeking
            setCurrentTime(timeOffset)
          }
        }
        
        // Highlight element if ID is available
        const parsed = parseEventDescription(event)
        if (parsed.metadata?.id) {
          setTimeout(() => {
            highlightElement(parsed.metadata!.id!)
          }, 500) // Wait a bit for replay to seek
        }
      } catch (error) {
        console.error('Error seeking to event:', error)
      }
    } else if (hasVideo && videoPlayerRef.current) {
      // Handle video player
      videoPlayerRef.current.currentTime = timeOffset / 1000
      setCurrentTime(timeOffset)
    }
  }

  // Filter events by category
  const getFilteredEvents = () => {
    if (activeFilter === 'events') {
      return events.filter(e => {
        const parsed = parseEventDescription(e)
        return parsed.category === 'events'
      })
    }
    if (activeFilter === 'gestures') {
      return events.filter(e => {
        const parsed = parseEventDescription(e)
        return parsed.category === 'gestures'
      })
    }
    if (activeFilter === 'screens') {
      return events.filter(e => {
        const parsed = parseEventDescription(e)
        return parsed.category === 'screens'
      })
    }
    return events
  }

  // Removed loading spinner - data loads in background

  // If error, redirect to sessions list (session should have been filtered out)
  useEffect(() => {
    if (error) {
      // Redirect immediately instead of showing error
      navigate(`/dashboard/sessions/${projectId}`)
    }
  }, [error, navigate, projectId])
  
  if (error) {
    return null // Don't render anything while redirecting
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Left Panel - Session List */}
      <div style={{ 
        width: isReplayExpanded ? '0' : '220px',
        overflow: isReplayExpanded ? 'hidden' : 'visible',
        backgroundColor: 'white', 
        borderRight: isReplayExpanded ? 'none' : '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease, border 0.3s ease',
        flexShrink: 0
      }}>
        <div style={{ 
          padding: '0.75rem', 
          borderBottom: '1px solid #e5e7eb',
          fontWeight: '500',
          color: '#111827',
          fontSize: '0.8125rem'
        }}>
          Session
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sessions.map((s) => {
            const isSelected = s.id === sessionId || s.session_id === sessionId
            const sessionKey = s.session_id || s.id
            const isBookmarked = bookmarkedSessions.has(sessionKey)
            
            return (
              <div
                key={s.id}
                onClick={(e) => {
                  // Don't navigate if clicking checkbox or bookmark
                  if ((e.target as HTMLElement).closest('input[type="checkbox"]') || 
                      (e.target as HTMLElement).closest('button')) {
                    return
                  }
                  // Use session_id (SDK session ID) for navigation, not database id
                  const sessionIdForNav = s.session_id || s.id
                  navigate(`/dashboard/sessions/${projectId}/${sessionIdForNav}`)
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#eff6ff' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#f9fafb')}
                onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'white')}
              >
                <input 
                  type="checkbox" 
                  onClick={(e) => e.stopPropagation()}
                  style={{ cursor: 'pointer', width: '14px', height: '14px', flexShrink: 0 }}
                />
                <Circle 
                  className="icon-small" 
                  style={{ 
                    width: '6px', 
                    height: '6px', 
                    fill: isSelected ? '#3b82f6' : '#ef4444',
                    color: isSelected ? '#3b82f6' : '#ef4444',
                    flexShrink: 0
                  }} 
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const newBookmarked = new Set(bookmarkedSessions)
                    if (isBookmarked) {
                      newBookmarked.delete(sessionKey)
                    } else {
                      newBookmarked.add(sessionKey)
                    }
                    setBookmarkedSessions(newBookmarked)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.125rem',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0
                  }}
                >
                  <Bookmark 
                    className="icon-small" 
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      fill: isBookmarked ? '#ef4444' : 'none',
                      color: isBookmarked ? '#ef4444' : '#9ca3af'
                    }} 
                  />
                </button>
                {isSelected ? (
                  <Pause className="icon-small" style={{ color: '#3b82f6', width: '14px', height: '14px', flexShrink: 0 }} />
                ) : (
                  <Play className="icon-small" style={{ color: '#6b7280', width: '14px', height: '14px', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {(() => {
                    // Format time/date: "23:45 - 01 Feb 2026"
                    const startTime = s.start_time ? new Date(s.start_time) : null
                    const timeStr = startTime 
                      ? `${startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${startTime.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}`
                      : '—'
                    
                    // Get city and country
                    const city = (s as any).location?.city ||
                                 s.device_info?.city || 
                                 (typeof s.device_info === 'object' && s.device_info !== null ? (s.device_info as any).city : null) ||
                                 s.user_properties?.city || 
                                 null
                    const country = (s as any).location?.country ||
                                   s.device_info?.country || 
                                   (typeof s.device_info === 'object' && s.device_info !== null ? (s.device_info as any).country : null) ||
                                   s.user_properties?.country || 
                                   null
                    
                    // Format duration
                    const duration = s.duration ? Math.round(s.duration / 1000) : 0
                    const mins = Math.floor(duration / 60)
                    const secs = duration % 60
                    const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`
                    
                    return (
                      <>
                        <div style={{ fontSize: '0.75rem', fontWeight: '500', color: '#111827', lineHeight: '1.3', marginBottom: '0.125rem' }}>
                          {timeStr}
                  </div>
                        {city && (
                          <div style={{ fontSize: '0.6875rem', color: '#6b7280', lineHeight: '1.2' }}>
                            {city}
                  </div>
                        )}
                        {country && (
                          <div style={{ fontSize: '0.6875rem', color: '#6b7280', lineHeight: '1.2', marginBottom: '0.125rem' }}>
                            {country}
                  </div>
                        )}
                        <div style={{ fontSize: '0.625rem', color: '#9ca3af', lineHeight: '1.2' }}>
                          {durationStr}
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Pagination */}
        <div style={{ 
          padding: '0.75rem', 
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.375rem'
        }}>
          <button style={{ 
            padding: '0.25rem 0.375rem',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            background: 'white',
            cursor: 'pointer',
            fontSize: '0.8125rem'
          }}>
            &lt;
          </button>
          <button style={{ 
            padding: '0.25rem 0.375rem',
            border: '1px solid #9333ea',
            borderRadius: '4px',
            background: '#9333ea',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.8125rem'
          }}>
            1
          </button>
          <button style={{ 
            padding: '0.25rem 0.375rem',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            background: 'white',
            cursor: 'pointer',
            fontSize: '0.8125rem'
          }}>
            2
          </button>
          <button style={{ 
            padding: '0.25rem 0.375rem',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            background: 'white',
            cursor: 'pointer',
            fontSize: '0.8125rem'
          }}>
            &gt;
          </button>
        </div>
      </div>

      {/* Center Panel - Replay */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f9fafb', overflow: 'hidden', minHeight: 0 }}>
        {/* Top Bar */}
        <div style={{ 
          padding: '1rem 1.5rem', 
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
          {session && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#111827' }}>
                <User className="icon-small" style={{ width: '16px', height: '16px' }} />
                <span>{session.session_id || session.id}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#111827' }}>
                <MapPin className="icon-small" style={{ width: '16px', height: '16px' }} />
                <span>
                  {(() => {
                    const city = (session as any).location?.city ||
                                 session.device_info?.city || 
                                 (typeof session.device_info === 'object' && session.device_info !== null ? (session.device_info as any).city : null) ||
                                 session.user_properties?.city || 
                                 null
                    const country = (session as any).location?.country ||
                                   session.device_info?.country || 
                                   (typeof session.device_info === 'object' && session.device_info !== null ? (session.device_info as any).country : null) ||
                                   session.user_properties?.country || 
                                   null
                    if (city && country) {
                      return `${city}, ${country}`
                    } else if (city) {
                      return city
                    } else if (country) {
                      return country
                    }
                    return 'Unknown'
                  })()}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#111827' }}>
                <Calendar className="icon-small" style={{ width: '16px', height: '16px' }} />
                <span>{new Date(session.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#111827' }}>
                <Tag className="icon-small" style={{ width: '16px', height: '16px' }} />
                <span>Labels</span>
              </div>
            </>
          )}
          </div>
          
          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsReplayExpanded(!isReplayExpanded)}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              transition: 'all 0.2s',
              width: '36px',
              height: '36px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6'
              e.currentTarget.style.borderColor = '#9333ea'
              e.currentTarget.style.color = '#9333ea'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.color = '#6b7280'
            }}
            title={isReplayExpanded ? 'Collapse replay' : 'Expand replay'}
          >
            {isReplayExpanded ? (
              <Minimize style={{ width: '18px', height: '18px' }} />
            ) : (
              <Maximize style={{ width: '18px', height: '18px' }} />
            )}
          </button>
        </div>

        {/* Replay Container */}
        <div style={{ 
          flex: 1, 
          padding: '0.5rem',
          display: 'flex',
          alignItems: selectedPlatform === 'mobile' ? 'center' : 'stretch',
          justifyContent: selectedPlatform === 'mobile' ? 'center' : 'stretch',
          overflow: 'hidden',
          backgroundColor: '#f9fafb',
          minHeight: 0,
          position: 'relative' // Needed for absolute positioning of controls
        }}>
          <div 
            ref={replayContainerRef}
            style={{ 
              width: selectedPlatform === 'mobile' ? '375px' : '100%',
              height: selectedPlatform === 'mobile' ? '667px' : '100%',
              maxWidth: selectedPlatform === 'mobile' ? '375px' : '100%',
              maxHeight: selectedPlatform === 'mobile' ? '667px' : '100%',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: selectedPlatform === 'mobile' ? '0 8px 16px rgba(0, 0, 0, 0.15)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              flex: selectedPlatform === 'mobile' ? '0 0 auto' : 1,
              minHeight: '400px' // Ensure container is always visible, even before data loads
            }}
          >
            {/* Show loading state - only when no snapshots loaded yet */}
            {false && snapshots.length === 0 && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                flexDirection: 'column',
                color: '#6b7280',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 10,
                backgroundColor: 'white'
              }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  border: '2px solid #9333ea', 
                  borderTop: 'transparent', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite',
                  marginBottom: '0.5rem'
                }}></div>
                <p>Loading replay...</p>
              </div>
            )}
            {/* Show error state - only when no snapshots */}
            {error && snapshots.length === 0 && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                flexDirection: 'column',
                color: '#dc2626',
                padding: '1rem',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 10,
                backgroundColor: 'white'
              }}>
                <p style={{ fontWeight: '500' }}>Error loading replay</p>
                <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '0.5rem', textAlign: 'center' }}>
                  {error}
                </p>
              </div>
            )}
            {/* Show video player for mobile sessions */}
            {hasVideo && videoUrl && (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#000',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 10
              }}>
                <video
                  ref={videoPlayerRef}
                  src={videoUrl}
                  controls
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                  onTimeUpdate={(e) => {
                    const video = e.currentTarget
                    if (video) {
                      setCurrentTime(video.currentTime * 1000) // Convert to milliseconds
                    }
                  }}
                  onLoadedMetadata={(e) => {
                    const video = e.currentTarget
                    if (video && video.duration) {
                      setDuration(video.duration * 1000) // Convert to milliseconds
                    }
                  }}
                  onError={(e) => {
                    console.error('❌ Video load error:', e)
                    setError('Failed to load video. The video file may not be accessible.')
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            )}
            
            {/* Show loading message when data is being fetched */}
            {isLoadingData && snapshots.length === 0 && !hasVideo && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                flexDirection: 'column',
                color: '#6b7280',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 10,
                backgroundColor: 'white'
              }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  border: '3px solid #e5e7eb', 
                  borderTop: '3px solid #9333ea', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite',
                  marginBottom: '1rem'
                }}></div>
                <p style={{ fontSize: '1rem', fontWeight: '500', color: '#111827', marginBottom: '0.5rem' }}>Loading replay data...</p>
                <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                  Please wait while we fetch the session replay
                </p>
              </div>
            )}
            
            {/* Show "no data" message only when NOT loading, no error, no snapshots, and no video */}
            {!isLoadingData && snapshots.length === 0 && !hasVideo && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                flexDirection: 'column',
                color: '#6b7280',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 10,
                backgroundColor: 'white',
                padding: '2rem'
              }}>
                <p style={{ fontSize: '1rem', fontWeight: '500', color: '#111827', marginBottom: '0.5rem' }}>
                  {error ? 'No Replay Data Available' : 'No replay data available'}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '0.5rem', textAlign: 'center', maxWidth: '500px' }}>
                  {error || 'This session was recorded before visual replay was enabled or snapshots failed to upload.'}
                </p>
                {session && session.duration && session.duration > 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '1rem', fontStyle: 'italic' }}>
                    Note: Session has duration ({Math.round(session.duration / 1000)}s) but no replay data. This may indicate snapshots failed to upload.
                  </p>
                )}
              </div>
            )}
            {/* Replay player will be rendered here by initializePlayer() when snapshots.length > 0 */}
            
            {/* Skip Inactivity Indicator */}
            {isSkippingInactivity && skipInactivity && (
              <div style={{
                position: 'absolute',
                top: '1rem',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(147, 51, 234, 0.95)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                animation: 'pulse 2s ease-in-out infinite',
                pointerEvents: 'none'
              }}>
                <FastForward style={{ width: '16px', height: '16px' }} />
                <span>Skipping inactivity...</span>
              </div>
            )}
            
          </div>
          
          {/* Media Controls Container - White Container with Progress Bar Above - Like Picture 2 */}
          <div 
            id="session-replay-controls"
            style={{
              position: 'absolute',
              bottom: '0.5rem',
              left: '0.5rem',
              right: '0.5rem',
              backgroundColor: 'white',
              padding: '0',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 99999,
              pointerEvents: 'auto',
              opacity: 1,
              visibility: 'visible',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}
          >
            {/* Progress Bar Above Controls - Attached to Container */}
            <div 
              style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#9333ea',
                position: 'relative',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation()
                if (duration > 0 && playerRef.current) {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const clickX = e.clientX - rect.left
                  const percentage = Math.max(0, Math.min(1, clickX / rect.width))
                  const targetTime = percentage * duration
                  
                  if (hasVideo && videoPlayerRef.current) {
                    videoPlayerRef.current.currentTime = targetTime / 1000
                    setCurrentTime(targetTime)
                  } else if (playerRef.current) {
                    // Fast seeking - directly use play(timeOffset) without pause/play cycle
                    try {
                      // Check if replayer is still valid
                      if (!playerRef.current || (playerRef.current as any).destroyed) {
                        return
                      }
                      
                      // Direct seek - play() with timeOffset handles pause/play automatically
                      const wasPlaying = isPlaying
                        playerRef.current.play(targetTime)
                      
                      // Update state immediately for instant UI feedback
                      // The continuous progress update will take over from here
                      setCurrentTime(targetTime)
                      setIsFinished(false) // Reset finished state when seeking
                      if (wasPlaying) {
                        setIsPlaying(true)
                      }
                    } catch (error: any) {
                      console.error('Error seeking:', error)
                    }
                  }
                }
              }}
            >
              {/* Blue progress overlay */}
              <div 
                style={{
                  height: '100%',
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  backgroundColor: '#3b82f6',
                  transition: 'none', // No transition for instant updates during seeking
                  position: 'relative'
                }}
              />
              {/* Blue circular playhead */}
              {duration > 0 && (
                <div style={{
                  position: 'absolute',
                  left: `${(currentTime / duration) * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '50%',
                  border: '2px solid white',
                  cursor: 'grab',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  pointerEvents: 'none'
                }} />
              )}
            </div>
            
            {/* Control Buttons Row */}
            <div style={{
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              
              {/* Playback Controls */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  // Skip backward 5 seconds
                  if (hasVideo && videoPlayerRef.current) {
                    videoPlayerRef.current.currentTime = Math.max(0, (currentTime - 5000) / 1000)
                    setCurrentTime(Math.max(0, currentTime - 5000))
                    setIsFinished(false) // Reset finished state when skipping
                  } else if (playerRef.current) {
                    try {
                      // Check if replayer is still valid
                      if ((playerRef.current as any).destroyed) {
                        return
                      }
                      
                    const currentTime = playerRef.current.getCurrentTime()
                    const targetTime = Math.max(0, currentTime - 5000)
                      
                      // Fast seek - directly use play(timeOffset)
                      const wasPlaying = isPlaying
                        playerRef.current.play(targetTime)
                      
                      // Update state immediately - continuous progress update will take over
                      setCurrentTime(targetTime)
                      setIsFinished(false) // Reset finished state when skipping
                      if (wasPlaying) {
                        setIsPlaying(true)
                      }
                    } catch (error: any) {
                      console.error('Error skipping backward:', error)
                    }
                  }
                }}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  color: '#1f2937',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  justifyContent: 'center'
                }}
              >
                <SkipBack style={{ width: '18px', height: '18px' }} />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  togglePlay()
                }}
                style={{
                  background: isFinished ? '#10b981' : '#3b82f6',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  justifyContent: 'center'
                }}
                title={isFinished ? 'Replay' : isPlaying ? 'Pause' : 'Play'}
              >
                {isFinished ? (
                  <RotateCcw style={{ width: '18px', height: '18px' }} />
                ) : isPlaying ? (
                  <Pause style={{ width: '18px', height: '18px' }} />
                ) : (
                  <Play style={{ width: '18px', height: '18px' }} />
                )}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  // Skip forward 5 seconds
                  if (hasVideo && videoPlayerRef.current) {
                    videoPlayerRef.current.currentTime = Math.min(duration / 1000, (currentTime + 5000) / 1000)
                    setCurrentTime(Math.min(duration, currentTime + 5000))
                    setIsFinished(false) // Reset finished state when skipping
                  } else if (playerRef.current) {
                    try {
                      // Check if replayer is still valid
                      if ((playerRef.current as any).destroyed) {
                        return
                      }
                      
                    const currentTime = playerRef.current.getCurrentTime()
                    const targetTime = Math.min(duration, currentTime + 5000)
                      
                      // Fast seek - directly use play(timeOffset)
                      const wasPlaying = isPlaying
                        playerRef.current.play(targetTime)
                      
                      // Update state immediately - continuous progress update will take over
                      setCurrentTime(targetTime)
                      setIsFinished(false) // Reset finished state when skipping
                      if (wasPlaying) {
                        setIsPlaying(true)
                      }
                    } catch (error: any) {
                      console.error('Error skipping forward:', error)
                    }
                  }
                }}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  color: '#1f2937',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  justifyContent: 'center'
                }}
              >
                <SkipForward style={{ width: '18px', height: '18px' }} />
              </button>
              
              {/* Time Display */}
              <div style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                minWidth: '100px',
                textAlign: 'center'
              }}>
                {formatDuration(currentTime)}/{formatDuration(duration)} <span style={{ color: '#9333ea' }}>unknown</span>
              </div>
              
              {/* Skip Inactivity */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const newSkipInactivity = !skipInactivity
                  setSkipInactivity(newSkipInactivity)
                  // The useEffect will handle cleanup and speed reset
                  // But we can also reset immediately for better UX
                  if (!newSkipInactivity) {
                  setIsSkippingInactivity(false)
                    if (playerRef.current && !(playerRef.current as any).destroyed) {
                    try {
                      playerRef.current.setConfig({ speed: basePlaybackSpeedRef.current })
                    } catch (e) {
                      // Ignore errors
                      }
                    }
                    // Clear interval immediately
                    if (inactivityCheckIntervalRef.current) {
                      clearInterval(inactivityCheckIntervalRef.current)
                      inactivityCheckIntervalRef.current = null
                    }
                  }
                }}
                style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  color: '#374151',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <FastForward style={{ width: '14px', height: '14px', color: '#3b82f6' }} />
                Skip Inactivity: {skipInactivity ? 'On' : 'Off'}
              </button>
              
              {/* Speed Selector */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSpeedChange(playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 4 : 1)
                }}
                style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  color: '#374151',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                {playbackSpeed}x
                <ChevronRight style={{ width: '12px', height: '12px', transform: 'rotate(90deg)' }} />
              </button>
              
              {/* Chat/Comments */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  // Chat/Comments functionality
                }}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  color: '#1f2937',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  justifyContent: 'center'
                }}
              >
                <MessageCircle style={{ width: '18px', height: '18px' }} />
              </button>
              
              {/* Settings */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  // Settings functionality
                }}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  color: '#1f2937',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  justifyContent: 'center'
                }}
              >
                <Settings style={{ width: '18px', height: '18px' }} />
              </button>
              
              {/* Fullscreen */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (replayContainerRef.current) {
                    if (document.fullscreenElement) {
                      document.exitFullscreen()
                    } else {
                      replayContainerRef.current.requestFullscreen()
                    }
                  }
                }}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  color: '#1f2937',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  justifyContent: 'center'
                }}
              >
                <Maximize style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Right Panel - Activity Timeline */}
      <div style={{ 
        width: isReplayExpanded ? '0' : '280px',
        overflow: isReplayExpanded ? 'hidden' : 'visible',
        backgroundColor: 'white', 
        borderLeft: isReplayExpanded ? 'none' : '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease, border 0.3s ease',
        flexShrink: 0
      }}>
        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #e5e7eb',
          padding: '0 0.75rem'
        }}>
          {(['activity', 'info', 'notes', 'logs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab ? '#3b82f6' : '#6b7280',
                fontWeight: activeTab === tab ? '500' : '400',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontSize: '0.8125rem'
              }}
            >
              {tab === 'info' ? 'Session Info' : tab === 'notes' ? 'Notes' : tab === 'logs' ? 'Logs' : 'Activity'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {activeTab === 'activity' && (
            <>
              {/* Filter Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {(['events', 'gestures', 'screens'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: activeFilter === filter ? '#3b82f6' : 'white',
                      color: activeFilter === filter ? 'white' : '#6b7280',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      fontWeight: activeFilter === filter ? '500' : '400'
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Activity Timeline */}
              <div>
                {events.length > 0 ? (
                  <>
                    <div style={{ 
                      fontSize: '0.875rem', 
                      color: '#6b7280', 
                      marginBottom: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0'
                    }}>
                      <span>00:00.0 unknown</span>
                      {duration > 0 && (
                        <span>{Math.round(duration / 1000)} sec</span>
                      )}
                    </div>
                    {getFilteredEvents().slice(0, 50).map((event, index) => {
                      const parsed = parseEventDescription(event)
                      const eventTime = event.timestamp ? formatTime(event.timestamp) : `${Math.round((index * 100) / 1000)}s`
                      const isSelected = selectedEventIndex === index
                      
                      return (
                        <div
                          key={index}
                          onClick={() => seekToEvent(event, index)}
                          style={{
                            padding: '0.75rem',
                            borderLeft: `3px solid ${isSelected ? '#9333ea' : '#e5e7eb'}`,
                            marginLeft: '0.5rem',
                            marginBottom: '0.5rem',
                            fontSize: '0.875rem',
                            color: '#111827',
                            backgroundColor: isSelected ? '#f3f4f6' : '#f9fafb',
                            borderRadius: '6px',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            position: 'relative',
                            boxShadow: isSelected ? '0 2px 4px rgba(147, 51, 234, 0.1)' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = '#f3f4f6'
                              e.currentTarget.style.borderLeftColor = '#9333ea'
                              e.currentTarget.style.transform = 'translateX(2px)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = '#f9fafb'
                              e.currentTarget.style.borderLeftColor = '#e5e7eb'
                              e.currentTarget.style.transform = 'translateX(0)'
                            }
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280', minWidth: '70px', textAlign: 'left', fontFamily: 'monospace' }}>
                              {eventTime}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                              {parsed.icon}
                              <span style={{ fontWeight: '500', color: '#111827', flex: 1 }}>{parsed.title}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                seekToEvent(event, index)
                              }}
                              style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: 'transparent',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                color: '#9333ea',
                                transition: 'all 0.2s',
                                fontSize: '0.75rem'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#ede9fe'
                                e.currentTarget.style.borderColor = '#9333ea'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.borderColor = '#e5e7eb'
                              }}
                              title="Play from this event"
                            >
                              <Play className="icon-small" style={{ width: '12px', height: '12px' }} />
                            </button>
                          </div>
                          {parsed.metadata && parsed.metadata.id !== undefined && (
                            <div style={{ 
                              display: 'flex', 
                              gap: '0.5rem', 
                              flexWrap: 'wrap',
                              marginTop: '0.25rem'
                            }}>
                              <span style={{
                                fontSize: '0.7rem',
                                padding: '0.125rem 0.375rem',
                                backgroundColor: '#fce7f3',
                                color: '#be185d',
                                borderRadius: '4px',
                                fontWeight: '500'
                              }}>
                                ID: {parsed.metadata.id}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {getFilteredEvents().length === 0 && (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                        <p>No {activeFilter} found in this session.</p>
                        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Try switching to another filter tab.</p>
                      </div>
                    )}
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280', 
                      padding: '0.75rem',
                      fontStyle: 'italic',
                      textAlign: 'center'
                    }}>
                      Session ended
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    <p>No events recorded for this session.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'info' && session && (
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>Session Info</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Duration</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                    {session.duration ? formatDuration(session.duration) : 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Events</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                    {session.event_count || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Device</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                    {session.device_info?.model || 'N/A'} ({session.device_info?.os || 'N/A'})
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Location</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                    {(() => {
                      // Try multiple sources for location
                      const city = session.device_info?.city || 
                                   (typeof session.device_info === 'object' && session.device_info !== null ? (session.device_info as any).city : null) ||
                                   session.user_properties?.city || 
                                   null
                      const country = session.device_info?.country || 
                                     (typeof session.device_info === 'object' && session.device_info !== null ? (session.device_info as any).country : null) ||
                                     session.user_properties?.country || 
                                     null
                      if (city && country) {
                        return `${city}, ${country}`
                      } else if (city) {
                        return city
                      } else if (country) {
                        return country
                      }
                      return 'N/A, N/A'
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <p>No notes for this session.</p>
            </div>
          )}

          {activeTab === 'logs' && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <p>No logs available.</p>
            </div>
          )}
        </div>
        
        {/* Navigation Buttons */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <button
            onClick={() => {
              const currentIndex = sessions.findIndex(s => (s.id === sessionId || s.session_id === sessionId))
              if (currentIndex > 0) {
                const prevSession = sessions[currentIndex - 1]
                const sessionIdForNav = prevSession.session_id || prevSession.id
                navigate(`/dashboard/sessions/${projectId}/${sessionIdForNav}`)
              }
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              color: '#6b7280',
              textAlign: 'left'
            }}
          >
            Previous user session
          </button>
          <button
            onClick={() => {
              const currentIndex = sessions.findIndex(s => (s.id === sessionId || s.session_id === sessionId))
              if (currentIndex < sessions.length - 1) {
                const nextSession = sessions[currentIndex + 1]
                const sessionIdForNav = nextSession.session_id || nextSession.id
                navigate(`/dashboard/sessions/${projectId}/${sessionIdForNav}`)
              }
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              color: '#6b7280',
              textAlign: 'left'
            }}
          >
            Next user session
          </button>
        </div>
      </div>
    </div>
  )
}
