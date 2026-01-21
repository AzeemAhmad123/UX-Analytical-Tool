import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Play, Pause, ChevronLeft, User, MapPin, Calendar, Tag, Clock, MousePointer, MousePointerClick, Scroll, Type, Move, Eye } from 'lucide-react'
import { sessionsAPI } from '../../services/api'
import { Replayer } from 'rrweb'
import '../../components/dashboard/Dashboard.css'

type Platform = 'web' | 'mobile'

export function SessionReplayPlayer() {
  const { projectId, sessionId } = useParams()
  const navigate = useNavigate()
  const replayContainerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false) // Start with false - load in background
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([]) // All sessions for left panel
  const [events, setEvents] = useState<any[]>([]) // Events for activity timeline
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const playerRef = useRef<Replayer | null>(null)
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [hasVideo, setHasVideo] = useState(false)
  const [activeTab, setActiveTab] = useState<'activity' | 'info' | 'notes' | 'logs'>('activity')
  const [activeFilter, setActiveFilter] = useState<'events' | 'gestures' | 'screens'>('events')
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('web')

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
      // Load data sequentially to avoid race conditions and AbortErrors
      loadSessionData()
        .then(() => {
          if (isMounted) {
            return loadSnapshots()
          }
        })
        .then(() => {
          if (isMounted) {
            return loadEvents()
          }
        })
        .catch((error: any) => {
          if (error?.name !== 'AbortError' && isMounted) {
            console.error('Error loading session replay data:', error)
          }
        })
    }
    
    return () => {
      isMounted = false
    }
  }, [projectId, sessionId])

  useEffect(() => {
    if (snapshots.length > 0 && replayContainerRef.current) {
      console.log('🎬 useEffect: Conditions met, initializing player', {
        snapshotsCount: snapshots.length,
        hasContainer: !!replayContainerRef.current,
        containerReady: replayContainerRef.current.offsetWidth > 0,
        platform: selectedPlatform
      })
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initializePlayer()
      }, 100)
      return () => {
        clearTimeout(timer)
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
            // Clean up cursor overlay
            if ((playerRef.current as any)._cursorOverlay) {
              const overlay = (playerRef.current as any)._cursorOverlay
              if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay)
              }
            }
            // Clean up mouse move interval
            if ((playerRef.current as any)._mouseMoveInterval) {
              clearInterval((playerRef.current as any)._mouseMoveInterval)
            }
            // No need to restore - we're not overriding anything globally anymore
            playerRef.current.pause()
            playerRef.current = null
            if (replayContainerRef.current) {
              replayContainerRef.current.innerHTML = ''
            }
          } catch (e) {
            console.error('Error cleaning up player:', e)
          }
        }
      }
    }
  }, [snapshots.length, loading, selectedPlatform]) // Re-initialize when platform changes

  const loadAllSessions = async () => {
    if (!projectId) return
    try {
      const response = await sessionsAPI.getByProject(projectId, {
        limit: 50,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString()
      })
      setSessions(response.sessions || [])
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
      
      // Calculate duration from session timestamps
      if (response.session) {
        const startTime = new Date(response.session.start_time).getTime()
        const endTime = new Date(response.session.last_activity_time).getTime()
        const calculatedDuration = endTime - startTime
        if (calculatedDuration > 0) {
          setDuration(calculatedDuration)
        } else if (response.session.duration) {
          setDuration(response.session.duration)
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
        console.log(`✅ Loaded ${eventList.length} events for activity timeline`)
      } else if (response.events) {
        setEvents(response.events)
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
      
      console.log('📥 Loading snapshots for session:', { projectId, sessionId })
      
      // Use sessions API which returns snapshots in correct format
      const data = await sessionsAPI.getById(projectId, sessionId)
      
      console.log('📦 Received session data:', {
        hasSnapshots: !!data.snapshots,
        snapshotsType: typeof data.snapshots,
        snapshotsLength: Array.isArray(data.snapshots) ? data.snapshots.length : 'N/A',
        totalSnapshots: data.total_snapshots,
        snapshotBatches: data.snapshot_batches,
        dataKeys: Object.keys(data),
        fullData: data // Log full response for debugging
      })
      
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
        setLoading(false)
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
        setLoading(false)
        return // Don't try to load snapshots
      }
      
      // Backend returns snapshots array directly
      if (data.snapshots && Array.isArray(data.snapshots)) {
        events = data.snapshots
        console.log(`✅ Loaded ${events.length} events from snapshots array`)
        console.log('First event sample:', events[0])
        console.log('Event types:', events.slice(0, 10).map((e: any) => ({ type: e.type, hasData: !!e.data, hasTimestamp: !!e.timestamp })))
      } else if (data.snapshots) {
        // Fallback for other formats
        if (typeof data.snapshots === 'string') {
          try {
            const parsed = JSON.parse(data.snapshots)
            events = Array.isArray(parsed) ? parsed : [parsed]
            console.log(`✅ Parsed ${events.length} events from string`)
          } catch (parseError) {
            console.error('❌ Failed to parse snapshots string:', parseError)
            setError('Invalid snapshot data format')
            setLoading(false)
            return
          }
        } else {
          events = [data.snapshots]
          console.log('✅ Wrapped single snapshot in array')
        }
      }
      
      if (events.length === 0) {
        // Check if this is a mobile session with video instead of snapshots
        const videoUrl = data.session?.video_url || data.session?.videoUrl || null
        const hasVideoFlag = data.session?.has_video || data.session?.hasVideo || false
        
        if (hasVideoFlag && videoUrl) {
          console.log('📹 Mobile session detected - using video instead of snapshots:', videoUrl)
          setHasVideo(true)
          setVideoUrl(videoUrl)
          const videoDuration = data.session?.video_duration || data.session?.videoDuration
          if (videoDuration) {
            setDuration(videoDuration)
          }
          setSnapshots([]) // No snapshots for mobile
          setLoading(false)
          return // Don't show error, video will be displayed
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
          setLoading(false)
          return // Don't show error, video will be displayed
        }
        
        console.error('❌ No snapshots found in response!', {
          dataKeys: Object.keys(data),
          hasSnapshots: !!data.snapshots,
          snapshotsValue: data.snapshots,
          hasVideo: data.session?.has_video,
          videoUrl: data.session?.video_url,
          responseStructure: JSON.stringify(data).substring(0, 500)
        })
        setError('No snapshots available for this session. This session was recorded before DOM recording was enabled.')
        setLoading(false)
        return
      }
      
      console.log(`✅ Processing ${events.length} events before validation`)
      
      // Handle old wrapped format if present
      events = events.map((event: any) => {
        // If event is wrapped in old format { type: 'snapshot', data: {...} }
        if (event && event.type === 'snapshot' && event.data) {
          return event.data // Unwrap to get actual rrweb event
        }
        return event
      })
      
      // Validate events have required rrweb properties
      events = events.filter((event: any) => {
        return event && 
               typeof event.type === 'number' && 
               event.data !== undefined
      })
      
      // Ensure events have timestamps (rrweb requires this)
      events = events.map((event: any, index) => {
        if (!event.timestamp) {
          if (index > 0) {
            // Estimate timestamp based on previous event
            const prevEvent = events[index - 1]
            event.timestamp = (prevEvent.timestamp || 0) + 100 // 100ms between events
          } else {
            // First event: use current time minus estimated duration
            event.timestamp = Date.now() - (events.length * 100)
          }
        }
        // Ensure timestamp is a number
        if (typeof event.timestamp === 'string') {
          event.timestamp = new Date(event.timestamp).getTime()
        }
        return event
      })
      
      // Sort by timestamp
      events.sort((a: any, b: any) => {
        const timeA = a.timestamp || 0
        const timeB = b.timestamp || 0
        return timeA - timeB
      })
      
      console.log(`Loaded ${events.length} snapshot events`, {
        firstEvent: events[0],
        lastEvent: events[events.length - 1],
        eventTypes: events.map((e: any) => e.type),
        firstEventDataSize: events[0]?.data ? JSON.stringify(events[0].data).length : 0,
        firstEventPreview: events[0]?.data ? JSON.stringify(events[0].data).substring(0, 200) : 'null'
      })
      
      // VALIDATE: Check if type 2 has actual content
      const type2Event = events.find((e: any) => e.type === 2);
      if (type2Event) {
        const dataSize = JSON.stringify(type2Event.data).length;
        console.log(`Type 2 snapshot validation in frontend:`, {
          hasData: !!type2Event.data,
          dataSize: dataSize,
          hasChildNodes: type2Event.data?.childNodes?.length > 0
        });
        
        if (dataSize < 100) {
          console.warn(`⚠️ Type 2 snapshot data is very small (${dataSize} bytes) - replay may be empty!`);
        }
      }
      
      setSnapshots(events)
      
      // Calculate duration from actual event timestamps
      if (events.length > 0) {
        const timestamps = events
          .map((e: any) => e.timestamp)
          .filter((ts: any) => ts && typeof ts === 'number')
          .sort((a: number, b: number) => a - b)
        
        if (timestamps.length >= 2) {
          const firstTimestamp = timestamps[0]
          const lastTimestamp = timestamps[timestamps.length - 1]
          const totalDuration = lastTimestamp - firstTimestamp
          setDuration(totalDuration)
          console.log(`Calculated duration from snapshots: ${totalDuration}ms (${formatDuration(totalDuration)})`)
        } else if (timestamps.length === 1) {
          setDuration(1000) // 1 second minimum
        }
      }
    } catch (error: any) {
      // Only log non-abort errors (abort errors are expected when component unmounts or requests are cancelled)
      if (error?.name === 'AbortError' || error?.message === 'signal is aborted without reason') {
        // Don't set error state for abort errors - they're expected when component unmounts
        console.log('Request was cancelled (this is normal when navigating away)')
        return
      }
      
      console.error('Error loading snapshots:', error)
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        setError('No snapshots available for this session. This session was recorded before DOM recording was enabled.')
      } else {
        setError(error.message || 'Failed to load snapshots')
      }
    }
    // No finally block - we don't set loading state anymore
  }

  const initializePlayer = () => {
    if (!replayContainerRef.current || snapshots.length === 0) {
      console.warn('Cannot initialize player: container or snapshots missing', {
        hasContainer: !!replayContainerRef.current,
        snapshotCount: snapshots.length
      })
      return
    }

    try {
      // Clear container
      if (replayContainerRef.current) {
        replayContainerRef.current.innerHTML = ''
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
      const type2Index = validSnapshots.findIndex((e: any) => e.type === 2)
      if (type2Index > 0) {
        // Move type 2 to front
        const type2Event = validSnapshots.splice(type2Index, 1)[0]
        validSnapshots.unshift(type2Event)
        console.log('Moved type 2 (full snapshot) to first position')
      } else if (type2Index === -1) {
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

      console.log(`Initializing replay player with ${validSnapshots.length} events`, {
        firstEvent: validSnapshots[0],
        eventTypes: validSnapshots.map((e: any) => e.type)
      })

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

      // Don't override setAttribute or createElement globally - it breaks other code
      // We'll use MutationObserver to watch and remove sandbox after it's set

      // Create Replayer instance with validated events
      // Enhanced cursor visualization like Hotjar/UXCam
      const replayer = new Replayer(validSnapshots, {
        root: wrapper,
        liveMode: false,
        speed: playbackSpeed,
        skipInactive: false,
        showWarning: true,
        // Enhanced mouse cursor visualization - MUST be enabled
        mouseTail: {
          strokeStyle: '#9333ea',
          lineWidth: 3,
          duration: 1500, // Show cursor trail for 1.5 seconds
        },
        // Cursor configuration for better visibility
        plugins: [
          // Add custom cursor plugin if available
        ],
        // Unpack function
        unpackFn: (data: any) => {
          return data
        },
      })

      // Add custom cursor overlay for better visibility
      // This creates a visible cursor element that follows mouse movements
      const cursorOverlay = document.createElement('div')
      cursorOverlay.id = 'rrweb-cursor-overlay'
      cursorOverlay.innerHTML = '👆' // Add emoji for better visibility
      cursorOverlay.style.cssText = `
        position: absolute;
        width: 32px;
        height: 32px;
        border: 3px solid #9333ea;
        border-radius: 50%;
        background: rgba(147, 51, 234, 0.6);
        pointer-events: none;
        z-index: 999999;
        transform: translate(-50%, -50%);
        display: none;
        transition: all 0.1s ease;
        box-shadow: 0 0 15px rgba(147, 51, 234, 0.8);
        font-size: 16px;
        text-align: center;
        line-height: 26px;
        color: white;
        font-weight: bold;
      `
      wrapper.style.position = 'relative'
      wrapper.appendChild(cursorOverlay)
      
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
      
      // Test cursor visibility immediately
      setTimeout(() => {
        cursorOverlay.style.display = 'block'
        cursorOverlay.style.left = '100px'
        cursorOverlay.style.top = '100px'
        cursorOverlay.style.opacity = '1'
        console.log('🧪 Test: Cursor overlay should be visible at (100, 100) for 2 seconds')
        setTimeout(() => {
          cursorOverlay.style.display = 'none'
          console.log('🧪 Test: Cursor overlay hidden')
        }, 2000)
      }, 1000)

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
          for (let i = Math.min(currentIndex, events.length - 1); i >= Math.max(0, currentIndex - 100); i--) {
            const event = events[i]
            if (!event || event.type !== 3 || !event.data) continue
            
            const data = event.data
            
            // Mouse move events (source: 1)
            if (data.source === 1 && data.positions) {
              const positions = Array.isArray(data.positions) ? data.positions : [data.positions]
              if (positions.length > 0) {
                const lastPos = positions[positions.length - 1]
                if (lastPos && typeof lastPos.x === 'number' && typeof lastPos.y === 'number' && !isNaN(lastPos.x) && !isNaN(lastPos.y)) {
                  lastKnownMouseX = lastPos.x
                  lastKnownMouseY = lastPos.y
                  return { x: lastPos.x, y: lastPos.y, found: true }
                }
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
        if (isPlaying && playerRef.current) {
          updateCursorPosition()
        }
      }, 50) // Update every 50ms for smooth cursor movement
      
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
      
      // Also check periodically for the first 10 seconds (in case iframe is created very late or rrweb re-adds sandbox)
      const checkInterval = setInterval(() => {
        checkAndFixIframes()
      }, 100)
      
      // Stop checking after 10 seconds (increased from 5 to catch late iframe creation)
      setTimeout(() => {
        clearInterval(checkInterval)
      }, 10000)

      // No need to restore - we're not overriding anything globally anymore

      // Store observer and interval for cleanup
      ;(replayer as any)._sandboxObserver = observer
      ;(replayer as any)._sandboxCheckInterval = checkInterval

      playerRef.current = replayer

      // Calculate duration from actual event timestamps
      if (validSnapshots.length > 0) {
        const timestamps = validSnapshots
          .map((e: any) => e.timestamp)
          .filter((ts: any) => ts && typeof ts === 'number')
          .sort((a: number, b: number) => a - b)
        
        if (timestamps.length >= 2) {
          const firstTimestamp = timestamps[0]
          const lastTimestamp = timestamps[timestamps.length - 1]
          const totalDuration = lastTimestamp - firstTimestamp
          setDuration(totalDuration)
          console.log(`Calculated duration: ${totalDuration}ms (${formatDuration(totalDuration)}) from ${timestamps.length} events`)
        } else if (timestamps.length === 1) {
          // Single event, use a minimal duration
          setDuration(1000) // 1 second minimum
        }
      }

      // Set up event listeners
      replayer.on('start', () => {
        setIsPlaying(true)
        console.log('Replay started')
      })

      replayer.on('pause', () => {
        setIsPlaying(false)
        console.log('Replay paused')
      })

      replayer.on('resume', () => {
        setIsPlaying(true)
        console.log('Replay resumed')
      })

      replayer.on('finish', () => {
        setIsPlaying(false)
        console.log('Replay finished')
      })

      // Update current time from replayer - continuously update progress
      replayer.on('state-change', (state: any) => {
        if (state.timeOffset !== undefined) {
          setCurrentTime(state.timeOffset)
        }
      })
      
      // Also update time periodically for smooth progress bar
      const timeUpdateInterval = setInterval(() => {
        if (playerRef.current) {
          try {
            // Get current time from replayer
            const timer = (playerRef.current as any).timer
            if (timer && timer.timeOffset !== undefined) {
              setCurrentTime(timer.timeOffset)
            }
          } catch (e) {
            // Ignore errors
          }
        }
      }, 100) // Update every 100ms for smooth progress
      
      // Store interval for cleanup
      ;(replayer as any)._timeUpdateInterval = timeUpdateInterval

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
          
          replayer.play()
          setIsPlaying(true)
          console.log('✅ Auto-playing replay')
          
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

      setLoading(false)
    } catch (error: any) {
      console.error('Error creating player:', error)
      setError('Failed to initialize replay player: ' + error.message)
      setLoading(false)
    }
  }

  const togglePlay = () => {
    // Handle video player for mobile sessions
    if (hasVideo && videoPlayerRef.current) {
      if (isPlaying) {
        videoPlayerRef.current.pause()
      } else {
        videoPlayerRef.current.play()
      }
      setIsPlaying(!isPlaying)
      return
    }
    
    // Handle rrweb replayer for web sessions
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause()
      } else {
        playerRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed)
    
    // Handle video player
    if (hasVideo && videoPlayerRef.current) {
      videoPlayerRef.current.playbackRate = speed
      return
    }
    
    // Handle rrweb replayer
    if (playerRef.current) {
      playerRef.current.setConfig({ speed })
    }
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  // Convert raw events into user-friendly descriptions
  const parseEventDescription = (event: any): { icon: any, title: string, description: string, category: 'events' | 'gestures' | 'screens' } => {
    // rrweb event types: 0=DomContentLoaded, 2=FullSnapshot, 3=IncrementalSnapshot, 4=Meta, 5=Custom
    if (event.type === 2) {
      return {
        icon: <Eye className="icon-small" style={{ color: '#9333ea' }} />,
        title: 'Page Loaded',
        description: 'Initial page snapshot captured',
        category: 'screens'
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
          category: 'gestures'
        }
      }

      // Mouse interactions (source: 2)
      if (source === 2) {
        if (data.type === 1) {
          return {
            icon: <MousePointerClick className="icon-small" style={{ color: '#10b981' }} />,
            title: 'Click',
            description: `Clicked at (${data.x || 0}, ${data.y || 0})`,
            category: 'gestures'
          }
        }
        if (data.type === 2) {
          return {
            icon: <MousePointerClick className="icon-small" style={{ color: '#f59e0b' }} />,
            title: 'Double Click',
            description: `Double clicked at (${data.x || 0}, ${data.y || 0})`,
            category: 'gestures'
          }
        }
        if (data.type === 3) {
          return {
            icon: <MousePointerClick className="icon-small" style={{ color: '#ef4444' }} />,
            title: 'Right Click',
            description: `Right clicked at (${data.x || 0}, ${data.y || 0})`,
            category: 'gestures'
          }
        }
      }

      // Scroll events (source: 3)
      if (source === 3) {
        return {
          icon: <Scroll className="icon-small" style={{ color: '#8b5cf6' }} />,
          title: 'Scrolled',
          description: `Scrolled to position (${data.x || 0}, ${data.y || 0})`,
          category: 'gestures'
        }
      }

      // Input events (source: 5)
      if (source === 5) {
        if (data.type === 0) {
          return {
            icon: <Type className="icon-small" style={{ color: '#06b6d4' }} />,
            title: 'Input Changed',
            description: `Typed in field`,
            category: 'events'
          }
        }
      }

      // DOM mutations (source: 0)
      if (source === 0) {
        return {
          icon: <Move className="icon-small" style={{ color: '#6b7280' }} />,
          title: 'Page Changed',
          description: 'DOM updated',
          category: 'events'
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

    // Default fallback
    return {
      icon: <Move className="icon-small" style={{ color: '#6b7280' }} />,
      title: `Event Type ${event.type || 'Unknown'}`,
      description: event.data ? JSON.stringify(event.data).substring(0, 50) : 'No data',
      category: 'events'
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

  if (error) {
    return (
      <div className="dashboard-page-content" style={{ padding: '2rem' }}>
        <button 
          onClick={() => navigate(`/dashboard/sessions/list`)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 1rem', 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          <ChevronLeft className="icon-small" />
          Back to Sessions
        </button>
        <div className="empty-state">
          <h3>Unable to Load Replay</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Left Panel - Session List */}
      <div style={{ 
        width: '300px', 
        backgroundColor: 'white', 
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '1rem', 
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <button 
            onClick={() => navigate('/dashboard/sessions/list')}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronLeft className="icon-small" />
          </button>
          <span style={{ fontWeight: '500', color: '#111827' }}>Session list</span>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sessions.map((s) => {
            const isSelected = s.id === sessionId
            const duration = s.duration ? Math.round(s.duration / 1000) : 0
            const mins = Math.floor(duration / 60)
            const secs = duration % 60
            
            return (
              <div
                key={s.id}
                onClick={() => {
                  // Use session_id (SDK session ID) for navigation, not database id
                  const sessionIdForNav = s.session_id || s.id
                  navigate(`/dashboard/sessions/${projectId}/${sessionIdForNav}`)
                }}
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#f3f4f6' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
                onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#f9fafb')}
                onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'white')}
              >
                {isSelected ? (
                  <Pause className="icon-small" style={{ color: '#9333ea' }} />
                ) : (
                  <Play className="icon-small" style={{ color: '#6b7280' }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                    {mins}:{secs.toString().padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.session_id?.substring(0, 20) || s.id.substring(0, 20)}...
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    Session {s.session_number || 'N/A'}
                  </div>
                </div>
              </div>
            )
          })}
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
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {session && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  <User className="icon-small" />
                  <span>{session.session_id?.substring(0, 20) || session.id.substring(0, 20)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  <MapPin className="icon-small" />
                  <span>
                    {(() => {
                      // Try multiple sources for location (check all possible locations)
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
                      return 'N/A, N/A'
                    })()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  <Calendar className="icon-small" />
                  <span>{new Date(session.start_time).toLocaleDateString()}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  <Tag className="icon-small" />
                  <span>Labels</span>
                </div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={togglePlay}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#9333ea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {isPlaying ? <Pause className="icon-small" /> : <Play className="icon-small" />}
            </button>
            <button
              onClick={() => handleSpeedChange(playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 4 : 1)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {playbackSpeed}x
            </button>
          </div>
        </div>

        {/* Progress/Timeline Bar */}
        {duration > 0 && (
          <div style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'white',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              flex: 1,
              height: '4px',
              backgroundColor: '#e5e7eb',
              borderRadius: '2px',
              position: 'relative',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
            onClick={(e) => {
              if (duration > 0) {
                const rect = e.currentTarget.getBoundingClientRect()
                const clickX = e.clientX - rect.left
                const percentage = clickX / rect.width
                const newTime = percentage * duration
                
                // Handle video player
                if (hasVideo && videoPlayerRef.current) {
                  videoPlayerRef.current.currentTime = newTime / 1000 // Convert to seconds
                  setCurrentTime(newTime)
                  return
                }
                
                // Handle rrweb replayer
                if (playerRef.current) {
                  playerRef.current.play(newTime)
                  setCurrentTime(newTime)
                }
              }
            }}
            >
              <div style={{
                height: '100%',
                width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                backgroundColor: '#9333ea',
                borderRadius: '2px',
                transition: 'width 0.1s linear'
              }} />
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              color: '#6b7280',
              minWidth: '120px',
              justifyContent: 'flex-end'
            }}>
              <Clock className="icon-small" style={{ width: '14px', height: '14px' }} />
              <span>{formatDuration(currentTime)} / {formatDuration(duration)}</span>
            </div>
          </div>
        )}

        {/* Replay Container */}
        <div style={{ 
          flex: 1, 
          padding: '0.5rem',
          display: 'flex',
          alignItems: selectedPlatform === 'mobile' ? 'center' : 'stretch',
          justifyContent: selectedPlatform === 'mobile' ? 'center' : 'stretch',
          overflow: 'hidden',
          backgroundColor: '#f9fafb',
          minHeight: 0
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
              flex: selectedPlatform === 'mobile' ? '0 0 auto' : 1
            }}
          >
            {/* Show loading state - only when no snapshots loaded yet */}
            {loading && snapshots.length === 0 && (
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
            {hasVideo && videoUrl && !loading && (
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
            
            {/* Show "no data" message only when not loading, no error, no snapshots, and no video */}
            {snapshots.length === 0 && !loading && !error && !hasVideo && (
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
                <p>No replay data available</p>
                <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                  This session was recorded before visual replay was enabled
                </p>
              </div>
            )}
            {/* Replay player will be rendered here by initializePlayer() when snapshots.length > 0 */}
          </div>
        </div>
      </div>

      {/* Right Panel - Activity Timeline */}
      <div style={{ 
        width: '350px', 
        backgroundColor: 'white', 
        borderLeft: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #e5e7eb',
          padding: '0 1rem'
        }}>
          {(['activity', 'info', 'notes', 'logs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #9333ea' : '2px solid transparent',
                color: activeTab === tab ? '#9333ea' : '#6b7280',
                fontWeight: activeTab === tab ? '500' : '400',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontSize: '0.875rem'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
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
                      backgroundColor: activeFilter === filter ? '#9333ea' : 'white',
                      color: activeFilter === filter ? 'white' : '#6b7280',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
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
                      fontSize: '0.75rem', 
                      color: '#6b7280', 
                      marginBottom: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>00:00.0 {session?.device_info?.screen || 'unknown'}</span>
                      {duration > 0 && (
                        <span>{formatDuration(duration)}</span>
                      )}
                    </div>
                    {getFilteredEvents().slice(0, 50).map((event, index) => {
                      const parsed = parseEventDescription(event)
                      const eventTime = event.timestamp ? formatTime(event.timestamp) : `${Math.round((index * 100) / 1000)}s`
                      
                      return (
                        <div
                          key={index}
                          style={{
                            padding: '0.75rem',
                            borderLeft: '2px solid #e5e7eb',
                            marginLeft: '0.5rem',
                            marginBottom: '0.5rem',
                            fontSize: '0.875rem',
                            color: '#111827',
                            backgroundColor: '#f9fafb',
                            borderRadius: '6px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f3f4f6'
                            e.currentTarget.style.borderLeftColor = '#9333ea'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f9fafb'
                            e.currentTarget.style.borderLeftColor = '#e5e7eb'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            {parsed.icon}
                            <span style={{ fontWeight: '500', color: '#111827' }}>{parsed.title}</span>
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: 'auto' }}>
                              {eventTime}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '1.5rem' }}>
                            {parsed.description}
                          </div>
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
      </div>
    </div>
  )
}
