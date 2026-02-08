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
import { getLocationFromIP, extractDeviceInfo } from '../utils/ipGeolocation'

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
    let ipAddress = req.ip || req.socket.remoteAddress || ''
    
    // Handle X-Forwarded-For header (for proxies/load balancers)
    const forwardedFor = req.get('x-forwarded-for')
    if (forwardedFor) {
      // Take the first IP in the chain (original client)
      ipAddress = forwardedFor.split(',')[0].trim()
    }
    
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

    // Combine all device information
    const sessionDeviceInfo = {
      userAgent,
      ip: ipAddress,
      // Location from IP geolocation (preferred)
      country: locationData.country || deviceInfo.country || userProperties.country || undefined,
      city: locationData.city || deviceInfo.city || undefined,
      region: locationData.region || deviceInfo.region || undefined,
      countryCode: locationData.countryCode || deviceInfo.countryCode || undefined,
      latitude: locationData.latitude || deviceInfo.latitude || undefined,
      longitude: locationData.longitude || deviceInfo.longitude || undefined,
      // Device info from user agent extraction
      deviceType: extractedDeviceInfo.deviceType || deviceInfo.deviceType || deviceInfo.device_type || userProperties.device_type || undefined,
      deviceModel: extractedDeviceInfo.deviceModel || deviceInfo.deviceModel || deviceInfo.device_model || undefined,
      os: extractedDeviceInfo.os || deviceInfo.os || deviceInfo.osPlatform || undefined,
      browser: extractedDeviceInfo.browser || deviceInfo.browser || undefined,
      // Other device info from SDK
      ...deviceInfo,
      // Platform
      platform: platform
    }

    // Update/create user properties (async, don't block event ingestion)
    getOrCreateUserProperties(projectId, userId, {
      country: sessionDeviceInfo.country || userProperties.country,
      platform: platform as any,
      app_version: deviceInfo.appVersion || deviceInfo.app_version || userProperties.app_version,
      // Only include device_type if it exists in the schema (make it optional to avoid schema errors)
      ...(sessionDeviceInfo.deviceType || userProperties.device_type ? {
        device_type: sessionDeviceInfo.deviceType || userProperties.device_type
      } : {}),
      acquisition_source: userProperties.acquisition_source,
      properties: userProperties
    }).catch(err => {
      // Log error but don't fail the request - user_properties is optional
      if (err.message?.includes('device_type')) {
        console.warn('⚠️ device_type column not found in user_properties table - skipping device_type update')
      } else {
        console.error('Error updating user properties:', err)
      }
    })

    // Only find existing session - don't create new ones
    // Sessions should only be created when Type 2 snapshot is uploaded (recording confirmed)
    const { data: existingSession, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('project_id', projectId)
      .eq('session_id', sessionId)
      .single()

    if (sessionError && sessionError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is expected if session doesn't exist yet
      // Other errors are actual problems
      console.error('Error fetching session:', sessionError)
      throw new Error(`Failed to fetch session: ${sessionError.message}`)
    }

    if (!existingSession) {
      // Session doesn't exist yet - recording hasn't started
      // Ignore events that arrive before recording starts
      console.log('⚠️ Events received for session that doesn\'t exist yet (recording not started):', sessionId)
      return res.json({
        success: true,
        message: 'Session not created yet - recording not started',
        events_processed: 0,
        skipped: true
      })
    }

    const session = existingSession

    // Update session device_info with location if we have new location data
    if ((locationData.country || locationData.city) && session.device_info) {
      try {
        const currentDeviceInfo = typeof session.device_info === 'object' ? session.device_info : {}
        const updatedDeviceInfo = {
          ...currentDeviceInfo,
          // Only update if we have new data and current data is missing or 'Unknown'
          country: (locationData.country && (!currentDeviceInfo.country || currentDeviceInfo.country === 'Unknown')) 
            ? locationData.country 
            : currentDeviceInfo.country,
          city: (locationData.city && (!currentDeviceInfo.city || currentDeviceInfo.city === 'Unknown')) 
            ? locationData.city 
            : currentDeviceInfo.city,
          region: locationData.region || currentDeviceInfo.region,
          countryCode: locationData.countryCode || currentDeviceInfo.countryCode,
          latitude: locationData.latitude || currentDeviceInfo.latitude,
          longitude: locationData.longitude || currentDeviceInfo.longitude,
        }
        
        // Only update if location data changed
        if (updatedDeviceInfo.country !== currentDeviceInfo.country || 
            updatedDeviceInfo.city !== currentDeviceInfo.city) {
          await supabase
            .from('sessions')
            .update({ device_info: updatedDeviceInfo })
            .eq('id', session.id)
          console.log('✅ Updated session device_info with location:', { 
            sessionId: session.session_id, 
            country: updatedDeviceInfo.country, 
            city: updatedDeviceInfo.city 
          })
        }
      } catch (error: any) {
        console.warn('Failed to update session device_info with location:', error.message)
        // Continue - location update is not critical
      }
    }

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
      
      // Build event object with all fields (including optional ones)
      // These columns should exist after running the migration: add_user_id_and_variant_to_events.sql
      const eventObj: any = {
        session_id: session.id,
        type: String(event.type || 'unknown'),
        timestamp: event.timestamp || new Date().toISOString(),
        data: eventData
      }
      
      // Add optional fields if provided
      if (userId) {
        eventObj.user_id = userId
      }
      if (variant) {
        eventObj.variant = variant
      }
      // Add project_id from session (for better querying)
      if (projectId || session.project_id) {
        eventObj.project_id = projectId || session.project_id
      }
      
      return eventObj
    })

    // Try to insert events - handle case where optional columns might not exist
    const { error: insertError } = await supabase
      .from('events')
      .insert(eventsToInsert)

    if (insertError) {
      // Check if error is about missing columns (project_id, user_id, variant, etc.)
      const missingColumnMatch = insertError.message?.match(/Could not find the '(\w+)' column/)
      if (missingColumnMatch) {
        const missingColumn = missingColumnMatch[1]
        console.warn(`⚠️ ${missingColumn} column not found in events table, retrying without it`)
        
        // Remove the missing column from all events and retry
        const eventsWithoutColumn = eventsToInsert.map((e: any) => {
          const { [missingColumn]: removed, ...rest } = e
          return rest
        })
        
        const retryResult = await supabase
          .from('events')
          .insert(eventsWithoutColumn)
        
        if (retryResult.error) {
          // If retry also fails, check for another missing column and retry recursively
          const nextMissingColumnMatch = retryResult.error.message?.match(/Could not find the '(\w+)' column/)
          if (nextMissingColumnMatch) {
            const nextMissingColumn = nextMissingColumnMatch[1]
            console.warn(`⚠️ ${nextMissingColumn} column also not found, retrying without both ${missingColumn} and ${nextMissingColumn}`)
            
            const eventsWithoutBothColumns = eventsWithoutColumn.map((e: any) => {
              const { [nextMissingColumn]: removed, ...rest } = e
              return rest
            })
            
            const finalRetryResult = await supabase
              .from('events')
              .insert(eventsWithoutBothColumns)
            
            if (finalRetryResult.error) {
              console.error('Error inserting events (after removing multiple columns):', finalRetryResult.error)
              throw new Error(`Failed to insert events: ${finalRetryResult.error.message}`)
            }
          } else {
            console.error('Error inserting events (retry without column):', retryResult.error)
            throw new Error(`Failed to insert events: ${retryResult.error.message}`)
          }
        }
      } else {
        console.error('Error inserting events:', insertError)
        throw new Error(`Failed to insert events: ${insertError.message}`)
      }
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

/**
 * GET /api/events/:projectId
 * Get events for a project with optional filtering
 * 
 * Query params:
 * - limit: number (default: 100)
 * - offset: number (default: 0)
 * - type: string (filter by event type)
 * - start_date: ISO string
 * - end_date: ISO string
 * 
 * Returns:
 * {
 *   events: [ ... ],
 *   count: number
 * }
 */
router.get('/:projectId', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId
    const limit = parseInt(req.query.limit as string) || 100
    const offset = parseInt(req.query.offset as string) || 0
    const eventType = req.query.type as string
    const startDate = req.query.start_date as string
    const endDate = req.query.end_date as string

    if (!projectId) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'projectId is required'
      })
    }

    // Build query
    let query = supabase
      .from('events')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (eventType) {
      query = query.eq('type', eventType)
    }
    if (startDate) {
      query = query.gte('timestamp', startDate)
    }
    if (endDate) {
      query = query.lte('timestamp', endDate)
    }

    const { data: events, error, count } = await query

    if (error) {
      throw new Error(`Failed to retrieve events: ${error.message}`)
    }

    res.json({
      success: true,
      events: events || [],
      count: count || 0
    })
  } catch (error: any) {
    console.error('Error in GET /api/events/:projectId:', error)
    res.status(500).json({
      error: 'Failed to retrieve events',
      message: error.message
    })
  }
})

export default router

