/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const viteMocksBuild = env.VITE_USE_MOCKS === 'true' || env.VITE_USE_MOCKS === '1'

  return {
    define: {
      __VITE_MOCKS_BUILD__: JSON.stringify(viteMocksBuild),
    },
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
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/antd') || id.includes('@ant-design/icons')) {
              return 'vendor-antd'
            }
            if (
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/scheduler') ||
              id.includes('node_modules/react-is')
            ) {
              return 'vendor-react'
            }
            if (
              id.includes('node_modules/refractor') ||
              id.includes('node_modules/react-diff-view')
            ) {
              return 'vendor-diff'
            }
            if (id.includes('node_modules/@tanstack')) {
              return 'vendor-query'
            }
            return undefined
          },
        },
      },
      // vendor-antd ~1.1 MB minified — isolated chunk; page chunks stay under default 500 kB.
      chunkSizeWarningLimit: 500,
    },
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
