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

// Log CORS configuration at startup (for debugging)
console.log('🔧 CORS Configuration:', {
  CORS_ORIGINS_env: process.env.CORS_ORIGINS || 'NOT SET',
  CORS_ORIGINS_parsed: CORS_ORIGINS,
  CORS_ORIGINS_count: CORS_ORIGINS.length,
  FRONTEND_URL: FRONTEND_URL,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL
})

// Custom CORS middleware that can access request object
app.use((req, res, next) => {
  // Check if this is an SDK endpoint
  const path = req.path || ''
  const isSDKEndpoint = path.includes('/api/snapshots/ingest') || 
                       path.includes('/api/events/ingest') ||
                       (path.includes('/api/sessions') && (req.method === 'POST' || req.method === 'OPTIONS') && path.endsWith('/end'))
  
  // Store in request
  ;(req as any).isSDKEndpoint = isSDKEndpoint
  
  // Handle CORS manually for SDK endpoints (allow all origins)
  if (isSDKEndpoint) {
    const origin = req.headers.origin
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type')
      res.setHeader('Access-Control-Max-Age', '86400')
      console.log('✅ CORS: SDK endpoint - allowing origin', { origin, path: req.path, method: req.method })
    } else {
      // No origin header (e.g., Postman, curl) - allow anyway
      res.setHeader('Access-Control-Allow-Origin', '*')
    }
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end()
    }
    
    // Skip the cors() middleware for SDK endpoints
    return next()
  }
  
  next()
})

// CORS Configuration for non-SDK endpoints
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, Postman, or file://)
    if (!origin) return callback(null, true)
    
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
    
    // Check if any allowed origin contains a wildcard for Vercel
    const hasVercelWildcard = allowedOrigins.some(allowed => 
      allowed.includes('*vercel.app') || allowed.includes('vercel.app')
    )
    
    // Check if origin matches any allowed origin (case-insensitive)
    const originMatches = allowedOrigins.some(allowed => {
      // Exact match
      if (allowed === origin) return true
      
      // Wildcard match (e.g., *.vercel.app or https://*.vercel.app)
      if (allowed.includes('*')) {
        // Extract protocol and domain parts
        const protocolMatch = allowed.match(/^(https?:\/\/)?(.*)$/i)
        const protocol = protocolMatch?.[1] || 'https://'
        const domainPattern = protocolMatch?.[2] || ''
        
        // Replace * with .* and escape dots
        const escapedDomain = domainPattern
          .replace(/\./g, '\\.')  // Escape dots first
          .replace(/\*/g, '.*')   // Then replace wildcards
        
        // Build regex pattern
        const regexPattern = `^${protocol}${escapedDomain}$`
        const regex = new RegExp(regexPattern, 'i')
        const matches = regex.test(origin)
        if (matches) {
          console.log(`CORS: Wildcard match - ${allowed} matches ${origin}`)
        }
        return matches
      }
      
      // Domain match (e.g., vercel.app matches any subdomain)
      const allowedDomain = allowed.replace(/^https?:\/\//, '')
      if (origin.includes(allowedDomain)) {
        console.log(`CORS: Domain match - ${allowed} matches ${origin}`)
        return true
      }
      return false
    })
    
    // Determine if request should be allowed
    let shouldAllow = false
    
    if (isDevelopment) {
      // Development: Allow localhost, local network IPs, file://, and configured origins
      shouldAllow = originMatches || 
                    origin.startsWith('file://') || 
                    isLocalhost || 
                    isLocalNetwork
    } else {
      // Production: Allow configured origins and Vercel domains for dashboard
      const hasAnyVercelOrigin = allowedOrigins.some(allowed => 
        allowed.includes('vercel.app')
      )
      
      shouldAllow = allowedOrigins.length === 0 || 
                    originMatches || 
                    (isVercelDomain && (hasVercelWildcard || hasAnyVercelOrigin)) || 
                    isLocalhost
      
      // Log CORS decision for debugging
      console.log('CORS check:', {
        origin,
        allowedOriginsCount: allowedOrigins.length,
        allowedOriginsSample: allowedOrigins.slice(0, 3),
        originMatches,
        isVercelDomain,
        hasVercelWildcard,
        hasAnyVercelOrigin,
        shouldAllow
      })
    }
    
    if (shouldAllow) {
      return callback(null, true)
    }
    
    console.warn(`CORS blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400 // 24 hours - cache preflight requests
}

// Apply CORS middleware only for non-SDK endpoints
app.use((req, res, next) => {
  // Skip CORS middleware if this is an SDK endpoint (already handled above)
  if ((req as any).isSDKEndpoint) {
    return next()
  }
  // Use cors middleware for non-SDK endpoints
  cors(corsOptions)(req, res, next)
})

// Increase body size limit for large snapshots (Vercel limit is 4.5MB, but we'll set higher for Express)
// Note: Vercel serverless functions have a 4.5MB request body limit, so we'll need to handle chunking
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

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

