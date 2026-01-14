import type { VercelRequest, VercelResponse } from '@vercel/node'

// Import the Express app from source (Vercel will compile TypeScript)
// Using dynamic import to handle both ESM and CommonJS
let app: any

try {
  // For Vercel, import from source - it will compile TypeScript
  const indexModule = require('../src/index')
  app = indexModule.default || indexModule
} catch (error) {
  console.error('Error loading app:', error)
  // Fallback: try ES6 import
  import('../src/index').then(module => {
    app = module.default
  }).catch(err => {
    console.error('Failed to import app:', err)
  })
}

// Vercel serverless function handler
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Ensure app is loaded
    if (!app) {
      const indexModule = require('../src/index')
      app = indexModule.default || indexModule
    }
    
    // Call Express app as middleware
    return app(req, res)
  } catch (error: any) {
    console.error('Function error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    })
  }
}
