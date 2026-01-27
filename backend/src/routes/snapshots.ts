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
    const { session, created } = await findOrCreateSession(
      projectId,
      sessionId,
      deviceInfo
    )

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
    const now = new Date()
    const startTime = new Date(session.start_time)
    const duration = Math.round((now.getTime() - startTime.getTime()))
    
    // Update session with new event count and duration
    try {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          last_activity_time: now.toISOString(),
          event_count: session.event_count + snapshotCount,
          duration: duration
        })
        .eq('id', session.id)
      
      if (updateError) {
        console.error('Error updating session:', updateError)
        // Don't throw - snapshot was stored successfully
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
