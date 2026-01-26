// Root entrypoint for Vercel
// Vercel needs to find an entrypoint that imports express
import express from 'express'
import app from './src/index'

// Export the app for Vercel
export default app
