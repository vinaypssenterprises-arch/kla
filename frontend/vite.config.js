import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['lokayukta.duckdns.org'],
    // Only override the HMR client target when explicitly told to (set via docker-compose
    // for the production container, which sits behind an HTTPS reverse proxy). Left unset,
    // plain local `npm run dev` keeps Vite's normal same-origin ws:// HMR behavior.
    ...(process.env.VITE_HMR_HOST ? {
      hmr: {
        protocol: 'wss',
        host: process.env.VITE_HMR_HOST,
        clientPort: 443,
      },
    } : {}),
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries into separate cacheable chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-recharts': ['recharts'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-lucide': ['lucide-react'],
          'vendor-excel': ['exceljs', 'file-saver'],
        }
      }
    }
  }
});
