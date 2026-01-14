import type { VercelRequest, VercelResponse } from '@vercel/node'

// Import Express app - Vercel compiles TypeScript to CommonJS
// The app is exported as default from src/index.ts
let app: any

try {
  // Try to require the compiled or source module
  const indexModule = require('../src/index')
  app = indexModule.default || indexModule
} catch (error) {
  console.error('Failed to load app module:', error)
  // Fallback: create error handler
  app = (req: any, res: any) => {
    res.status(500).json({
      error: 'Failed to initialize application',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Vercel serverless function handler
export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Call Express app
    return app(req, res)
  } catch (error: any) {
    console.error('Function execution error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Unknown error'
    })
  }
}
