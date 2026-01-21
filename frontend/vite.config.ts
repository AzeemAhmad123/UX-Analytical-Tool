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
    exclude: ['worker_threads'], // Exclude worker_threads to suppress browser warning
  },
  define: {
    // Suppress worker_threads warning from rrweb
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React and React DOM into separate chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Split large charting library
          'charts': ['recharts'],
          // Split rrweb (session replay) into separate chunk
          'rrweb': ['rrweb', 'rrweb-player'],
          // Split Supabase client
          'supabase': ['@supabase/supabase-js'],
          // Split animation library
          'animation': ['gsap'],
          // Split UI libraries
          'ui': ['lucide-react', 'clsx', 'tailwind-merge'],
          // Split drag and drop libraries
          'dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
    // Increase chunk size warning limit (optional, but helps with large apps)
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging (optional)
    sourcemap: false,
    // Minify options
    minify: 'esbuild',
  },
})
