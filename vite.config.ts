/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Rolldown автоматически распределяет компоненты antd между ленивыми страницами.
    // Самый большой несжатый чанк (typography / core-runtime) составляет ~607 кБ;
    // поднятый до 700 кБ лимит устраняет ложное предупреждение сборки.
    chunkSizeWarningLimit: 700,
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
