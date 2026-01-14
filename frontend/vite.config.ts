import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow external access (needed for tunnels)
    port: 5173,
    strictPort: false,
  },
  resolve: {
    alias: {
      // Ensure proper module resolution
    },
  },
  optimizeDeps: {
    include: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
  },
})
