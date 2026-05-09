import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: 'gzip', ext: '.gz', threshold: 1024, deleteOriginFile: false }),
  ],

  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api':     { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/storage': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },

  preview: {
    host: '0.0.0.0',
    port: 4173,
  },

  build: {
    minify: 'esbuild',
    target: 'es2020',
    cssCodeSplit: true,
    reportCompressedSize: false,
    assetsInlineLimit: 4096,

    rollupOptions: {
      output: {
        manualChunks(id) {
          // Libs React core → chunk stable, mis en cache longtemps
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react'
          }
          // Charts → chunk séparé, chargé seulement si nécessaire
          if (id.includes('apexcharts') || id.includes('react-apexcharts')) {
            return 'vendor-charts'
          }
          // UI utilitaires légers
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/clsx') || id.includes('node_modules/react-hot-toast')) {
            return 'vendor-ui'
          }
          // State + HTTP
          if (id.includes('node_modules/zustand') || id.includes('node_modules/axios')) {
            return 'vendor-store'
          }
          // Pages par rôle → téléchargées uniquement si l'utilisateur y accède
          if (id.includes('/pages/kitchen')) return 'pages-kitchen'
          if (id.includes('/pages/cashier')) return 'pages-cashier'
          if (id.includes('/pages/platform')) return 'pages-platform'
          if (id.includes('/pages/client')) return 'pages-client'
          if (id.includes('/pages/admin')) return 'pages-admin'
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
