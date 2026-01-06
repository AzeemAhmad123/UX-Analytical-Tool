import { Router, Request, Response } from 'express'
import * as LZString from 'lz-string'
import { authenticateSDK } from '../middleware/auth'
import { findOrCreateSession, updateSessionActivity } from '../services/sessionService'
import { storeSnapshot } from '../services/snapshotService'
import { supabase } from '../config/supabase'

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
    console.log('📥 Snapshot ingest request received', {
      hasProjectId: !!(req as any).projectId,
      hasSessionId: !!req.body.session_id,
      hasSnapshots: !!req.body.snapshots,
      snapshotType: typeof req.body.snapshots,
      snapshotLength: typeof req.body.snapshots === 'string' ? req.body.snapshots.length : 'N/A'
    })
    
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
    const deviceInfo = {
      userAgent: req.get('user-agent'),
      ip: req.ip,
      ...(req.body.device_info || {})
    }

    // Find or create session
    const { session, created } = await findOrCreateSession(
      projectId,
      sessionId,
      deviceInfo
    )
    
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

    // Return success response
    res.json({
      success: true,
      session_id: session.id,
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
