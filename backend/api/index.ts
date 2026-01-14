import type { VercelRequest, VercelResponse } from '@vercel/node'

// Import Express app - Vercel compiles TypeScript
// The app is exported as default from src/index.ts
const indexModule = require('../src/index')
const app = indexModule.default || indexModule

// Vercel serverless function handler
export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Call Express app
  return app(req, res)
}
