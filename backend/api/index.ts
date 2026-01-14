import type { VercelRequest, VercelResponse } from '@vercel/node'
import app from '../src/index'

// Vercel serverless function handler
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  return app(req, res)
}
