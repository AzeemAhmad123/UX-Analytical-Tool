import { Router, Request, Response } from 'express'
import { authenticateSDK } from '../middleware/auth'
import { findOrCreateSession, updateSessionActivity } from '../services/sessionService'
import { supabase } from '../config/supabase'
import {
  getPrivacySettings,
  hasConsent,
  shouldSample,
  maskSensitiveData,
  anonymizeIP
} from '../services/privacyService'
import {
  getOrCreateUserProperties,
  updateUserProperties
} from '../services/userPropertiesService'

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

    // Get privacy settings
    const privacySettings = await getPrivacySettings(projectId)

    // Check GDPR consent if required
    if (privacySettings?.gdpr_enabled && privacySettings?.gdpr_consent_required) {
      const consented = await hasConsent(projectId, sessionId, 'analytics')
      if (!consented) {
        return res.status(403).json({
          error: 'Consent required',
          message: 'User consent is required to track events'
        })
      }
    }

    // Apply sampling if enabled
    if (privacySettings?.sampling_enabled && privacySettings?.sampling_rate < 1.0) {
      if (!shouldSample(privacySettings.sampling_rate)) {
        return res.json({
          success: true,
          session_id: sessionId,
          project_id: projectId,
          events_processed: 0,
          sampled: true
        })
      }
    }

    // Extract user_id and user_properties from request
    const userId = req.body.user_id || req.body.userId || sessionId // Fallback to sessionId if no user_id
    const userProperties = req.body.user_properties || req.body.userProperties || {}
    const variant = req.body.variant || req.body.experiment_variant

    // Get or create user properties
    const deviceInfo = req.body.device_info || {}
    let ipAddress = req.ip || ''
    // Anonymize IP if enabled
    if (privacySettings?.ip_anonymization && ipAddress) {
      ipAddress = anonymizeIP(ipAddress)
    }

    // Extract platform from device_info or user_agent
    const userAgent = req.get('user-agent') || ''
    let platform = deviceInfo.platform
    if (!platform) {
      if (/android/i.test(userAgent)) platform = 'android'
      else if (/iphone|ipad|ios/i.test(userAgent)) platform = 'ios'
      else platform = 'web'
    }

    // Update/create user properties (async, don't block event ingestion)
    getOrCreateUserProperties(projectId, userId, {
      country: deviceInfo.country || userProperties.country,
      platform: platform as any,
      app_version: deviceInfo.appVersion || deviceInfo.app_version || userProperties.app_version,
      device_type: deviceInfo.deviceType || deviceInfo.device_type || userProperties.device_type,
      acquisition_source: userProperties.acquisition_source,
      properties: userProperties
    }).catch(err => console.error('Error updating user properties:', err))

    const sessionDeviceInfo = {
      userAgent,
      ip: ipAddress,
      ...deviceInfo
    }

    const { session } = await findOrCreateSession(
      projectId,
      sessionId,
      sessionDeviceInfo
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

      // Mask sensitive data if enabled
      if (privacySettings?.mask_sensitive_fields) {
        eventData = maskSensitiveData(
          eventData,
          privacySettings.sensitive_field_selectors || []
        )
      }
      
      return {
        project_id: projectId || session.project_id, // Add project_id (required by database)
        session_id: session.id,
        user_id: userId, // Add user_id for cohort filtering
        variant: variant, // Add variant for A/B testing
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

    // Return success response with project_id for SDK
    res.json({
      success: true,
      session_id: session.id,
      project_id: projectId,
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

