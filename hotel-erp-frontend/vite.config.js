import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['crypto', 'stream', 'util', 'buffer'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5279',
        changeOrigin: true,
        secure: false,
      },
      '/notificationHub': {
        target: 'http://localhost:5279',
        ws: true,
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('react-router-dom')) return 'router';
          if (id.includes('@microsoft/signalr')) return 'signalr';
          if (id.includes('antd') || id.includes('@ant-design')) return 'antd';
          if (id.includes('react')) return 'react-vendor';

          return 'vendor';
        },
      },
    },
  },
})
