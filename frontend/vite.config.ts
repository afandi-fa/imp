import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    TanStackRouterVite({ routesDirectory: './src/routes' }),
    react(),
  ],
  resolve: {
    alias: {
      '@imp/shared': resolve(__dirname, '../shared'),
    },
  },
})