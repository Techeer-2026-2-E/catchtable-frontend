import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    env: { VITE_API_MOCKING: 'false', VITE_TOSS_CLIENT_KEY: 'synthetic-client-key', VITE_TOSS_SIMULATION: 'false' },
  },
})
