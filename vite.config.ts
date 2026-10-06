/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function parseUseMocksFlag(value: unknown): boolean {
  return value === true || value === 'true' || value === '1'
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  // Vitest must not inherit `.env.local` `VITE_USE_MOCKS` via `define` (Refs #65, AC 3.3).
  const viteMocksBuild = mode === 'test' ? false : parseUseMocksFlag(env.VITE_USE_MOCKS)

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
      modulePreload: {
        resolveDependencies: (_filename, deps, { hostType }) => {
          if (hostType !== 'html') {
            return deps
          }
          return deps.filter(
            (dep) =>
              !/(?:RunDetailPage|LoginPage|CallbackPage|RepositoriesPage|RunsPage|ReviewRedirect|mockTransport|diff-|typography-)/.test(
                dep,
              ),
          )
        },
      },
      rolldownOptions: {
        output: {
          codeSplitting: {
            maxSize: 400_000,
            groups: [
              {
                name: 'vendor-react',
                test: /[/\\]node_modules[/\\](?:react|react-dom|scheduler|react-router)[/\\]/,
                includeDependenciesRecursively: false,
              },
              {
                name: 'vendor-query',
                test: /[/\\]node_modules[/\\]@tanstack[/\\]/,
                includeDependenciesRecursively: false,
              },
            ],
          },
        },
      },
      chunkSizeWarningLimit: 500,
    },
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
