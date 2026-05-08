import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    // Génère des .gz pour tous les assets → nginx gzip_static les sert directement
    compression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),
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
    // Minification agressive
    minify: 'esbuild',
    target: 'es2020',

    // Réduire le CSS inline inutile
    cssCodeSplit: true,

    rollupOptions: {
      output: {
        manualChunks: {
          // Vendeurs stables → cachés longtemps par le navigateur
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui':     ['clsx', 'lucide-react', 'react-hot-toast'],
          'vendor-charts': ['apexcharts', 'react-apexcharts'],
          'vendor-store':  ['zustand', 'axios'],
          // Pages par rôle → chargées uniquement si nécessaire
          'pages-client':  [
            './src/pages/client/MenuPage',
            './src/pages/client/DeliveryPage',
            './src/pages/client/TrackOrder',
          ],
          'pages-kitchen': ['./src/pages/kitchen/KitchenDashboard'],
          'pages-cashier': ['./src/pages/cashier/CashierDashboard'],
          'pages-platform': ['./src/pages/platform/PlatformDashboard'],
          'pages-admin':   [
            './src/pages/admin/AdminLayout',
            './src/pages/admin/Dashboard',
            './src/pages/admin/MenuManagement',
            './src/pages/admin/TableManagement',
            './src/pages/admin/OrdersManagement',
            './src/pages/admin/Statistics',
            './src/pages/admin/StaffManagement',
            './src/pages/admin/Settings',
            './src/pages/admin/OrderHistory',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
