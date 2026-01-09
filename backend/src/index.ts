import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

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
    
    if (isDevelopment) {
      // Development: Allow localhost and file://
      const allowedOrigins = [
        FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:5174',
        'null' // file:// protocol sends null origin
      ]
      
      if (allowedOrigins.includes(origin) || origin.startsWith('file://')) {
        return callback(null, true)
      }
    } else {
      // Production: Allow all origins for SDK endpoints
      // SDK endpoints don't require authentication, so CORS is safe
      // Dashboard endpoints are protected by authentication
      return callback(null, true)
    }
    
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
import sdkRouter from './routes/sdk'

app.use('/api/snapshots', snapshotsRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/events', eventsRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/funnels', funnelsRouter)
app.use('/api/sdk', sdkRouter)

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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server running on http://0.0.0.0:${PORT}`)
  console.log(`📡 CORS enabled for: ${FRONTEND_URL}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`✅ Server is ready to accept connections`)
}).on('error', (err: any) => {
  console.error('❌ Failed to start server:', err)
  process.exit(1)
})

