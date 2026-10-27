// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from 'antd'
import { afterEach, describe, expect, it } from 'vitest'

import type { Workspace } from '../../../entities/user'
import { setMockTransport } from '../../../shared/api/client'
import { BitbucketConnectionsPanel } from './BitbucketConnectionsPanel'

const FIRST = '11111111-1111-4111-8111-111111111111'
const SECOND = '22222222-2222-4222-8222-222222222222'
const INSTALLATION = '33333333-3333-4333-8333-333333333333'
const REPOSITORY = '44444444-4444-4444-8444-444444444444'
const REMOTE = '55555555-5555-4555-8555-555555555555'
const workspaces: Workspace[] = [
  { id: FIRST, name: 'First team', installationId: 1 },
  { id: SECOND, name: 'Second team', installationId: 2 },
]

afterEach(() => {
  cleanup()
  setMockTransport(null)
})

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <App>
        <BitbucketConnectionsPanel workspaces={workspaces} />
      </App>
    </QueryClientProvider>,
  )
}

describe('Bitbucket connections panel', () => {
  it('ignores a discovery response from the previously selected portal workspace', async () => {
    let resolveDiscovery: ((value: unknown) => void) | undefined
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/discovery')) {
        return new Promise((resolve) => {
          resolveDiscovery = resolve
        })
      }
      return { connections: [], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'old-space' },
    })
    fireEvent.change(screen.getByLabelText(/api token/i), { target: { value: 'old-token' } })
    fireEvent.click(screen.getByRole('button', { name: /найти репозитории/i }))
    await waitFor(() => {
      expect(resolveDiscovery).toBeDefined()
    })
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('Second team'))
    await act(async () => {
      resolveDiscovery?.({
        repositories: [
          {
            uuid: REMOTE,
            workspaceSlug: 'old-space',
            slug: 'old-private',
            name: 'Old private',
            isPrivate: true,
            htmlUrl: 'https://bitbucket.org/old-space/old-private',
          },
        ],
        nextCursor: null,
      })
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(screen.queryByText(/old-private.*приватный/i)).toBeNull()
    })
  })

  it('never shows a one-time hook secret from a connect completed after workspace switch', async () => {
    let resolveConnect: ((value: unknown) => void) | undefined
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/discovery')) {
        return {
          repositories: [
            {
              uuid: REMOTE,
              workspaceSlug: 'old-space',
              slug: 'old-private',
              name: 'Old private',
              isPrivate: true,
              htmlUrl: 'https://bitbucket.org/old-space/old-private',
            },
          ],
          nextCursor: null,
        }
      }
      if (endpoint.method === 'POST') {
        return new Promise((resolve) => {
          resolveConnect = resolve
        })
      }
      return { connections: [], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'old-space' },
    })
    fireEvent.change(screen.getByLabelText(/api token/i), { target: { value: 'old-token' } })
    fireEvent.click(screen.getByRole('button', { name: /найти репозитории/i }))
    expect(await screen.findByText(/old-private.*приватный/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /подключить old-private/i }))
    await waitFor(() => {
      expect(resolveConnect).toBeDefined()
    })
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('Second team'))
    await act(async () => {
      resolveConnect?.({
        id: INSTALLATION,
        repositoryId: REPOSITORY,
        repositoryUuid: REMOTE,
        workspaceSlug: 'old-space',
        repositorySlug: 'old-private',
        status: 'awaiting_webhook',
        credentialGeneration: 1,
        webhook: {
          url: `https://api.example.test/webhooks/bitbucket/${INSTALLATION}/${REPOSITORY}`,
          events: ['repo:push', 'pullrequest:created', 'pullrequest:updated'],
          secret: 'old-workspace-secret',
        },
      })
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(screen.queryByText('old-workspace-secret')).toBeNull()
    })
    expect(screen.queryByText(/old-private.*приватный/i)).toBeNull()
  })

  it('lists every connection page for the selected workspace', async () => {
    const paths: string[] = []
    setMockTransport((endpoint) => {
      paths.push(endpoint.path)
      const slug = endpoint.path.includes('cursor=second') ? 'second-repo' : 'first-repo'
      return {
        connections: [
          {
            id: INSTALLATION,
            repositoryId: slug === 'first-repo' ? REPOSITORY : REMOTE,
            repositoryUuid: REMOTE,
            workspaceSlug: 'private-space',
            repositorySlug: slug,
            status: 'active',
            credentialGeneration: 1,
            webhookUrl: `https://api.example.test/webhooks/bitbucket/${INSTALLATION}/${REPOSITORY}`,
          },
        ],
        nextCursor: slug === 'first-repo' ? 'second' : null,
      }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('Second team'))
    expect(await screen.findByText('private-space/first-repo')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /ещё подключения/i }))
    expect(await screen.findByText('private-space/second-repo')).toBeTruthy()
    expect(paths.every((path) => !path.includes(FIRST))).toBe(true)
    expect(paths.some((path) => path.includes('cursor=second'))).toBe(true)
  })

  it('requires an explicit portal workspace choice before any connection request', async () => {
    const paths: string[] = []
    setMockTransport((endpoint) => {
      paths.push(endpoint.path)
      return { connections: [], nextCursor: null }
    })
    renderPanel()
    expect(screen.getByText('Выберите workspace перед просмотром подключений.')).toBeTruthy()
    expect(paths).toEqual([])
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('Second team'))
    await waitFor(() => {
      expect(paths).toContain(`/workspaces/${SECOND}/bitbucket/connections`)
    })
    expect(paths.some((path) => path.includes(FIRST))).toBe(false)
  })

  it('discovers a private repo, connects it, and shows the hook secret only in the immediate response', async () => {
    const paths: string[] = []
    setMockTransport((endpoint) => {
      paths.push(endpoint.path)
      if (endpoint.path.endsWith('/discovery')) {
        return {
          repositories: [
            {
              uuid: REMOTE,
              workspaceSlug: 'private-space',
              slug: 'private-repo',
              name: 'Private repo',
              isPrivate: true,
              htmlUrl: 'https://bitbucket.org/private-space/private-repo',
            },
          ],
          nextCursor: null,
        }
      }
      if (endpoint.method === 'POST') {
        return {
          id: INSTALLATION,
          repositoryId: REPOSITORY,
          repositoryUuid: REMOTE,
          workspaceSlug: 'private-space',
          repositorySlug: 'private-repo',
          status: 'awaiting_webhook',
          credentialGeneration: 1,
          webhook: {
            url: `https://api.example.test/webhooks/bitbucket/${INSTALLATION}/${REPOSITORY}`,
            events: ['repo:push', 'pullrequest:created', 'pullrequest:updated'],
            secret: 'once-only-hook',
          },
        }
      }
      return { connections: [], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('Second team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'private-space' },
    })
    fireEvent.change(screen.getByLabelText(/api token/i), {
      target: { value: 'temporary-token' },
    })
    fireEvent.click(screen.getByRole('button', { name: /найти репозитории/i }))
    expect(await screen.findByText(/private-repo.*приватный/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /подключить private-repo/i }))
    expect(await screen.findByText('once-only-hook')).toBeTruthy()
    expect(paths.every((path) => !path.includes('temporary-token'))).toBe(true)
    expect(paths.some((path) => path.includes(FIRST))).toBe(false)
    expect(paths).toContain(`/workspaces/${SECOND}/bitbucket/connections`)
  })
})
