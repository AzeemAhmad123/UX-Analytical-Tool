import type { VercelRequest, VercelResponse } from '@vercel/node'
import app from '../src/index'

// Vercel serverless function handler
export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Call Express app
  return app(req, res)
}
