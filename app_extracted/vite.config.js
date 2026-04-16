import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Production-hardened Vite config
 *
 * Changes from audit:
 * - Added manual code-splitting to reduce initial bundle (was 1.2 MB, now split into chunks)
 * - Added CORS headers for dev server (restrict in Caddy for production)
 * - Added CSP-friendly source maps (hidden, no inline)
 * - Bumped chunk size warning to a more realistic threshold
 * - Enabled dependency pre-bundling for faster dev start
 */
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
  },

  // Dev server
  server: {
    allowedHosts: true,
    cors: true,
    headers: {
      // Restrict framing in dev too
      'X-Frame-Options': 'SAMEORIGIN',
    },
  },

  // Preview server (used by `npm run preview` to test the production build locally)
  preview: {
    cors: true,
  },

  // Dependency pre-bundling — speeds up cold starts
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'date-fns',
      'recharts',
      'framer-motion',
    ],
  },

  // Vitest config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    include: ['src/__tests__/**/*.test.{js,jsx,ts,tsx}'],
  },

  build: {
    // Source maps: 'hidden' keeps them server-side for error tracking without exposing to browser
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        /**
         * Manual chunking strategy:
         *  - vendor: stable 3rd-party libs (cached aggressively by CDN)
         *  - radix-ui: large component library (separate cache)
         *  - charts: recharts + framer-motion (only loaded on chart pages)
         *  - calendar: heavy calendar components
         */
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@radix-ui')) return 'radix-ui';
            if (id.includes('recharts') || id.includes('framer-motion')) return 'charts';
            if (
              id.includes('react-day-picker') ||
              id.includes('date-fns') ||
              id.includes('embla-carousel')
            ) return 'calendar';
            // Everything else from node_modules → vendor chunk
            return 'vendor';
          }
        },
      },
    },
  },
});
