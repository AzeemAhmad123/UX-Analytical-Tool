import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// Middleware
// Allow CORS from frontend, file:// origin (for test-sdk.html), and localhost
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or file://)
    if (!origin) return callback(null, true)
    
    const allowedOrigins = [
      FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3000',
      'null' // file:// protocol sends null origin
    ]
    
    if (allowedOrigins.includes(origin) || origin.startsWith('file://')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
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
      events: '/api/events'
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

app.use('/api/snapshots', snapshotsRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/events', eventsRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/analytics', analyticsRouter)

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
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`)
  console.log(`📡 CORS enabled for: ${FRONTEND_URL}`)
})

