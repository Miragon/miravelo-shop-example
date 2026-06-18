import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const shopBackendUrl = process.env.SHOP_BACKEND_URL ?? 'http://localhost:8081'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    proxy: {
      '/api': {
        target: shopBackendUrl,
        changeOrigin: true,
      },
    },
  },
})
