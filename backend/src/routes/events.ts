import { Router, Request, Response } from 'express'
import { authenticateSDK } from '../middleware/auth'
import { findOrCreateSession, updateSessionActivity } from '../services/sessionService'
import { supabase } from '../config/supabase'

const router = Router()

/**
 * POST /api/events/ingest
 * Receives analytics events from SDK (clicks, page views, etc.)
 * 
 * Request body:
 * {
 *   sdk_key: string,
 *   session_id: string,
 *   events: [
 *     {
 *       type: string,
 *       timestamp: string,
 *       data: object
 *     }
 *   ]
 * }
 */
router.post('/ingest', authenticateSDK, async (req: Request, res: Response) => {
  try {
    const projectId = (req as any).projectId
    const sessionId = req.body.session_id
    const events = req.body.events || []

    // Validate required fields
    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'session_id is required'
      })
    }

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        error: 'Invalid events',
        message: 'events must be a non-empty array'
      })
    }

    // Get or create session
    const deviceInfo = {
      userAgent: req.get('user-agent'),
      ip: req.ip,
      ...(req.body.device_info || {})
    }

    const { session } = await findOrCreateSession(
      projectId,
      sessionId,
      deviceInfo
    )

    // Insert events into database
    // Use project_id from the session (session already has project_id)
    const eventsToInsert = events.map((event: any) => {
      // Ensure data is serializable
      let eventData = event.data || {}
      try {
        // Try to stringify and parse to ensure it's serializable
        if (typeof eventData === 'object' && eventData !== null) {
          eventData = JSON.parse(JSON.stringify(eventData))
        }
      } catch (error) {
        // If stringify fails, use empty object
        console.warn('Event data not serializable, using empty object:', error)
        eventData = {}
      }
      
      return {
        project_id: projectId || session.project_id, // Add project_id (required by database)
        session_id: session.id,
        type: String(event.type || 'unknown'),
        timestamp: event.timestamp || new Date().toISOString(),
        data: eventData
      }
    })

    const { error: insertError } = await supabase
      .from('events')
      .insert(eventsToInsert)

    if (insertError) {
      console.error('Error inserting events:', insertError)
      throw new Error(`Failed to insert events: ${insertError.message}`)
    }

    // Update session activity
    await updateSessionActivity(session.id, session.event_count + events.length)

    // Return success response
    res.json({
      success: true,
      session_id: session.id,
      events_processed: events.length
    })
  } catch (error: any) {
    console.error('Error in /api/events/ingest:', error)
    res.status(500).json({
      error: 'Failed to ingest events',
      message: error.message
    })
  }
})

export default router

