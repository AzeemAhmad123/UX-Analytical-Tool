import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// Parse CORS_ORIGINS from environment (comma-separated list)
// Normalize URLs by removing trailing slashes (browsers send origin without trailing slash)
const CORS_ORIGINS = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim().replace(/\/$/, ''))
  : []

// Middleware
// CORS Configuration for Production
// For SDK ingestion endpoints, allow requests from any origin (SDK embedded on various websites)
// For dashboard endpoints, restrict to frontend URL
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or file://)
    if (!origin) return callback(null, true)
    
    // In production, allow all origins for SDK endpoints (SDK will be embedded on various websites)
    // In development, allow localhost and file:// for testing
    const isDevelopment = process.env.NODE_ENV !== 'production'
    
    // Build allowed origins list
    const allowedOrigins: string[] = []
    
    // Add FRONTEND_URL if set (normalize by removing trailing slash)
    if (FRONTEND_URL) {
      allowedOrigins.push(FRONTEND_URL.replace(/\/$/, ''))
    }
    
    // Add CORS_ORIGINS from environment
    if (CORS_ORIGINS.length > 0) {
      allowedOrigins.push(...CORS_ORIGINS)
    }
    
    // Add default localhost origins for development
    if (isDevelopment) {
      allowedOrigins.push(
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:5174'
      )
    }
    
    // Check if origin is localhost or local network IP (for mobile testing)
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1')
    const isLocalNetwork = /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin) || 
                          /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin) ||
                          /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/.test(origin)
    
    // Check if origin is a Vercel domain (for preview deployments)
    const isVercelDomain = origin.includes('.vercel.app')
    
    // Check if origin matches any allowed origin (case-insensitive)
    const originMatches = allowedOrigins.some(allowed => {
      // Exact match
      if (allowed === origin) return true
      // Wildcard match (e.g., *.vercel.app or https://*.vercel.app)
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*').replace(/^https?:\/\//, 'https?://')
        const regex = new RegExp(`^${pattern}$`, 'i')
        return regex.test(origin)
      }
      // Domain match (e.g., vercel.app matches any subdomain)
      const allowedDomain = allowed.replace(/^https?:\/\//, '')
      if (origin.includes(allowedDomain)) return true
      return false
    })
    
    if (isDevelopment) {
      // Development: Allow localhost, local network IPs, file://, and configured origins
      if (originMatches || 
          origin.startsWith('file://') || 
          isLocalhost || 
          isLocalNetwork) {
        return callback(null, true)
      }
    } else {
      // Production: Allow configured origins, Vercel domains (if wildcard configured), or all origins if none configured
      // Check if any allowed origin is a wildcard that matches Vercel
      const hasVercelWildcard = allowedOrigins.some(allowed => 
        allowed.includes('*vercel.app') || allowed.includes('vercel.app')
      )
      
      if (allowedOrigins.length === 0 || originMatches || (isVercelDomain && hasVercelWildcard) || isLocalhost) {
        return callback(null, true)
      }
    }
    
    console.warn(`CORS blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400 // 24 hours - cache preflight requests
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'UXCam Analytics Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      projects: '/api/projects',
      sessions: '/api/sessions',
      snapshots: '/api/snapshots',
      events: '/api/events',
      funnels: '/api/funnels'
    }
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
import snapshotsRouter from './routes/snapshots'
import sessionsRouter from './routes/sessions'
import eventsRouter from './routes/events'
import projectsRouter from './routes/projects'
import analyticsRouter from './routes/analytics'
import funnelsRouter from './routes/funnels'
import funnelsExportRouter from './routes/funnels-export'
import funnelAlertsRouter from './routes/funnel-alerts'
import funnelComparisonRouter from './routes/funnel-comparison'
import funnelAnomaliesRouter from './routes/funnel-anomalies'
import shareLinksRouter from './routes/share-links'
import scheduledReportsRouter from './routes/scheduled-reports'
import advancedAnalyticsRouter from './routes/advanced-analytics'
import privacyRouter from './routes/privacy'
import experimentsRouter from './routes/experiments'
import sdkRouter from './routes/sdk'
import videosRouter from './routes/videos'

app.use('/api/snapshots', snapshotsRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/events', eventsRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/projects', privacyRouter)
app.use('/api/projects', experimentsRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/funnels', funnelsRouter)
app.use('/api/funnels', funnelsExportRouter)
app.use('/api/funnels', funnelAlertsRouter)
app.use('/api/funnels', funnelComparisonRouter)
app.use('/api/funnels', scheduledReportsRouter)
app.use('/api/funnel-anomalies', funnelAnomaliesRouter)
app.use('/api/funnel-share', shareLinksRouter)
app.use('/api/scheduled-reports', scheduledReportsRouter)
app.use('/api/advanced-analytics', advancedAnalyticsRouter)
app.use('/api/sdk', sdkRouter)
app.use('/api/videos', videosRouter)

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Export app for Vercel serverless functions
// Use both ESM and CommonJS exports for compatibility
export default app

// Also export as CommonJS for Vercel
if (typeof module !== 'undefined' && module.exports) {
  module.exports = app
  module.exports.default = app
}

// Start server only if not in Vercel environment
if (process.env.VERCEL !== '1' && typeof process !== 'undefined') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend server running on http://0.0.0.0:${PORT}`)
    console.log(`📡 CORS enabled for: ${FRONTEND_URL}`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`✅ Server is ready to accept connections`)
  }).on('error', (err: any) => {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
  })
}

