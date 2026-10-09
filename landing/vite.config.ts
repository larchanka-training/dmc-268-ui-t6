/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Публичный лендинг: отдельная точка входа, не связанная с приложением в `../src`.
export default defineConfig({
  plugins: [react()],
  // Только loopback: сервер не слушает внешние интерфейсы, смотреть — через SSH-туннель.
  server: { host: '127.0.0.1', port: 5180, strictPort: true },
  preview: { host: '127.0.0.1', port: 5180, strictPort: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
