import { Router, Request, Response } from 'express'
import * as LZString from 'lz-string'
import { getSessionByProjectAndSessionId, getSessionsByProject, getSessionById } from '../services/sessionService'
import { getSessionSnapshots, getSessionDurationFromSnapshots, isSessionReplayable } from '../services/snapshotService'
import { supabase } from '../config/supabase'

const router = Router()

/**
 * GET /api/sessions/:projectId
 * Get all sessions for a project with optional filtering
 * 
 * Query params:
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 * - start_date: ISO string
 * - end_date: ISO string
 * 
 * Returns:
 * {
 *   sessions: [ ... ],
 *   count: number,
 *   total: number
 * }
 */
router.get('/:projectId', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0
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
      .from('sessions')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('start_time', startDate)
    }
    if (endDate) {
      query = query.lte('start_time', endDate)
    }

    const { data: sessions, error, count } = await query

    if (error) {
      throw new Error(`Failed to retrieve sessions: ${error.message}`)
    }

    // Get snapshot counts for all sessions in one query
    const sessionIds = (sessions || []).map(s => s.id)
    const { data: snapshotCounts } = await supabase
      .from('session_snapshots')
      .select('session_id')
      .in('session_id', sessionIds)
    
    // Count snapshots per session and filter out sessions without snapshots
    const snapshotCountMap = new Map<string, number>()
    if (snapshotCounts) {
      snapshotCounts.forEach((snapshot: any) => {
        const count = snapshotCountMap.get(snapshot.session_id) || 0
        snapshotCountMap.set(snapshot.session_id, count + 1)
      })
    }
    
    // Filter out sessions without snapshots (recording never started)
    // Also filter out sessions with very short duration (< 10 seconds) as they're likely incomplete or accidental
    // REMOVED STRICT FILTERING: Show all sessions (including videos, new sessions, etc.)
    // Previously filtered by MIN_DURATION_MS and snapshot count - this was too strict
    const filteredSessions = sessions || []
    
    // Store all session IDs (including filtered ones) for deletion purposes
    const allSessionIds = (sessions || []).map((s: any) => s.id)

    // Get video information for all sessions
    const { data: videos } = await supabase
      .from('session_videos')
      .select('session_id, video_url, duration, file_size, created_at')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false })

    // Map videos to sessions (one video per session, get the latest)
    const videoMap = new Map<string, any>()
    if (videos) {
      videos.forEach((video: any) => {
        if (!videoMap.has(video.session_id)) {
          videoMap.set(video.session_id, {
            video_url: video.video_url,
            video_duration: video.duration,
            video_file_size: video.file_size,
            has_video: true
          })
        }
      })
    }

    // Get page_view event counts for all sessions (for screen visits metric)
    const sessionIdsForPageViews = filteredSessions.map(s => s.id)
    let pageViewCounts = new Map<string, number>()
    
    if (sessionIdsForPageViews.length > 0) {
      try {
        // Try to get page_view events - check both 'page_view' type and custom events with page_view tag
        // First get events with type='page_view'
        const { data: pageViewEventsType } = await supabase
          .from('events')
          .select('session_id, type, data')
          .eq('project_id', projectId)
          .eq('type', 'page_view')
          .in('session_id', sessionIdsForPageViews)
        
        // Also get custom events with tag='page_view' (stored in data JSONB)
        const { data: pageViewEventsCustom } = await supabase
          .from('events')
          .select('session_id, type, data')
          .eq('project_id', projectId)
          .in('session_id', sessionIdsForPageViews)
          .not('data', 'is', null)
        
        // Combine both results
        const pageViewEvents = [
          ...(pageViewEventsType || []),
          ...(pageViewEventsCustom?.filter((e: any) => 
            e.data && typeof e.data === 'object' && e.data.tag === 'page_view'
          ) || [])
        ]
        
        // Count page views per session
        pageViewEvents?.forEach((event: any) => {
          // Check if it's a page_view event (either type='page_view' or custom event with tag='page_view')
          const isPageView = event.type === 'page_view' || 
                            (event.data && typeof event.data === 'object' && event.data.tag === 'page_view')
          
          if (isPageView) {
            const count = pageViewCounts.get(event.session_id) || 0
            pageViewCounts.set(event.session_id, count + 1)
          }
        })
        
        console.log(`✅ Found ${pageViewCounts.size} sessions with page views, total page views: ${Array.from(pageViewCounts.values()).reduce((a, b) => a + b, 0)}`)
      } catch (error: any) {
        console.warn('Failed to get page_view counts:', error.message)
        // Continue without page view counts - will use fallback
      }
    }

    // Calculate accurate duration for each session from actual event timestamps
    // REMOVED STRICT FILTER: Show ALL sessions (including videos without snapshots)
    // Use Promise.allSettled to prevent one slow session from blocking all others
    const sessionsWithAccurateDuration = await Promise.allSettled(
      filteredSessions.map(async (session: any) => {
        // REMOVED: No longer filtering out sessions without snapshots
        // Videos and other session types should be visible

        // Try to get duration from event timestamps (most accurate)
        // Add timeout to prevent hanging
        const durationPromise = getSessionDurationFromSnapshots(session.id)
        const timeoutPromise = new Promise<null>((resolve) => 
          setTimeout(() => resolve(null), 2000) // 2 second timeout
        )
        
        const eventBasedDuration = await Promise.race([durationPromise, timeoutPromise])
        
        if (eventBasedDuration && eventBasedDuration > 0) {
          // Use event-based duration (most accurate)
          const videoInfo = videoMap.get(session.id) || {}
          const pageViewCount = pageViewCounts.get(session.id) || 0
          return {
            ...session,
            duration: eventBasedDuration,
            snapshot_count: snapshotCountMap.get(session.id) || 0,
            page_view_count: pageViewCount, // Add page_view count for accurate screen visits
            ...videoInfo
          }
        }
        
        // Fallback: use stored duration or calculate from timestamps
        const startTime = new Date(session.start_time).getTime()
        const lastActivityTime = new Date(session.last_activity_time).getTime()
        const timeBasedDuration = lastActivityTime - startTime
        
        // Use stored duration if it's reasonable, otherwise use time-based
        let finalDuration = session.duration || 0
        
        // Cap at reasonable maximum (10 minutes)
        const maxReasonableDuration = 10 * 60 * 1000
        
        if (finalDuration === 0) {
          finalDuration = Math.min(timeBasedDuration, maxReasonableDuration)
        } else if (finalDuration > maxReasonableDuration) {
          finalDuration = Math.min(timeBasedDuration, maxReasonableDuration)
        }

        // Get video info for this session
        const videoInfo = videoMap.get(session.id) || {}
        
        // Get page_view count for this session (for screen visits metric)
        const pageViewCount = pageViewCounts.get(session.id) || 0
        
        return {
          ...session,
          duration: finalDuration,
          snapshot_count: snapshotCountMap.get(session.id) || 0,
          page_view_count: pageViewCount, // Add page_view count for accurate screen visits
          ...videoInfo
        }
      })
    ).then(results => 
      results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value)
        .filter(session => session && typeof session === 'object' && session.id && session !== null)
        // REMOVED: No duration filtering - show all sessions including videos
    )

    res.json({
      success: true,
      sessions: sessionsWithAccurateDuration,
      count: sessionsWithAccurateDuration.length,
      total: filteredSessions.length, // Total filtered sessions (with snapshots or valid duration)
      limit,
      offset
    })
  } catch (error: any) {
    console.error('Error in /api/sessions/:projectId:', error)
    res.status(500).json({
      error: 'Failed to retrieve sessions',
      message: error.message
    })
  }
})

/**
 * GET /api/sessions/:projectId/:sessionId
 * Get session data and all snapshots for replay
 * 
 * Returns:
 * {
 *   session: { ... },
 *   snapshots: [ ... ], // Array of decompressed rrweb events
 *   total_snapshots: number
 * }
 */
router.get('/:projectId/:sessionId', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId
    const sessionId = req.params.sessionId

    if (!projectId || !sessionId) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'projectId and sessionId are required'
      })
    }

    // Set a longer timeout for this endpoint (60 seconds)
    req.setTimeout(60000)

    // Get session
    const session = await getSessionByProjectAndSessionId(String(projectId), String(sessionId))

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: `Session ${sessionId} not found for project ${projectId}`
      })
    }

    // Get all snapshots for this session with timeout handling
    let snapshots: any[]
    try {
      // Use Promise.race to add timeout, but also catch Supabase query timeouts
      snapshots = await Promise.race([
        getSessionSnapshots(session.id).catch((err: any) => {
          // Check if it's a Supabase timeout
          if (err.message?.includes('timeout') || err.message?.includes('canceling statement')) {
            throw new Error('Snapshot retrieval timeout')
          }
          throw err
        }),
        new Promise<any[]>((_, reject) => 
          setTimeout(() => reject(new Error('Snapshot retrieval timeout')), 45000) // 45 second timeout
        )
      ])
    } catch (error: any) {
      if (error.message === 'Snapshot retrieval timeout' || error.message?.includes('timeout') || error.message?.includes('canceling statement')) {
        console.error('⏱️ Timeout retrieving snapshots for session:', session.id, error.message)
        // Return empty snapshots array instead of error - session exists but snapshots timed out
        snapshots = []
        console.warn('⚠️ Returning empty snapshots array due to timeout - session will show but no replay data')
      } else {
        console.error('❌ Error retrieving snapshots:', error)
        throw error
      }
    }

    console.log(`📦 Retrieved ${snapshots.length} snapshot batches for session ${session.id}`)
    
    // If no snapshots found, log warning but continue (session might be new or snapshots still uploading)
    if (snapshots.length === 0) {
      console.warn('⚠️ No snapshots found for session:', {
        sessionId: session.id,
        session_id: session.session_id,
        projectId: session.project_id,
        message: 'This might be normal if snapshots are still being uploaded or session just started'
      })
    }

    // Decode all snapshots using decodeSnapshot utility
    const allEvents: any[] = []
    
    console.log(`📦 Starting to decode ${snapshots.length} snapshot batches`)
    
    for (const snapshot of snapshots) {
      try {
        console.log(`📄 Processing snapshot ${snapshot.id}`, {
          snapshotCount: snapshot.snapshot_count,
          isInitial: snapshot.is_initial_snapshot,
          dataType: typeof snapshot.snapshot_data,
          isBuffer: Buffer.isBuffer(snapshot.snapshot_data),
          dataLength: typeof snapshot.snapshot_data === 'string' ? snapshot.snapshot_data.length : 
                     Buffer.isBuffer(snapshot.snapshot_data) ? snapshot.snapshot_data.length : 'unknown'
        })
        
        // getSessionSnapshots now returns strings (converted from hex BYTEA)
        // Use the same approach as getSessionDurationFromSnapshots: try LZString, then JSON
        let events: any[] = []
        const snapshotString = snapshot.snapshot_data
        
        // Log what we're trying to decode
        console.log(`🔍 Attempting to decode snapshot ${snapshot.id}:`, {
          stringLength: snapshotString.length,
          firstChars: snapshotString.substring(0, 100),
          startsWithBracket: snapshotString.trim().startsWith('[') || snapshotString.trim().startsWith('{'),
          charCodes: Array.from(snapshotString.substring(0, 10) as string[]).map((c: string) => c.charCodeAt(0))
        })
        
        try {
          // Try LZString decompression first (SDK sends compressed data)
          const decompressed = LZString.decompress(snapshotString)
          if (decompressed && decompressed.length > 0) {
            try {
              events = JSON.parse(decompressed)
              console.log(`✅ LZString decompressed snapshot ${snapshot.id}`, {
                decompressedLength: decompressed.length,
                eventCount: Array.isArray(events) ? events.length : 1
              })
            } catch (parseError: any) {
              console.error(`❌ Failed to parse LZString decompressed data for snapshot ${snapshot.id}:`, parseError.message)
              throw parseError
            }
          } else {
            // LZString returned null/empty - try parsing as JSON directly
            try {
              events = JSON.parse(snapshotString)
              console.log(`✅ Parsed snapshot ${snapshot.id} as JSON (not LZString compressed)`, {
                dataLength: snapshotString.length,
                eventCount: Array.isArray(events) ? events.length : 1
              })
            } catch (jsonError: any) {
              console.error(`❌ Failed to parse snapshot ${snapshot.id} as JSON:`, {
                error: jsonError.message,
                stringLength: snapshotString.length,
                firstChars: snapshotString.substring(0, 200),
                isLZString: snapshotString.length > 0 && !snapshotString.trim().startsWith('[') && !snapshotString.trim().startsWith('{')
              })
              throw jsonError
            }
          }
        } catch (error: any) {
          console.error(`❌ Failed to decode snapshot ${snapshot.id}:`, {
            error: error.message,
            stringLength: snapshotString.length,
            firstChars: snapshotString.substring(0, 200),
            errorStack: error.stack
          })
          continue // Skip this snapshot
        }
        
        // Flatten events array (handle nested arrays)
        let decoded: any[] = []
        if (Array.isArray(events)) {
          if (events.length === 1 && Array.isArray(events[0])) {
            decoded = events[0] // Unwrap double-wrapped array
          } else {
            decoded = events
          }
        } else if (events && typeof events === 'object') {
          decoded = [events] // Single event object
        }
        
        if (decoded === null || decoded.length === 0) {
          console.error(`❌ Failed to decode snapshot ${snapshot.id}`, {
            snapshotId: snapshot.id,
            inputLength: snapshotString.length
          })
          continue
        }
        
        // decodeSnapshot returns a flat array - filter valid events and push directly
        const validEvents = decoded.filter((e: any) => 
          e && typeof e.type === 'number' && typeof e.timestamp === 'number' && e.data !== undefined
        )
        
        if (validEvents.length > 0) {
          allEvents.push(...validEvents) // Push flat array of events directly
          console.log(`✅ Extracted ${validEvents.length} valid events from snapshot ${snapshot.id}`, {
            type2Count: validEvents.filter((e: any) => e.type === 2).length,
            eventTypes: [...new Set(validEvents.map((e: any) => e.type))]
          })
        } else {
          console.warn(`⚠️ No valid events extracted from snapshot ${snapshot.id}`, {
            decodedLength: decoded.length
          })
        }
      } catch (error: any) {
        console.error(`❌ Error decoding snapshot ${snapshot.id}:`, error.message, error.stack)
        // Skip this snapshot if decode fails
      }
    }
    
    console.log(`✅ Total decoded events: ${allEvents.length}`)
    
    if (allEvents.length === 0 && snapshots.length > 0) {
      console.error('❌ Failed to decode snapshots for session:', {
        sessionId: session.id,
        snapshotBatches: snapshots.length,
        snapshotIds: snapshots.map((s: any) => s.id),
        possibleCauses: [
          'Snapshots stored in unexpected format',
          'Encoding mismatch (latin1 vs utf8)',
          'Compression format not recognized'
        ]
      })
    }
    
    // Sort all events by timestamp
    allEvents.sort((a: any, b: any) => {
      const timeA = a.timestamp || 0
      const timeB = b.timestamp || 0
      return timeA - timeB
    })

    // Check for Type-2 snapshot
    const hasType2 = allEvents.some((e: any) => e && e.type === 2)
    console.log('Replay events summary:', {
      total: allEvents.length,
      hasType2,
      eventTypes: [...new Set(allEvents.map((e: any) => e.type))]
    })

    // Get video information if available (for mobile sessions)
    const { data: videos } = await supabase
      .from('session_videos')
      .select('video_url, duration, file_size')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(1)
    
    const video = videos && videos.length > 0 ? videos[0] : null

    // Calculate actual duration from event timestamps (more accurate than database duration)
    let calculatedDuration = session.duration || 0
    
    // For mobile sessions with video, use video duration
    if (video && video.duration) {
      calculatedDuration = video.duration
      console.log(`📹 Using video duration: ${calculatedDuration}ms (${Math.round(calculatedDuration / 1000)}s)`)
    } else if (allEvents.length > 0) {
      // For web sessions with snapshots, calculate from event timestamps
      const timestamps = allEvents
        .map((e: any) => e.timestamp)
        .filter((ts: any) => ts && typeof ts === 'number')
        .sort((a: number, b: number) => a - b)
      
      if (timestamps.length >= 2) {
        const firstTimestamp = timestamps[0]
        const lastTimestamp = timestamps[timestamps.length - 1]
        calculatedDuration = lastTimestamp - firstTimestamp
        console.log(`📊 Calculated duration from events: ${calculatedDuration}ms (${Math.round(calculatedDuration / 1000)}s)`)
      } else if (timestamps.length === 1) {
        calculatedDuration = 1000 // 1 second minimum
      }
    } else if (!video) {
      // No snapshots and no video - use session timestamps as fallback
      const startTime = new Date(session.start_time).getTime()
      const endTime = new Date(session.last_activity_time).getTime()
      calculatedDuration = Math.max(0, endTime - startTime)
      console.log(`📊 Using session timestamp duration: ${calculatedDuration}ms`)
    }

    // Return session with all events combined
    res.json({
      session: {
        id: session.id,
        session_id: session.session_id,
        project_id: session.project_id,
        device_info: session.device_info,
        // Ensure location is accessible from device_info
        location: {
          city: session.device_info?.city || (typeof session.device_info === 'object' && session.device_info !== null ? (session.device_info as any).city : null) || null,
          country: session.device_info?.country || (typeof session.device_info === 'object' && session.device_info !== null ? (session.device_info as any).country : null) || null,
          region: session.device_info?.region || (typeof session.device_info === 'object' && session.device_info !== null ? (session.device_info as any).region : null) || null,
        },
        start_time: session.start_time,
        last_activity_time: session.last_activity_time,
        duration: calculatedDuration, // Use calculated duration from events
        event_count: session.event_count,
        created_at: session.created_at,
        // Include video information if available
        ...(video ? {
          video_url: video.video_url,
          video_duration: video.duration,
          video_file_size: video.file_size,
          has_video: true
        } : {
          has_video: false
        })
      },
      snapshots: allEvents.length > 0 ? allEvents : [], // Always return array (empty if decoding failed)
      events: allEvents.length > 0 ? allEvents : [], // Also include as 'events' for compatibility
      total_snapshots: allEvents.length,
      snapshot_batches: snapshots.length,
      // Include debug info if decoding failed
      ...(allEvents.length === 0 && snapshots.length > 0 ? {
        _debug: {
          message: 'Snapshots exist but failed to decode',
          snapshotCount: snapshots.length,
          possibleCauses: [
            'Data format mismatch',
            'Compression format not recognized',
            'Encoding issue during conversion'
          ]
        }
      } : {})
    })
  } catch (error: any) {
    console.error('Error in /api/sessions/:projectId/:sessionId:', error)
    res.status(500).json({
      error: 'Failed to retrieve session',
      message: error.message
    })
  }
})

/**
 * DELETE /api/sessions/:projectId/:sessionId
 * Delete a specific session
 */
router.delete('/:projectId/:sessionId', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId
    const sessionId = req.params.sessionId

    if (!projectId || !sessionId) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'projectId and sessionId are required'
      })
    }

    // Get session first to verify it exists and belongs to project
    const session = await getSessionByProjectAndSessionId(String(projectId), String(sessionId))

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: `Session ${sessionId} not found for project ${projectId}`
      })
    }

    // Delete session (cascade will delete snapshots and events)
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', session.id)

    if (error) {
      throw new Error(`Failed to delete session: ${error.message}`)
    }

    res.json({
      success: true,
      message: 'Session deleted successfully'
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/sessions/:projectId/:sessionId:', error)
    res.status(500).json({
      error: 'Failed to delete session',
      message: error.message
    })
  }
})

/**
 * DELETE /api/sessions/:projectId
 * Delete multiple sessions
 * 
 * Request body:
 * {
 *   sessionIds: string[]  // Can be either database IDs (UUIDs) or SDK session_ids (sess_...)
 * }
 */
router.delete('/:projectId', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId
    const { sessionIds } = req.body

    console.log('🗑️ Delete sessions request:', {
      projectId,
      sessionIdsCount: sessionIds?.length || 0,
      sessionIdsSample: sessionIds?.slice(0, 3) || []
    })

    if (!projectId) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'projectId is required'
      })
    }

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'sessionIds must be a non-empty array'
      })
    }

    // Determine if sessionIds are database IDs (UUIDs) or SDK session_ids (sess_...)
    const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    const areUUIDs = sessionIds.length > 0 && sessionIds.every(id => isUUID(id))

    console.log('🔍 Session ID type detection:', {
      areUUIDs,
      firstId: sessionIds[0],
      firstIdIsUUID: isUUID(sessionIds[0])
    })

    let sessions: any[] = []

    if (areUUIDs) {
      // sessionIds are database IDs (UUIDs) - query by id (without project filter first to check if they exist)
      console.log('📋 Querying sessions by database ID (UUID)')
      
      // First, check if sessions exist at all (without project filter)
      const { data: allSessions, error: checkError } = await supabase
        .from('sessions')
        .select('id, session_id, project_id')
        .in('id', sessionIds)

      if (checkError) {
        console.error('❌ Error checking sessions:', checkError)
        throw new Error(`Failed to check sessions: ${checkError.message}`)
      }

      console.log('🔍 Sessions found in database:', {
        requestedCount: sessionIds.length,
        foundCount: allSessions?.length || 0,
        foundSessions: allSessions?.map(s => ({ id: s.id, project_id: s.project_id })) || []
      })

      if (!allSessions || allSessions.length === 0) {
        // Sessions don't exist - return success (idempotent delete)
        console.log('✅ Sessions already deleted or don\'t exist - returning success (idempotent)')
        return res.json({
          success: true,
          deleted_count: 0,
          message: 'Sessions already deleted or do not exist'
        })
      }

      // Filter by project_id
      sessions = allSessions.filter(s => s.project_id === projectId)

      if (sessions.length < allSessions.length) {
        const wrongProjectSessions = allSessions.filter(s => s.project_id !== projectId)
        console.warn('⚠️ Some sessions belong to different project:', {
          requestedProjectId: projectId,
          wrongProjectSessions: wrongProjectSessions.map(s => ({ id: s.id, project_id: s.project_id })),
          matchingCount: sessions.length,
          totalFound: allSessions.length
        })
        
        // If ALL sessions belong to wrong project, return success (idempotent) instead of error
        if (sessions.length === 0) {
          console.log('✅ All sessions belong to different project - returning success (idempotent delete)')
          return res.json({
            success: true,
            deleted_count: 0,
            message: `All ${allSessions.length} session(s) belong to a different project. No sessions deleted.`
          })
        }
        
        // If SOME sessions belong to wrong project, delete only the matching ones
        console.log(`⚠️ Deleting ${sessions.length} of ${allSessions.length} sessions (${allSessions.length - sessions.length} belong to different project)`)
      }

      console.log('✅ Sessions matching project:', {
        requestedCount: sessionIds.length,
        foundCount: sessions.length,
        foundIds: sessions.map(s => s.id)
      })
    } else {
      // sessionIds are SDK session_ids (sess_...) - query by session_id
      console.log('📋 Querying sessions by SDK session_id')
      const { data: fetchedSessions, error: fetchError } = await supabase
        .from('sessions')
        .select('id, session_id, project_id')
        .eq('project_id', projectId)
        .in('session_id', sessionIds)

      if (fetchError) {
        console.error('❌ Error fetching sessions:', fetchError)
        throw new Error(`Failed to fetch sessions: ${fetchError.message}`)
      }

      sessions = fetchedSessions || []
      console.log('✅ Found sessions by session_id:', {
        requestedCount: sessionIds.length,
        foundCount: sessions.length
      })
    }

    // If no sessions found, return success (idempotent delete)
    if (sessions.length === 0) {
      console.log('✅ No matching sessions found - returning success (idempotent delete)')
      return res.json({
        success: true,
        deleted_count: 0,
        message: 'No matching sessions found for deletion. Sessions may have already been deleted or belong to a different project.'
      })
    }

    // Delete sessions using database IDs
    const sessionDbIds = sessions.map(s => s.id)
    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .in('id', sessionDbIds)

    if (deleteError) {
      throw new Error(`Failed to delete sessions: ${deleteError.message}`)
    }

    res.json({
      success: true,
      deleted_count: sessions.length,
      message: `Successfully deleted ${sessions.length} session(s)`
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/sessions/:projectId:', error)
    res.status(500).json({
      error: 'Failed to delete sessions',
      message: error.message
    })
  }
})

/**
 * POST /api/sessions/:sessionId/end
 * Update session with end time and calculated duration
 * 
 * Accepts both database UUIDs and SDK session_ids
 */
router.post('/:sessionId/end', async (req: Request, res: Response) => {
  try {
    const sessionIdParam = String(req.params.sessionId)
    const { duration, end_time } = req.body

    if (!sessionIdParam) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'sessionId is required'
      })
    }

    let session
    // Check if sessionIdParam is a UUID (database ID)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionIdParam)

    if (isUUID) {
      // It's a database UUID - use getSessionById
      session = await getSessionById(sessionIdParam)
    } else {
      // Assume it's an SDK session_id - query by session_id
      const { data, error } = await supabase
        .from('sessions')
        .select('id, start_time, last_activity_time, duration')
        .eq('session_id', sessionIdParam)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw new Error(`Failed to fetch session by SDK ID: ${error.message}`)
      }
      session = data
    }

    if (!session) {
      // If session not found, return success for idempotency
      console.warn(`Session ${sessionIdParam} not found for ending. It might have been deleted or not yet created.`)
      return res.json({
        success: true,
        session_id: sessionIdParam,
        message: `Session ${sessionIdParam} not found, but request processed (idempotent).`
      })
    }

    // Use the actual database ID for the update
    const sessionDbId = session.id

    // Calculate duration - prefer provided duration (from SDK, calculated from events)
    // If not provided, try to calculate from event timestamps (most accurate)
    let calculatedDuration = duration
    
    if (!calculatedDuration) {
      // Try to get duration from event timestamps (most accurate)
      try {
        const eventBasedDuration = await getSessionDurationFromSnapshots(sessionDbId)
        if (eventBasedDuration && eventBasedDuration > 0) {
          calculatedDuration = eventBasedDuration
          console.log(`✅ Using event-based duration: ${calculatedDuration}ms (${Math.round(calculatedDuration / 1000)}s)`)
        }
      } catch (error: any) {
        console.warn('Failed to calculate duration from events, using fallback:', error.message)
      }
    }
    
    // Fallback: calculate from timestamps if still no duration
    if (!calculatedDuration && session.start_time) {
      const startTime = new Date(session.start_time).getTime()
      const endTime = end_time ? new Date(end_time).getTime() : Date.now()
      calculatedDuration = endTime - startTime
      console.log(`⚠️ Using timestamp-based duration (less accurate): ${calculatedDuration}ms`)
    }

    // Update session
    const updateData: any = {
      last_activity_time: end_time || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (calculatedDuration) {
      updateData.duration = calculatedDuration
    }

    const { error } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionDbId) // Use the database ID here

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`)
    }

    res.json({
      success: true,
      session_id: sessionIdParam,
      duration: calculatedDuration
    })
  } catch (error: any) {
    console.error('Error in POST /api/sessions/:sessionId/end:', error)
    res.status(500).json({
      error: 'Failed to end session',
      message: error.message
    })
  }
})

export default router
