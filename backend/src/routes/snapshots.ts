import { Router, Request, Response } from 'express'
import * as LZString from 'lz-string'
import { authenticateSDK } from '../middleware/auth'
import { findOrCreateSession, updateSessionActivity } from '../services/sessionService'
import { storeSnapshot } from '../services/snapshotService'
import { supabase } from '../config/supabase'
import { getLocationFromIP, extractDeviceInfo } from '../utils/ipGeolocation'

const router = Router()

/**
 * POST /api/snapshots/ingest
 * Receives DOM snapshots from SDK
 * 
 * Request body:
 * {
 *   sdk_key: string,
 *   session_id: string,
 *   snapshots: string (compressed LZString or JSON),
 *   snapshot_count: number,
 *   is_initial_snapshot: boolean
 * }
 */
router.post('/ingest', authenticateSDK, async (req: Request, res: Response) => {
  // CRITICAL: Set CORS headers IMMEDIATELY to prevent CORS errors on error responses
  const origin = req.headers.origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }
  
  try {
    const snapshotSize = typeof req.body.snapshots === 'string' ? req.body.snapshots.length : 0
    const snapshotSizeKB = (snapshotSize / 1024).toFixed(2)
    const snapshotSizeMB = (snapshotSize / (1024 * 1024)).toFixed(2)
    
    console.log('📥 Snapshot ingest request received', {
      hasProjectId: !!(req as any).projectId,
      hasSessionId: !!req.body.session_id,
      hasSnapshots: !!req.body.snapshots,
      snapshotType: typeof req.body.snapshots,
      snapshotLength: snapshotSize,
      snapshotSizeKB: `${snapshotSizeKB}KB`,
      snapshotSizeMB: `${snapshotSizeMB}MB`
    })
    
    // Check if snapshot is too large (Vercel limit is 4.5MB)
    if (snapshotSize > 4 * 1024 * 1024) { // 4MB threshold
      console.warn('⚠️ Large snapshot detected:', {
        size: `${snapshotSizeMB}MB`,
        threshold: '4MB',
        recommendation: 'Consider implementing chunking for snapshots > 4MB'
      })
    }
    
    const projectId = (req as any).projectId
    const sessionId = req.body.session_id
    const snapshots = req.body.snapshots
    const snapshotCount = req.body.snapshot_count || 1
    const isInitialSnapshot = req.body.is_initial_snapshot || false

    // Validate required fields
    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'session_id is required'
      })
    }

    if (!snapshots) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'snapshots is required'
      })
    }

    // Get device info from request (if available)
    const userAgent = req.get('user-agent') || ''
    let ipAddress = req.ip || req.socket.remoteAddress || ''
    
    // Handle X-Forwarded-For header (for proxies/load balancers)
    const forwardedFor = req.get('x-forwarded-for')
    if (forwardedFor) {
      // Take the first IP in the chain (original client)
      ipAddress = forwardedFor.split(',')[0].trim()
    }

    // Get location from IP address (fire-and-forget, don't block response)
    // This will be updated in background after response is sent
    let locationData: any = {}
    const locationPromise = (async () => {
      if (ipAddress && ipAddress !== '::1' && ipAddress !== '127.0.0.1') {
        try {
          return await getLocationFromIP(ipAddress)
        } catch (error: any) {
          console.warn('Failed to get location from IP:', error.message)
          return {}
        }
      }
      return {}
    })()
    
    // Don't await - will be used later in background
    locationPromise.then(data => {
      locationData = data
    }).catch(() => {
      // Ignore errors
    })

    // Extract device information from user agent
    const extractedDeviceInfo = extractDeviceInfo(userAgent)

    // Combine all device information (location will be updated in background)
    // Don't wait for location - use SDK-provided location or empty
    const deviceInfo = {
      userAgent,
      ip: ipAddress,
      // Location from SDK (if provided) - IP geolocation will update in background
      country: req.body.device_info?.country || undefined,
      city: req.body.device_info?.city || undefined,
      region: req.body.device_info?.region || undefined,
      countryCode: req.body.device_info?.countryCode || undefined,
      latitude: req.body.device_info?.latitude || undefined,
      longitude: req.body.device_info?.longitude || undefined,
      // Device info from user agent extraction
      deviceType: extractedDeviceInfo.deviceType || req.body.device_info?.deviceType || req.body.device_info?.device_type || undefined,
      deviceModel: extractedDeviceInfo.deviceModel || req.body.device_info?.deviceModel || req.body.device_info?.device_model || undefined,
      os: extractedDeviceInfo.os || req.body.device_info?.os || req.body.device_info?.osPlatform || undefined,
      browser: extractedDeviceInfo.browser || req.body.device_info?.browser || undefined,
      // Other device info from SDK
      ...(req.body.device_info || {}),
      platform: req.body.device_info?.platform || 'web'
    }

    // Find or create session
    let session: any
    let created: boolean
    try {
      const result = await findOrCreateSession(
        projectId,
        sessionId,
        deviceInfo
      )
      session = result.session
      created = result.created
      
      // Verify session was actually created/found
      if (!session || !session.id) {
        throw new Error('Session creation returned invalid session data')
      }
    } catch (sessionError: any) {
      console.error('❌ Failed to find or create session:', sessionError)
      return res.status(500).json({
        error: 'Failed to create session',
        message: sessionError.message || 'Unknown error creating session'
      })
    }

    // Background task: Update device_info with location (non-blocking)
    // This runs after response is sent
    if (!created) {
      locationPromise.then(async (locationData) => {
        if (locationData.country || locationData.city) {
          try {
            await supabase
              .from('sessions')
              .update({
                device_info: {
                  ...(session.device_info || {}),
                  country: locationData.country || session.device_info?.country,
                  city: locationData.city || session.device_info?.city,
                  region: locationData.region || session.device_info?.region,
                  countryCode: locationData.countryCode || session.device_info?.countryCode,
                  latitude: locationData.latitude || session.device_info?.latitude,
                  longitude: locationData.longitude || session.device_info?.longitude,
                }
              })
              .eq('id', session.id)
          } catch (error: any) {
            console.warn('Failed to update session device_info with location:', error.message)
          }
        }
      }).catch(() => {
        // Ignore location fetch errors
      })
    }
    
    if (created) {
      console.log('✅ New session created:', { sessionId: session.session_id, dbId: session.id })
    } else {
      console.log('📋 Existing session found:', { sessionId: session.session_id, dbId: session.id })
    }

    // Decompress snapshots if needed
    let decompressedSnapshots: any
    let snapshotData: string
    
    try {
      // Try to decompress with LZString first
      if (typeof snapshots === 'string' && snapshots.length > 0) {
        const decompressed = LZString.decompress(snapshots)
        if (decompressed && decompressed.length > 0) {
          decompressedSnapshots = JSON.parse(decompressed)
        } else {
          // If decompression returns null, try parsing as JSON directly
          decompressedSnapshots = JSON.parse(snapshots)
        }
      } else {
        // If snapshots is not a string, it might already be parsed
        decompressedSnapshots = snapshots
      }
    } catch (error: any) {
      console.error('Error decompressing/parsing snapshots:', error.message)
      // If both fail, try parsing as JSON string
      try {
        if (typeof snapshots === 'string') {
          decompressedSnapshots = JSON.parse(snapshots)
        } else {
          decompressedSnapshots = snapshots
        }
      } catch (parseError: any) {
        console.error('Error parsing snapshots as JSON:', parseError.message)
        // If still fails, store as-is (might be already in correct format)
        decompressedSnapshots = snapshots
      }
    }

    // Ensure snapshots is an array
    if (!Array.isArray(decompressedSnapshots)) {
      decompressedSnapshots = [decompressedSnapshots]
    }

    // Count user interaction events from rrweb incremental events (type 3, 4, 5)
    // Type 3 = incremental snapshot (DOM mutations)
    // Type 4 = meta event (navigation, etc.)
    // Type 5 = custom event (user interactions like clicks, scrolls, inputs)
    // These are user interactions and should count toward event_count
    let incrementalEventCount = 0
    try {
      for (const snapshot of decompressedSnapshots) {
        if (Array.isArray(snapshot)) {
          // If snapshot is an array of events, count incremental events
          for (const event of snapshot) {
            if (event && typeof event === 'object' && typeof event.type === 'number') {
              // Count type 3 (incremental), 4 (meta), 5 (custom) as user interactions
              // Type 2 is full snapshot, not a user interaction
              if (event.type >= 3 && event.type <= 5) {
                incrementalEventCount++
              }
            }
          }
        } else if (snapshot && typeof snapshot === 'object' && typeof snapshot.type === 'number') {
          // Single event
          if (snapshot.type >= 3 && snapshot.type <= 5) {
            incrementalEventCount++
          }
        }
      }
    } catch (countError: any) {
      console.warn('Error counting incremental events from snapshots:', countError.message)
      // Continue - event count is not critical for snapshot storage
    }

    // Store snapshot in database
    // Store the compressed version to save space
    try {
      if (typeof snapshots === 'string') {
        snapshotData = snapshots // Use original compressed string
      } else {
        snapshotData = JSON.stringify(decompressedSnapshots)
      }
    } catch (stringifyError: any) {
      console.error('Error stringifying snapshots:', stringifyError.message)
      // Fallback: try to stringify each snapshot individually
      try {
        snapshotData = JSON.stringify(decompressedSnapshots.map((s: any) => {
          try {
            return JSON.parse(JSON.stringify(s))
          } catch {
            return s
          }
        }))
      } catch {
        throw new Error('Failed to serialize snapshots for storage')
      }
    }

    // Store snapshot in database (CRITICAL - must complete before response)
    try {
      console.log('💾 Storing snapshot to database', {
        sessionId: session.id,
        snapshotDataLength: snapshotData.length,
        snapshotCount,
        isInitialSnapshot
      })
      
      await storeSnapshot(
        session.id,
        snapshotData,
        snapshotCount,
        isInitialSnapshot,
        projectId // Pass projectId to storeSnapshot
      )
      
      console.log('✅ Snapshot stored successfully')
    } catch (storeError: any) {
      console.error('❌ Error storing snapshot:', storeError)
      console.error('Error details:', {
        message: storeError.message,
        stack: storeError.stack,
        name: storeError.name
      })
      throw new Error(`Failed to store snapshot: ${storeError.message}`)
    }

    // Send response IMMEDIATELY after snapshot is stored (don't wait for other operations)
    // This ensures recording starts as fast as possible
    const responseData = {
      success: true,
      session_id: session.id,
      project_id: projectId,
      session_created: created,
      snapshot_count: snapshotCount,
      is_initial_snapshot: isInitialSnapshot
    }
    
    // Send response now - don't wait for background tasks
    res.json(responseData)

    // All operations below run in background after response is sent
    // This prevents blocking the SDK from starting recording

    // Background task: Update session activity and calculate duration (non-blocking)
    // IMPORTANT: Count incremental events (type 3, 4, 5) from snapshots as user interactions
    // These represent clicks, scrolls, inputs, DOM mutations - actual user activity
    setImmediate(async () => {
      try {
        const now = new Date()
        const startTime = new Date(session.start_time)
        const duration = Math.round((now.getTime() - startTime.getTime()))
        
        // Increment event_count by the number of incremental events in this snapshot batch
        const newEventCount = (session.event_count || 0) + incrementalEventCount
        
        const { error: updateError } = await supabase
          .from('sessions')
          .update({
            last_activity_time: now.toISOString(),
            duration: duration,
            event_count: newEventCount // Update event_count with incremental events (user interactions)
          })
          .eq('id', session.id)
        
        if (updateError) {
          console.error('Error updating session:', updateError)
        } else {
          if (incrementalEventCount > 0) {
            console.log(`✅ Updated session event_count: ${session.event_count || 0} + ${incrementalEventCount} = ${newEventCount}`)
          }
          
          // Background task: Check if session should be filtered out (non-blocking)
          if (!isInitialSnapshot) {
            // For non-initial snapshots, check immediately
            try {
              // Re-fetch session to get latest event_count and duration
              const { data: latestSession, error: fetchError } = await supabase
                .from('sessions')
                .select('event_count, duration, snapshot_count')
                .eq('id', session.id)
                .single()
              
              if (!fetchError && latestSession) {
                const { shouldFilterSession, deleteSessionAndRelatedData } = await import('../services/sessionService')
                const shouldFilter = await shouldFilterSession(session.id)
                if (shouldFilter) {
                  console.log(`🗑️ Session ${session.id} doesn't meet criteria - deleting from database immediately`)
                  await deleteSessionAndRelatedData(session.id)
                }
              }
            } catch (filterError: any) {
              // Log error but don't fail - this is background task
              console.error('Error checking/filtering session:', filterError)
            }
          } else {
            // For initial snapshots, wait 10 seconds before checking (give time for events to accumulate)
            setTimeout(async () => {
              try {
                const { data: latestSession, error: fetchError } = await supabase
                  .from('sessions')
                  .select('event_count, duration, snapshot_count')
                  .eq('id', session.id)
                  .single()
                
                if (!fetchError && latestSession) {
                  const { shouldFilterSession, deleteSessionAndRelatedData } = await import('../services/sessionService')
                  const shouldFilter = await shouldFilterSession(session.id)
                  if (shouldFilter) {
                    console.log(`🗑️ Session ${session.id} doesn't meet criteria after initial snapshot - deleting from database`)
                    await deleteSessionAndRelatedData(session.id)
                  }
                }
              } catch (filterError: any) {
                console.error('Error checking/filtering session after delay:', filterError)
              }
            }, 10000) // Wait 10 seconds before checking initial snapshots
          }
        }
      } catch (updateError: any) {
        console.error('Error updating session in background:', updateError)
      }
    })
  } catch (error: any) {
    console.error('Error in /api/snapshots/ingest:', error)
    res.status(500).json({
      error: 'Failed to ingest snapshots',
      message: error.message
    })
  }
})

export default router
