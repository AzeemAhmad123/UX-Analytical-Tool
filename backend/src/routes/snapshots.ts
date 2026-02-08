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

    // Get location from IP address (async, don't block if it fails)
    let locationData: any = {}
    if (ipAddress && ipAddress !== '::1' && ipAddress !== '127.0.0.1') {
      try {
        locationData = await getLocationFromIP(ipAddress)
      } catch (error: any) {
        console.warn('Failed to get location from IP:', error.message)
        // Continue without location data
      }
    }

    // Extract device information from user agent
    const extractedDeviceInfo = extractDeviceInfo(userAgent)

    // Combine all device information with location from IP
    const deviceInfo = {
      userAgent,
      ip: ipAddress,
      // Location from IP geolocation (preferred)
      country: locationData.country || req.body.device_info?.country || undefined,
      city: locationData.city || req.body.device_info?.city || undefined,
      region: locationData.region || req.body.device_info?.region || undefined,
      countryCode: locationData.countryCode || req.body.device_info?.countryCode || undefined,
      latitude: locationData.latitude || req.body.device_info?.latitude || undefined,
      longitude: locationData.longitude || req.body.device_info?.longitude || undefined,
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

    // If session already existed, update device_info with location if we got new location data
    if (!created && (locationData.country || locationData.city)) {
      try {
        const updatedDeviceInfo = {
          ...(session.device_info || {}),
          country: locationData.country || session.device_info?.country,
          city: locationData.city || session.device_info?.city,
          region: locationData.region || session.device_info?.region,
          countryCode: locationData.countryCode || session.device_info?.countryCode,
          latitude: locationData.latitude || session.device_info?.latitude,
          longitude: locationData.longitude || session.device_info?.longitude,
        }
        
        await supabase
          .from('sessions')
          .update({ device_info: updatedDeviceInfo })
          .eq('id', session.id)
      } catch (error: any) {
        console.warn('Failed to update session device_info with location:', error.message)
        // Continue - location update is not critical
      }
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

    // Store snapshot in database
    // CRITICAL: Verify session exists and is committed before storing snapshot
    // This prevents foreign key constraint errors if session was deleted or not committed
    try {
      // Quick check: verify session exists (lightweight query, only selects id)
      const { data: sessionCheck, error: checkError } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', session.id)
        .single()
      
      if (checkError || !sessionCheck) {
        console.error('❌ Session does not exist when trying to store snapshot:', {
          sessionId: session.id,
          error: checkError?.message,
          sessionCreated: created
        })
        // Try to recreate session if it was just created
        if (created) {
          console.log('🔄 Attempting to recreate session...')
          try {
            const recreateResult = await findOrCreateSession(projectId, sessionId, deviceInfo)
            if (recreateResult.session && recreateResult.session.id) {
              session = recreateResult.session
              console.log('✅ Session recreated:', { sessionId: session.id })
            } else {
              throw new Error('Failed to recreate session')
            }
          } catch (recreateError: any) {
            throw new Error(`Session ${session.id} does not exist and could not be recreated: ${recreateError.message}`)
          }
        } else {
          throw new Error(`Session ${session.id} does not exist in database`)
        }
      }
    } catch (verifyErr: any) {
      console.error('❌ Error verifying session existence:', verifyErr)
      return res.status(500).json({
        error: 'Session verification failed',
        message: verifyErr.message || 'Failed to verify session exists before storing snapshot'
      })
    }

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

    // Update session activity and calculate duration
    // IMPORTANT: Count incremental events (type 3, 4, 5) from snapshots as user interactions
    // These represent clicks, scrolls, inputs, DOM mutations - actual user activity
    const now = new Date()
    const startTime = new Date(session.start_time)
    const duration = Math.round((now.getTime() - startTime.getTime()))
    
    // Update session with last activity time, duration, and event_count (from incremental events)
    try {
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
        // Don't throw - snapshot was stored successfully
      } else {
        if (incrementalEventCount > 0) {
          console.log(`✅ Updated session event_count: ${session.event_count || 0} + ${incrementalEventCount} = ${newEventCount}`)
        }
        // Check if session should be filtered out (doesn't meet minimum criteria)
        // Only check if this is NOT the initial snapshot (give session time to accumulate events)
        // Wait a bit before checking to avoid race conditions with concurrent snapshot uploads
        if (!isInitialSnapshot) {
          try {
            // Re-fetch session to get latest event_count and duration
            const { data: latestSession, error: fetchError } = await supabase
              .from('sessions')
              .select('event_count, duration, snapshot_count')
              .eq('id', session.id)
              .single()
            
            if (!fetchError && latestSession) {
              // Only filter if session has been inactive for a while or has very low activity
              // Don't filter active sessions (duration check is only for ended sessions)
              const { shouldFilterSession, deleteSessionAndRelatedData } = await import('../services/sessionService')
              const shouldFilter = await shouldFilterSession(session.id)
              if (shouldFilter) {
                console.log(`🗑️ Session ${session.id} doesn't meet criteria - deleting from database immediately`)
                await deleteSessionAndRelatedData(session.id)
                // Return success but indicate session was filtered
                return res.json({
                  success: true,
                  session_id: session.id,
                  project_id: projectId,
                  session_created: created,
                  snapshot_count: snapshotCount,
                  is_initial_snapshot: isInitialSnapshot,
                  filtered: true,
                  message: 'Session was filtered and deleted (did not meet minimum criteria)'
                })
              }
            }
          } catch (filterError: any) {
            // Log error but don't fail the request - session was already updated
            console.error('Error checking/filtering session:', filterError)
          }
        }
      }
    } catch (updateError: any) {
      console.error('Error updating session:', updateError)
      // Don't throw - snapshot was stored successfully
    }

    // Return success response with project_id for SDK
    res.json({
      success: true,
      session_id: session.id,
      project_id: projectId,
      session_created: created,
      snapshot_count: snapshotCount,
      is_initial_snapshot: isInitialSnapshot
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
