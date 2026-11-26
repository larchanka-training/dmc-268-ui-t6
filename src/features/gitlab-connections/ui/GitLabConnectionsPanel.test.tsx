// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Workspace } from '../../../entities/user'
import { setMockTransport } from '../../../shared/api/client'
import { GitLabConnectionsPanel } from './GitLabConnectionsPanel'

const WORKSPACE = '11111111-1111-4111-8111-111111111111'
const INSTALLATION = '22222222-2222-4222-8222-222222222222'
const REPOSITORY = '33333333-3333-4333-8333-333333333333'
const TOKEN = 'glpat-temporary-token'
const SECRET = 'one-time-secret'
const WEBHOOK_URL = `https://api.example.test/webhooks/gitlab/${INSTALLATION}`
const workspaces: Workspace[] = [{ id: WORKSPACE, name: 'First team', installationId: 7 }]
const PROJECT = {
  projectId: 42,
  pathWithNamespace: 'group/review-me',
  name: 'Review me',
  webUrl: 'https://gitlab.com/group/review-me',
}
const CONNECTION = {
  id: INSTALLATION,
  repositoryId: REPOSITORY,
  projectId: 42,
  pathWithNamespace: 'group/review-me',
  status: 'awaiting_webhook',
  webhookUrl: WEBHOOK_URL,
}

const originalClipboard = navigator.clipboard

afterEach(() => {
  cleanup()
  setMockTransport(null)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard })
  vi.restoreAllMocks()
})

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <QueryClientProvider client={client}>
      <App>
        <GitLabConnectionsPanel workspaces={workspaces} />
      </App>
    </QueryClientProvider>,
  )
  return { ...view, client }
}

function chooseWorkspace() {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Portal workspace GitLab' }))
  fireEvent.click(screen.getByText('First team'))
}

function cacheText(client: QueryClient): string {
  return JSON.stringify(
    client
      .getQueryCache()
      .getAll()
      .map((query) => query.state.data),
  )
}

function mentions(spy: { mock: { calls: unknown[][] } }, needle: string): boolean {
  return spy.mock.calls.some((args) =>
    args.some((arg) => {
      if (typeof arg === 'string') return arg.includes(needle)
      if (arg instanceof Error) return arg.message.includes(needle)
      return false
    }),
  )
}

describe('GitLab connections panel', () => {
  it('shows discovered projects, then a one-time secret that close removes', async () => {
    const calls: { method: string; path: string; body: unknown }[] = []
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const consoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let connected = false
    setMockTransport((endpoint, options) => {
      calls.push({ method: endpoint.method, path: endpoint.path, body: options.body })
      if (endpoint.path.endsWith('/discovery')) return { projects: [PROJECT] }
      if (endpoint.method === 'POST') {
        connected = true
        return { ...CONNECTION, webhook: { url: WEBHOOK_URL, secret: SECRET } }
      }
      return { connections: connected ? [CONNECTION] : [] }
    })
    const { client } = renderPanel()
    chooseWorkspace()
    fireEvent.change(screen.getByLabelText('Токен доступа GitLab'), { target: { value: TOKEN } })
    fireEvent.click(screen.getByRole('button', { name: 'Найти проекты' }))
    expect(await screen.findByRole('link', { name: 'group/review-me' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Подключить group/review-me' }))

    expect(await screen.findByText(SECRET)).toBeTruthy()
    expect(screen.getByText(/Settings → Webhooks/)).toBeTruthy()
    expect(screen.getByText(WEBHOOK_URL)).toBeTruthy()
    const tokenField = screen.getByLabelText('Токен доступа GitLab')
    if (!(tokenField instanceof HTMLInputElement)) {
      throw new Error('expected the GitLab token field to be an input')
    }
    expect(tokenField.value).toBe('')
    expect(window.location.href).not.toContain(TOKEN)
    expect(window.location.href).not.toContain(SECRET)
    expect(setItem.mock.calls.some(([, value]) => value.includes(TOKEN))).toBe(false)
    expect(setItem.mock.calls.some(([, value]) => value.includes(SECRET))).toBe(false)
    expect(cacheText(client)).not.toContain(TOKEN)
    expect(cacheText(client)).not.toContain(SECRET)
    for (const spy of [consoleLog, consoleInfo, consoleDebug, consoleWarn, consoleError]) {
      expect(mentions(spy, TOKEN)).toBe(false)
      expect(mentions(spy, SECRET)).toBe(false)
    }
    expect(calls.map((call) => call.path).some((path) => path.includes(TOKEN))).toBe(false)

    fireEvent.click(
      screen.getByRole('button', { name: 'Закрыть настройку вебхука для group/review-me' }),
    )
    expect(screen.queryByText(SECRET)).toBeNull()
    expect(screen.queryByText(WEBHOOK_URL)).toBeNull()
    expect(cacheText(client)).not.toContain(SECRET)
  })

  it('shows the connection status and no secret when GitLab created the webhook', async () => {
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/discovery')) return { projects: [PROJECT] }
      if (endpoint.method === 'POST') return { ...CONNECTION, status: 'active', webhook: null }
      return { connections: [] }
    })
    renderPanel()
    chooseWorkspace()
    fireEvent.change(screen.getByLabelText('Токен доступа GitLab'), { target: { value: TOKEN } })
    fireEvent.click(screen.getByRole('button', { name: 'Найти проекты' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Подключить group/review-me' }))
    expect(await screen.findByText(/GitLab создал вебхук/)).toBeTruthy()
    expect(screen.getByText(/Webhook активен/)).toBeTruthy()
    expect(screen.queryByText('Секрет вебхука')).toBeNull()
    expect(screen.queryByText(TOKEN)).toBeNull()
  })

  it('deletes the connection and leaves it out of the panel list', async () => {
    const calls: string[] = []
    let removed = false
    setMockTransport((endpoint) => {
      calls.push(`${endpoint.method} ${endpoint.path}`)
      if (endpoint.method === 'DELETE') {
        removed = true
        return null
      }
      return { connections: removed ? [] : [{ ...CONNECTION, webhookSecret: SECRET }] }
    })
    renderPanel()
    chooseWorkspace()
    expect(await screen.findByText('group/review-me')).toBeTruthy()
    expect(screen.queryByText(SECRET)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Отключить group/review-me' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Отключить' }))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Отключить group/review-me' })).toBeNull()
    })
    expect(calls).toContain(`DELETE /workspaces/${WORKSPACE}/gitlab/connections/${INSTALLATION}`)
  })
})
