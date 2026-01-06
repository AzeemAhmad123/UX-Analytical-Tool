import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Play, Pause, ChevronLeft, User, MapPin, Calendar, Tag, ChevronDown, Clock } from 'lucide-react'
import { sessionsAPI, snapshotsAPI } from '../../services/api'
import { Replayer } from 'rrweb'
import type { eventWithTime } from 'rrweb/typings/types'
import '../../components/dashboard/Dashboard.css'

export function SessionReplayPlayer() {
  const { projectId, sessionId } = useParams()
  const navigate = useNavigate()
  const replayContainerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([]) // All sessions for left panel
  const [events, setEvents] = useState<any[]>([]) // Events for activity timeline
  const [snapshots, setSnapshots] = useState<eventWithTime[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const playerRef = useRef<Replayer | null>(null)
  const [activeTab, setActiveTab] = useState<'activity' | 'info' | 'notes' | 'logs'>('activity')
  const [activeFilter, setActiveFilter] = useState<'events' | 'gestures' | 'screens'>('events')

  useEffect(() => {
    if (projectId) {
      loadAllSessions()
    }
    if (projectId && sessionId) {
      loadSessionData()
      loadSnapshots()
      loadEvents()
    }
  }, [projectId, sessionId])

  useEffect(() => {
    if (snapshots.length > 0 && replayContainerRef.current && !loading) {
      console.log('🎬 useEffect: Conditions met, initializing player', {
        snapshotsCount: snapshots.length,
        hasContainer: !!replayContainerRef.current,
        isLoading: loading,
        containerReady: replayContainerRef.current.offsetWidth > 0
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
  }, [snapshots.length, loading]) // Use snapshots.length to avoid re-initializing on every snapshot change

  const loadAllSessions = async () => {
    if (!projectId) return
    try {
      const response = await sessionsAPI.getByProject(projectId, {
        limit: 50,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString()
      })
      setSessions(response.sessions || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  const loadSessionData = async () => {
    if (!projectId || !sessionId) return
    
    try {
      const response = await sessionsAPI.getById(projectId, sessionId)
      setSession(response.session)
      
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
      }
      
      if (response.events) {
        setEvents(response.events)
      }
    } catch (error: any) {
      console.error('Error loading session:', error)
      setError('Failed to load session data')
    }
  }

  const loadEvents = async () => {
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
    } catch (error) {
      console.error('Error loading events:', error)
    }
  }

  const loadSnapshots = async () => {
    if (!projectId || !sessionId) return
    
    try {
      setLoading(true)
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
      
      let events: eventWithTime[] = []
      
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
        console.error('❌ No snapshots found in response!', {
          dataKeys: Object.keys(data),
          hasSnapshots: !!data.snapshots,
          snapshotsValue: data.snapshots,
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
      console.error('Error loading snapshots:', error)
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        setError('No snapshots available for this session. This session was recorded before DOM recording was enabled.')
      } else {
        setError(error.message || 'Failed to load snapshots')
      }
    } finally {
      setLoading(false)
    }
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
        setError('Missing full snapshot. This session cannot be replayed. Please record a new session.')
        return
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
      const replayer = new Replayer(validSnapshots, {
        root: wrapper,
        liveMode: false,
        speed: playbackSpeed,
        skipInactive: false,
        showWarning: true, // Show warnings to help debug
        mouseTail: {
          strokeStyle: '#9333ea',
          lineWidth: 2,
        },
        // Fix sandbox iframe issue - allow scripts to run
        unpackFn: (data: any) => {
          // Default unpack function
          return data
        },
      })

      // Fix iframe sandbox permissions using MutationObserver
      // This watches for when rrweb creates the iframe and fixes it immediately
      const fixSandboxAttribute = (iframe: HTMLIFrameElement) => {
        try {
          // Remove sandbox attribute completely - this is the safest approach
          // rrweb will work fine without sandbox in our controlled environment
          if (iframe.hasAttribute('sandbox')) {
            iframe.removeAttribute('sandbox')
            console.log('✅ Removed restrictive sandbox attribute from iframe', {
              iframeSrc: iframe.src?.substring(0, 50),
              iframeId: iframe.id
            })
            return true
          }
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
      
      // Also check periodically for the first few seconds (in case iframe is created very late)
      const checkInterval = setInterval(() => {
        checkAndFixIframes()
      }, 100)
      
      // Stop checking after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval)
      }, 5000)

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

      // Update current time from replayer
      replayer.on('state-change', (state: any) => {
        if (state.timeOffset !== undefined) {
          setCurrentTime(state.timeOffset)
        }
      })

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

  if (loading) {
    return (
      <div className="dashboard-page-content" style={{ padding: 0, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '2px solid #9333ea', 
            borderTop: 'transparent', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#4b5563' }}>Loading session replay...</p>
        </div>
      </div>
    )
  }

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
                  <span>{session.user_properties?.city || 'N/A'}, {session.user_properties?.country || 'N/A'}</span>
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

        {/* Replay Container */}
        <div style={{ 
          flex: 1, 
          padding: '0.5rem',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'stretch',
          overflow: 'hidden',
          backgroundColor: '#f9fafb',
          minHeight: 0
        }}>
          <div 
            ref={replayContainerRef}
            style={{ 
              width: '100%',
              height: '100%',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              flex: 1
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
            {/* Show "no data" message only when not loading, no error, and no snapshots */}
            {snapshots.length === 0 && !loading && !error && (
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
                    {events.slice(0, 20).map((event, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '0.75rem',
                          borderLeft: '2px solid #e5e7eb',
                          marginLeft: '0.5rem',
                          marginBottom: '0.5rem',
                          fontSize: '0.875rem',
                          color: '#111827'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>
                            {event.timestamp ? formatTime(event.timestamp) : `${index * 100}ms`} {event.type || 'Event'}
                          </span>
                          <ChevronDown className="icon-small" style={{ color: '#9ca3af' }} />
                        </div>
                        {event.data && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {JSON.stringify(event.data).substring(0, 50)}...
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280', 
                      padding: '0.75rem',
                      fontStyle: 'italic'
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
                    {session.user_properties?.city || 'N/A'}, {session.user_properties?.country || 'N/A'}
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
