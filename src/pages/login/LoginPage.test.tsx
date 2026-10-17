// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '../../features/auth'
import { LoginPage } from './LoginPage'

// No @types/node here and Vitest zeroes `.css?raw`: load `fs` untyped to read the real stylesheet.
// Under jsdom `import.meta.url` is not a file URL, so the path is relative to the project root,
// where Vitest runs.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

describe('LoginPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    useAuthStore.setState({
      isAuthenticated: false,
      error: null,
    })
  })

  afterEach(() => {
    cleanup()
    queryClient.clear()
  })

  it('renders login screen title and buttons', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LoginPage />
      </QueryClientProvider>,
    )
    expect(screen.getByRole('heading', { name: 'Вход в Reviewer' })).toBeDefined()
    expect(screen.getByRole('button', { name: /войти через github/i })).toBeDefined()
    expect(screen.queryByRole('button', { name: /демо-вход/i })).toBeNull()
  })

  it('renders error alert when auth store has an error', () => {
    useAuthStore.setState({ error: 'Вход не настроен (VITE_GITHUB_CLIENT_ID)' })
    render(
      <QueryClientProvider client={queryClient}>
        <LoginPage />
      </QueryClientProvider>,
    )
    expect(screen.getByText('Вход не настроен (VITE_GITHUB_CLIENT_ID)')).toBeDefined()
  })

  it('keeps the heading and the actions directly in #login-form, which the glass background measures', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LoginPage />
      </QueryClientProvider>,
    )
    const form = document.getElementById('login-form')
    expect(form).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Вход в Reviewer' }).parentElement).toBe(form)
    expect(screen.getByRole('button', { name: /войти через github/i }).closest('#login-form')).toBe(
      form,
    )
  })
})

describe('LoginPage.module.css', () => {
  const css = readFileSync('src/pages/login/LoginPage.module.css', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')

  function declarations(selector: string): string {
    const start = css.indexOf(`${selector} {`)
    expect(start, selector).toBeGreaterThanOrEqual(0)
    return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  }

  it('fades the sign-in block in with the tokens of the design system', () => {
    expect(declarations('.form')).toContain(
      'animation: form-fade-in var(--rv-motion-fade) var(--rv-ease);',
    )
  })

  it('animates the opacity only: the glass background measures the block every frame', () => {
    expect(css).toContain('@keyframes form-fade-in { from { opacity: 0; } }')
    expect(css).not.toContain('transform')
  })

  it('does not hide the block or block the button while it fades', () => {
    expect(declarations('.form')).not.toMatch(/pointer-events|visibility/)
  })

  it('shows the block at once under reduced motion', () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{ \.form \{ animation: none; \} \}/,
    )
  })
})
