import { Router, Request, Response } from 'express'
import { authenticateSDK } from '../middleware/auth'
import { findOrCreateSession } from '../services/sessionService'
import { supabase } from '../config/supabase'
import multer from 'multer'

const router = Router()

// Configure multer for video uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept video files only
    if (file.mimetype.startsWith('video/')) {
      cb(null, true)
    } else {
      cb(new Error('Only video files are allowed'))
    }
  }
})

/**
 * POST /api/videos/upload
 * Uploads video recording from mobile SDK
 * 
 * Request: multipart/form-data
 * - sdk_key: string (required)
 * - session_id: string (required) - The session ID from mobile SDK
 * - video: File (required) - Video file
 * - duration: number (optional, milliseconds)
 * 
 * Response:
 * {
 *   success: true,
 *   session_id: string (database UUID),
 *   video_id: string,
 *   video_url: string,
 *   file_size: number
 * }
 */
router.post('/upload', 
  authenticateSDK,
  upload.single('video'),
  async (req: Request, res: Response) => {
    try {
      const projectId = (req as any).projectId
      const sessionId = req.body.session_id // This is the session_id from mobile SDK (e.g., "sess_1234567890_abc123")
      const videoFile = (req as any).file
      const duration = req.body.duration ? parseInt(req.body.duration) : null

      // Validate required fields
      if (!sessionId) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'session_id is required'
        })
      }

      if (!videoFile) {
        return res.status(400).json({
          error: 'Missing video file',
          message: 'video file is required'
        })
      }

      console.log(`📹 Video upload request:`, {
        projectId,
        sessionId,
        fileSize: videoFile.size,
        mimetype: videoFile.mimetype,
        duration
      })

      // Get or create session (this links the video to the session)
      const deviceInfo = {
        userAgent: req.get('user-agent') || 'Mobile App',
        platform: 'mobile',
        ...(req.body.device_info ? (typeof req.body.device_info === 'string' ? JSON.parse(req.body.device_info) : req.body.device_info) : {})
      }

      const { session, created } = await findOrCreateSession(
        projectId,
        sessionId,
        deviceInfo
      )

      console.log(`✅ Session ${created ? 'created' : 'found'}: ${session.id}`)

      // Upload to Supabase Storage
      const fileName = `${session.id}_${Date.now()}.mp4`
      const filePath = `session-videos/${fileName}`

      console.log(`📤 Uploading video to storage: ${filePath}`)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('session-videos')
        .upload(filePath, videoFile.buffer, {
          contentType: videoFile.mimetype || 'video/mp4',
          upsert: false
        })

      if (uploadError) {
        console.error('❌ Error uploading video to storage:', uploadError)
        throw new Error(`Failed to upload video: ${uploadError.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('session-videos')
        .getPublicUrl(filePath)

      const videoUrl = urlData.publicUrl

      console.log(`✅ Video uploaded to: ${videoUrl}`)

      // Store video metadata in database (link to session)
      const { data: videoRecord, error: dbError } = await supabase
        .from('session_videos')
        .insert({
          session_id: session.id, // Links video to session
          video_url: videoUrl,
          video_format: videoFile.mimetype?.split('/')[1] || 'mp4',
          duration: duration,
          file_size: videoFile.size
        })
        .select()
        .single()

      if (dbError) {
        console.error('❌ Error storing video metadata:', dbError)
        // If table doesn't exist, we'll handle it gracefully
        if (dbError.code === '42P01') {
          console.warn('⚠️ session_videos table does not exist. Creating video record in sessions table instead.')
          // Fallback: Update session with video URL if table doesn't exist
          const { error: updateError } = await supabase
            .from('sessions')
            .update({
              video_url: videoUrl,
              video_duration: duration,
              video_file_size: videoFile.size
            })
            .eq('id', session.id)

          if (updateError) {
            throw new Error(`Failed to store video metadata: ${updateError.message}`)
          }

          return res.json({
            success: true,
            session_id: session.id,
            video_url: videoUrl,
            file_size: videoFile.size,
            message: 'Video uploaded and linked to session (stored in session record)'
          })
        }
        throw new Error(`Failed to store video metadata: ${dbError.message}`)
      }

      console.log(`✅ Video metadata stored: ${videoRecord.id}`)

      res.json({
        success: true,
        session_id: session.id,
        video_id: videoRecord.id,
        video_url: videoUrl,
        file_size: videoFile.size
      })

    } catch (error: any) {
      console.error('❌ Error in /api/videos/upload:', error)
      res.status(500).json({
        error: 'Failed to upload video',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/videos/:projectId/:sessionId
 * Get video(s) for a session
 * 
 * Returns:
 * {
 *   success: true,
 *   videos: [ ... ]
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

    // First, get the session to get the database ID
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('project_id', projectId)
      .eq('session_id', sessionId)
      .single()

    if (sessionError || !session) {
      return res.status(404).json({
        error: 'Session not found',
        message: `Session ${sessionId} not found for project ${projectId}`
      })
    }

    // Get videos for this session
    const { data: videos, error } = await supabase
      .from('session_videos')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })

    if (error) {
      // If table doesn't exist, check if video is stored in session
      if (error.code === '42P01') {
        const { data: sessionWithVideo } = await supabase
          .from('sessions')
          .select('video_url, video_duration, video_file_size')
          .eq('id', session.id)
          .single()

        if (sessionWithVideo?.video_url) {
          return res.json({
            success: true,
            videos: [{
              video_url: sessionWithVideo.video_url,
              duration: sessionWithVideo.video_duration,
              file_size: sessionWithVideo.video_file_size
            }]
          })
        }
      }
      throw new Error(`Failed to fetch videos: ${error.message}`)
    }

    res.json({
      success: true,
      videos: videos || []
    })
  } catch (error: any) {
    console.error('Error fetching videos:', error)
    res.status(500).json({
      error: 'Failed to fetch videos',
      message: error.message
    })
  }
})

export default router

