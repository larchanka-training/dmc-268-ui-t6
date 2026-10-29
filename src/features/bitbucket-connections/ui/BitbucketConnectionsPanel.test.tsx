// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Workspace } from '../../../entities/user'
import { ApiError, setMockTransport } from '../../../shared/api/client'
import { i18n } from '../../../shared/i18n'
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
const firstConnection = {
  id: INSTALLATION,
  repositoryId: REPOSITORY,
  repositoryUuid: REMOTE,
  workspaceSlug: 'private-space',
  repositorySlug: 'first-repo',
  status: 'active',
  credentialGeneration: 1,
  webhookUrl: `https://api.example.test/webhooks/bitbucket/${INSTALLATION}/${REPOSITORY}`,
}
const originalClipboard = navigator.clipboard

afterEach(() => {
  cleanup()
  setMockTransport(null)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard })
  vi.restoreAllMocks()
})

function renderPanel(availableWorkspaces: Workspace[] = workspaces) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <QueryClientProvider client={queryClient}>
      <App>
        <BitbucketConnectionsPanel workspaces={availableWorkspaces} />
      </App>
    </QueryClientProvider>,
  )
  return { ...view, client: queryClient }
}

describe('Bitbucket connections panel', () => {
  it('switches visible controls between English and Russian without remounting', async () => {
    setMockTransport(() => ({ connections: [], nextCursor: null }))
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    expect(screen.getByRole('button', { name: 'Найти репозитории' })).toBeTruthy()
    try {
      await act(async () => {
        await i18n.changeLanguage('en')
      })
      expect(screen.getByRole('button', { name: 'Find repositories' })).toBeTruthy()
      expect(
        screen.getByText('Choose a portal workspace to connect a private or public repository.'),
      ).toBeTruthy()
    } finally {
      await act(async () => {
        await i18n.changeLanguage('ru')
      })
    }
    expect(screen.getByRole('button', { name: 'Найти репозитории' })).toBeTruthy()
  })

  it('disables discovery and credential rotation for whitespace-only tokens', async () => {
    const requests: string[] = []
    setMockTransport((endpoint) => {
      requests.push(endpoint.path)
      return { connections: [firstConnection], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    expect(await screen.findByText('private-space/first-repo')).toBeTruthy()

    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'private-space' },
    })
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: 'Найти репозитории' }).hasAttribute('disabled')).toBe(
      true,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Обновить API token для private-space/first-repo' }),
    )
    fireEvent.change(screen.getByLabelText('Новый API token'), { target: { value: '   ' } })
    expect(
      screen.getByRole('button', { name: 'Подтвердить обновление token' }).hasAttribute('disabled'),
    ).toBe(true)
    expect(requests).toEqual([`/workspaces/${FIRST}/bitbucket/connections`])
  })

  it('labels active and awaiting webhook bindings separately', async () => {
    setMockTransport(() => ({
      connections: [
        firstConnection,
        {
          ...firstConnection,
          repositoryId: REMOTE,
          repositoryUuid: REPOSITORY,
          repositorySlug: 'second-repo',
          status: 'awaiting_webhook',
        },
      ],
      nextCursor: null,
    }))
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))

    const active = await screen.findByText('private-space/first-repo')
    const pending = screen.getByText('private-space/second-repo')
    if (!active.parentElement || !pending.parentElement) throw new Error('Connection row missing')
    expect(within(active.parentElement).getByText('Webhook активен')).toBeTruthy()
    expect(within(pending.parentElement).getByText('Ожидает webhook')).toBeTruthy()
  })

  it('invalidates the original caches after a connect that completes in another selected workspace', async () => {
    let finishConnect: ((value: unknown) => void) | undefined
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/discovery')) {
        return {
          repositories: [
            {
              uuid: REMOTE,
              workspaceSlug: 'private-space',
              slug: 'first-repo',
              name: 'First repo',
              isPrivate: true,
              htmlUrl: 'https://bitbucket.org/private-space/first-repo',
            },
          ],
          nextCursor: null,
        }
      }
      if (endpoint.method === 'POST' && endpoint.path.endsWith('/connections')) {
        return new Promise((resolve) => {
          finishConnect = resolve
        })
      }
      return { connections: [], nextCursor: null }
    })
    const { client } = renderPanel()
    const invalidated = vi.spyOn(client, 'invalidateQueries')
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'private-space' },
    })
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'first-token' } })
    fireEvent.click(screen.getByRole('button', { name: /найти репозитории/i }))
    fireEvent.click(await screen.findByRole('button', { name: /подключить first-repo/i }))
    await waitFor(() => {
      expect(finishConnect).toBeDefined()
    })
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('Second team'))
    await act(async () => {
      finishConnect?.({
        ...firstConnection,
        webhook: {
          url: firstConnection.webhookUrl,
          events: ['repo:push', 'pullrequest:created', 'pullrequest:updated'],
          secret: 'old-workspace-secret',
        },
      })
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(invalidated).toHaveBeenCalledWith({ queryKey: ['bitbucketConnections', FIRST] })
      expect(invalidated).toHaveBeenCalledWith({ queryKey: ['repos'] })
    })
    expect(screen.queryByText('old-workspace-secret')).toBeNull()
    expect(screen.queryByText('Репозиторий подключён')).toBeNull()
    expect(screen.getByLabelText<HTMLInputElement>('API token').value).toBe('')
  })

  it('rotates a shared credential for both sibling bindings and invalidates the original caches after switch', async () => {
    let finishRotation: ((value: unknown) => void) | undefined
    let generation = 1
    const paths: string[] = []
    const rotationBodies: unknown[] = []
    setMockTransport((endpoint, options) => {
      paths.push(endpoint.path)
      if (endpoint.method === 'PUT') {
        rotationBodies.push(options.body)
        return new Promise((resolve) => {
          finishRotation = (value) => {
            generation = 2
            resolve(value)
          }
        })
      }
      return {
        connections: endpoint.path.includes(FIRST)
          ? [
              { ...firstConnection, credentialGeneration: generation },
              {
                ...firstConnection,
                repositoryId: REMOTE,
                repositoryUuid: REPOSITORY,
                repositorySlug: 'second-repo',
                credentialGeneration: generation,
              },
            ]
          : [],
        nextCursor: null,
      }
    })
    const { client } = renderPanel()
    const invalidated = vi.spyOn(client, 'invalidateQueries')
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    expect(await screen.findByText('private-space/first-repo')).toBeTruthy()
    expect(screen.getByText('private-space/second-repo')).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: /обновить api token.*private-space\/first-repo/i }),
    )
    fireEvent.change(screen.getByLabelText('Новый API token'), {
      target: { value: ' replacement-token ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /подтвердить обновление token/i }))
    await waitFor(() => {
      expect(finishRotation).toBeDefined()
    })
    expect(rotationBodies).toEqual([{ apiToken: 'replacement-token' }])
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('Second team'))
    await act(async () => {
      finishRotation?.({ id: INSTALLATION, credentialGeneration: 2 })
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(invalidated).toHaveBeenCalledWith({ queryKey: ['bitbucketConnections', FIRST] })
      expect(invalidated).toHaveBeenCalledWith({ queryKey: ['repos'] })
    })
    expect(paths).toContain(`/workspaces/${FIRST}/bitbucket/connections/${INSTALLATION}/credential`)
    expect(screen.queryByText('Общий API token обновлён')).toBeNull()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    expect(await screen.findByText('private-space/first-repo')).toBeTruthy()
    await waitFor(() => {
      const connectionPage = client.getQueryData<{
        connections: { credentialGeneration: number }[]
      }>(['bitbucketConnections', FIRST])
      expect(connectionPage?.connections.map((item) => item.credentialGeneration)).toEqual([2, 2])
    })
  })

  it('explains an invalid replacement token before credential rotation reaches transport', async () => {
    const rotations = vi.fn()
    setMockTransport((endpoint) => {
      if (endpoint.method === 'PUT') rotations()
      return { connections: [firstConnection], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Обновить API token для private-space/first-repo',
      }),
    )
    fireEvent.change(screen.getByLabelText('Новый API token'), {
      target: { value: 'bad token' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить обновление token' }))

    expect(
      await screen.findByText(
        'API token Bitbucket содержит недопустимые символы или слишком длинный.',
      ),
    ).toBeTruthy()
    expect(rotations).not.toHaveBeenCalled()
    expect(screen.queryByText(/неожиданный формат ответа сервера/i)).toBeNull()
    expect(document.body.textContent).not.toContain('bad token')
  })

  it('rotates only the named repository hook and keeps the other workspace secret hidden after switch', async () => {
    let finishRotation: ((value: unknown) => void) | undefined
    const paths: string[] = []
    setMockTransport((endpoint) => {
      paths.push(endpoint.path)
      if (endpoint.path.endsWith('/webhook-secret')) {
        return new Promise((resolve) => {
          finishRotation = resolve
        })
      }
      return {
        connections: endpoint.path.includes(FIRST) ? [firstConnection] : [],
        nextCursor: null,
      }
    })
    const { client } = renderPanel()
    const invalidated = vi.spyOn(client, 'invalidateQueries')
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    expect(await screen.findByText('private-space/first-repo')).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: /новый webhook secret.*private-space\/first-repo/i }),
    )
    await waitFor(() => {
      expect(finishRotation).toBeDefined()
    })
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('Second team'))
    await act(async () => {
      finishRotation?.({
        url: firstConnection.webhookUrl,
        events: ['repo:push', 'pullrequest:created', 'pullrequest:updated'],
        secret: 'first-workspace-secret',
      })
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(invalidated).toHaveBeenCalledWith({ queryKey: ['bitbucketConnections', FIRST] })
      expect(invalidated).toHaveBeenCalledWith({ queryKey: ['repos'] })
    })
    expect(paths).toContain(
      `/workspaces/${FIRST}/bitbucket/connections/${INSTALLATION}/repositories/${REPOSITORY}/webhook-secret`,
    )
    expect(screen.queryByText('first-workspace-secret')).toBeNull()
  })

  it('names duplicate repo slugs by Bitbucket workspace and preserves a sibling secret on rotation error', async () => {
    const hookPaths: string[] = []
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/webhook-secret')) {
        hookPaths.push(endpoint.path)
        if (endpoint.path.includes(`/connections/${INSTALLATION}/`)) {
          throw new ApiError(429, 'Too Many Requests', { detail: 'private-rate-limit-detail' })
        }
        return {
          url: `https://api.example.test/webhooks/bitbucket/${SECOND}/${REMOTE}`,
          events: ['repo:push', 'pullrequest:created', 'pullrequest:updated'],
          secret: 'sibling-secret',
        }
      }
      return {
        connections: [
          { ...firstConnection, workspaceSlug: 'first-space', repositorySlug: 'shared-repo' },
          {
            ...firstConnection,
            id: SECOND,
            repositoryId: REMOTE,
            repositoryUuid: REPOSITORY,
            workspaceSlug: 'second-space',
            repositorySlug: 'shared-repo',
          },
        ],
        nextCursor: null,
      }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    expect(await screen.findByText('first-space/shared-repo')).toBeTruthy()
    expect(screen.getByText('second-space/shared-repo')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Обновить API token для first-space/shared-repo' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Обновить API token для second-space/shared-repo' }),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', { name: 'Новый webhook secret для second-space/shared-repo' }),
    )
    expect(await screen.findByText('sibling-secret')).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: 'Новый webhook secret для first-space/shared-repo' }),
    )
    expect(
      await screen.findByText('Bitbucket ограничил частоту запросов. Повторите позже.'),
    ).toBeTruthy()
    expect(screen.queryByText('private-rate-limit-detail')).toBeNull()
    expect(screen.getByText('sibling-secret')).toBeTruthy()
    expect(hookPaths).toEqual([
      `/workspaces/${FIRST}/bitbucket/connections/${SECOND}/repositories/${REMOTE}/webhook-secret`,
      `/workspaces/${FIRST}/bitbucket/connections/${INSTALLATION}/repositories/${REPOSITORY}/webhook-secret`,
    ])
  })

  it('confirms the named repository and removes only its binding under a shared installation', async () => {
    const deleted: string[] = []
    const bindings = ['first-repo', 'second-repo'].map((slug, index) => ({
      id: INSTALLATION,
      repositoryId: index === 0 ? REPOSITORY : REMOTE,
      repositoryUuid: index === 0 ? REMOTE : REPOSITORY,
      workspaceSlug: 'private-space',
      repositorySlug: slug,
      status: 'active',
      credentialGeneration: 1,
      webhookUrl: `https://api.example.test/webhooks/bitbucket/${INSTALLATION}/${index === 0 ? REPOSITORY : REMOTE}`,
    }))
    setMockTransport((endpoint) => {
      if (endpoint.method === 'DELETE') {
        deleted.push(endpoint.path)
        bindings.splice(0, 1)
        return null
      }
      if (endpoint.path.endsWith('/webhook-secret')) {
        return {
          url: `https://api.example.test${endpoint.path}`,
          events: ['repo:push', 'pullrequest:created', 'pullrequest:updated'],
          secret: endpoint.path.includes(REPOSITORY) ? 'first-secret' : 'second-secret',
        }
      }
      return { connections: bindings, nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    expect(await screen.findByText('private-space/first-repo')).toBeTruthy()
    expect(screen.getByText('private-space/second-repo')).toBeTruthy()
    const rotateButtons = screen.getAllByRole('button', { name: /новый webhook secret/i })
    const rotateFirst = rotateButtons[0]
    if (!rotateFirst) throw new Error('First rotate action missing')
    fireEvent.click(rotateFirst)
    expect(await screen.findByText('first-secret')).toBeTruthy()
    const rotateSecond = screen.getAllByRole('button', { name: /новый webhook secret/i })[1]
    if (!rotateSecond) throw new Error('Second rotate action missing')
    fireEvent.click(rotateSecond)
    expect(await screen.findByText('second-secret')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /отключить private-space\/first-repo/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/First team/)).toBeTruthy()
    expect(within(dialog).getByText(/private-space\/first-repo/)).toBeTruthy()
    expect(deleted).toEqual([])
    fireEvent.click(within(dialog).getByRole('button', { name: /^отмена$/i }))
    expect(deleted).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: /отключить private-space\/first-repo/i }))
    const dialogs = screen.getAllByRole('dialog')
    const confirmedDialog = dialogs[dialogs.length - 1]
    if (!confirmedDialog) throw new Error('Confirm dialog missing')
    fireEvent.click(within(confirmedDialog).getByRole('button', { name: /^отключить$/i }))

    await waitFor(() => {
      expect(screen.queryByText('private-space/first-repo')).toBeNull()
    })
    expect(screen.getByText('private-space/second-repo')).toBeTruthy()
    expect(screen.getByText('first-secret')).toBeTruthy()
    expect(screen.getByText('second-secret')).toBeTruthy()
    expect(screen.getByText(/репозиторий отключён.*webhook secret недействителен/i)).toBeTruthy()
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: /скопировать секрет.*first-repo/i,
      }).disabled,
    ).toBe(true)
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: /скопировать секрет.*second-repo/i,
      }).disabled,
    ).toBe(false)
    expect(deleted).toEqual([
      `/workspaces/${FIRST}/bitbucket/connections/${INSTALLATION}/repositories/${REPOSITORY}`,
    ])
  })

  it('invalidates the original connection and repository caches when disconnect finishes after workspace switch', async () => {
    let finishDelete: (() => void) | undefined
    const deleted: string[] = []
    setMockTransport((endpoint) => {
      if (endpoint.method === 'DELETE') {
        deleted.push(endpoint.path)
        return new Promise((resolve) => {
          finishDelete = () => {
            resolve(null)
          }
        })
      }
      return {
        connections: endpoint.path.includes(FIRST)
          ? [
              {
                id: INSTALLATION,
                repositoryId: REPOSITORY,
                repositoryUuid: REMOTE,
                workspaceSlug: 'private-space',
                repositorySlug: 'first-repo',
                status: 'active',
                credentialGeneration: 1,
                webhookUrl: `https://api.example.test/webhooks/bitbucket/${INSTALLATION}/${REPOSITORY}`,
              },
            ]
          : [],
        nextCursor: null,
      }
    })
    const { client } = renderPanel()
    const invalidated = vi.spyOn(client, 'invalidateQueries')
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    expect(await screen.findByText('private-space/first-repo')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /отключить private-space\/first-repo/i }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^отключить$/i }))
    await waitFor(() => {
      expect(finishDelete).toBeDefined()
    })
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('Second team'))
    await act(async () => {
      finishDelete?.()
      await Promise.resolve()
    })

    expect(deleted).toEqual([
      `/workspaces/${FIRST}/bitbucket/connections/${INSTALLATION}/repositories/${REPOSITORY}`,
    ])
    await waitFor(() => {
      expect(invalidated).toHaveBeenCalledWith({ queryKey: ['bitbucketConnections', FIRST] })
      expect(invalidated).toHaveBeenCalledWith({ queryKey: ['repos'] })
    })
  })

  it('explains how to obtain a portal workspace when none is available', () => {
    const paths: string[] = []
    setMockTransport((endpoint) => {
      paths.push(endpoint.path)
      return { connections: [], nextCursor: null }
    })
    renderPanel([])

    expect(screen.getByText(/нет доступных portal workspace/i)).toBeTruthy()
    expect(screen.getByText(/войдите через GitHub/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /найти репозитории/i })).toBeNull()
    expect(paths).toEqual([])
  })

  it('trims the first discovery workspace and freezes its criteria across later pages', async () => {
    const requests: { path: string; body: unknown }[] = []
    setMockTransport((endpoint, options) => {
      if (!endpoint.path.endsWith('/discovery')) return { connections: [], nextCursor: null }
      requests.push({ path: endpoint.path, body: options.body })
      const page = requests.length
      return {
        repositories: [
          {
            uuid: page === 1 ? REMOTE : REPOSITORY,
            workspaceSlug: 'private-space',
            slug: page === 1 ? 'first-repo' : 'second-repo',
            name: page === 1 ? 'First repo' : 'Second repo',
            isPrivate: true,
            htmlUrl: `https://bitbucket.org/private-space/${page === 1 ? 'first-repo' : 'second-repo'}`,
          },
        ],
        nextCursor: page === 1 ? 'opaque:next-page' : null,
      }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: '  private-space  ' },
    })
    fireEvent.change(screen.getByLabelText(/api token/i), { target: { value: ' first-token ' } })
    fireEvent.click(screen.getByRole('button', { name: /найти репозитории/i }))
    expect(await screen.findByText(/first-repo.*приватный/i)).toBeTruthy()

    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'other-space' },
    })
    fireEvent.change(screen.getByLabelText(/api token/i), { target: { value: 'other-token' } })
    const pager = screen.getByRole('button', { name: /показать ещё/i })
    pager.focus()
    fireEvent.click(pager)
    expect(await screen.findByText(/second-repo.*приватный/i)).toBeTruthy()
    expect(screen.getByText(/first-repo.*приватный/i)).toBeTruthy()
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Подключить second-repo' }),
      )
    })
    expect(screen.queryByRole('button', { name: /показать ещё/i })).toBeNull()
    expect(document.activeElement).not.toBe(document.body)
    expect(requests).toEqual([
      {
        path: `/workspaces/${FIRST}/bitbucket/discovery`,
        body: { bitbucketWorkspace: 'private-space', apiToken: 'first-token' },
      },
      {
        path: `/workspaces/${FIRST}/bitbucket/discovery`,
        body: {
          bitbucketWorkspace: 'private-space',
          apiToken: 'first-token',
          cursor: 'opaque:next-page',
        },
      },
    ])
  })

  it('returns focus to discovery when the final page has no repositories', async () => {
    let page = 0
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/discovery')) {
        page += 1
        return {
          repositories:
            page === 1
              ? [
                  {
                    uuid: REMOTE,
                    workspaceSlug: 'private-space',
                    slug: 'first-repo',
                    name: 'First repo',
                    isPrivate: true,
                    htmlUrl: 'https://bitbucket.org/private-space/first-repo',
                  },
                ]
              : [],
          nextCursor: page === 1 ? 'next-page' : null,
        }
      }
      return { connections: [], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'private-space' },
    })
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'temporary-token' } })
    fireEvent.click(screen.getByRole('button', { name: /найти репозитории/i }))
    const pager = await screen.findByRole('button', { name: /показать ещё/i })
    pager.focus()
    fireEvent.click(pager)
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: /найти репозитории/i }),
      )
    })
    expect(screen.queryByRole('button', { name: /показать ещё/i })).toBeNull()
  })

  it.each([
    ['final', null],
    ['intermediate', 'third-page'],
  ])(
    'hands focus to the new repository after a delayed %s page disables the pager',
    async (_, nextCursor) => {
      let page = 0
      let finishPage: ((value: unknown) => void) | undefined
      setMockTransport((endpoint) => {
        if (!endpoint.path.endsWith('/discovery')) return { connections: [], nextCursor: null }
        page += 1
        if (page === 1) {
          return {
            repositories: [],
            nextCursor: 'next-page',
          }
        }
        return new Promise((resolve) => {
          finishPage = resolve
        })
      })
      renderPanel()
      fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
      fireEvent.click(screen.getByText('First team'))
      fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
        target: { value: 'private-space' },
      })
      fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'temporary-token' } })
      fireEvent.click(screen.getByRole('button', { name: 'Найти репозитории' }))
      const pager = await screen.findByRole('button', { name: 'Показать ещё' })
      pager.focus()
      fireEvent.click(pager)
      await waitFor(() => {
        expect(pager.hasAttribute('disabled')).toBe(true)
      })
      const workspaceInput = screen.getByRole('textbox', { name: 'Bitbucket workspace' })
      workspaceInput.focus()
      workspaceInput.blur()
      expect(document.activeElement).toBe(document.body)
      await act(async () => {
        finishPage?.({
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
          nextCursor,
        })
        await Promise.resolve()
      })
      await waitFor(() => {
        expect(document.activeElement).toBe(
          screen.getByRole('button', { name: 'Подключить private-repo' }),
        )
      })
    },
  )

  it('hands focus from a delayed initial discovery to the first connect action', async () => {
    let finishDiscovery: ((value: unknown) => void) | undefined
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/discovery')) {
        return new Promise((resolve) => {
          finishDiscovery = resolve
        })
      }
      return { connections: [], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'private-space' },
    })
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'valid-token' } })
    const discover = screen.getByRole('button', { name: 'Найти репозитории' })
    discover.focus()
    fireEvent.click(discover)
    await waitFor(() => {
      expect(discover.hasAttribute('disabled')).toBe(true)
    })
    const workspaceInput = screen.getByRole('textbox', { name: 'Bitbucket workspace' })
    workspaceInput.focus()
    workspaceInput.blur()
    expect(document.activeElement).toBe(document.body)
    await act(async () => {
      finishDiscovery?.({
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
      })
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Подключить private-repo' }),
      )
    })
  })

  it('returns focus to Find repositories after a delayed discovery error', async () => {
    let rejectDiscovery: ((reason: unknown) => void) | undefined
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/discovery')) {
        return new Promise((_, reject) => {
          rejectDiscovery = reject
        })
      }
      return { connections: [], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'private-space' },
    })
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'valid-token' } })
    const discover = screen.getByRole('button', { name: 'Найти репозитории' })
    discover.focus()
    fireEvent.click(discover)
    await waitFor(() => {
      expect(discover.hasAttribute('disabled')).toBe(true)
    })
    const workspaceInput = screen.getByRole('textbox', { name: 'Bitbucket workspace' })
    workspaceInput.focus()
    workspaceInput.blur()
    expect(document.activeElement).toBe(document.body)
    await act(async () => {
      rejectDiscovery?.(new ApiError(422, 'unsafe detail', { detail: 'invalid_credential' }))
      await Promise.resolve()
    })
    expect(
      await screen.findByText('Проверьте данные подключения Bitbucket и повторите попытку.'),
    ).toBeTruthy()
    await waitFor(() => {
      expect(document.activeElement).toBe(discover)
    })
  })

  it('shows a safe message for a connection-list failure', async () => {
    setMockTransport(() => {
      throw new ApiError(422, 'Unprocessable Entity', { detail: 'private-backend-stack' })
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))

    expect(
      await screen.findByText('Проверьте данные подключения Bitbucket и повторите попытку.'),
    ).toBeTruthy()
    expect(screen.queryByText('private-backend-stack')).toBeNull()
  })

  it('shows an input-specific message for an overlong Bitbucket workspace before sending discovery', async () => {
    const discovery = vi.fn()
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/discovery')) discovery()
      return { connections: [], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'a'.repeat(129) },
    })
    fireEvent.change(screen.getByLabelText(/api token/i), { target: { value: 'temporary-token' } })
    fireEvent.click(screen.getByRole('button', { name: /найти репозитории/i }))

    expect(
      await screen.findByText('Bitbucket workspace не может быть длиннее 128 символов.'),
    ).toBeTruthy()
    expect(discovery).not.toHaveBeenCalled()
    expect(screen.queryByText(/неожиданный формат ответа сервера/i)).toBeNull()
  })

  it('accepts a Bitbucket workspace at the exact 128-character boundary', async () => {
    const workspace = 'w'.repeat(128)
    const discoveryBodies: unknown[] = []
    setMockTransport((endpoint, options) => {
      if (endpoint.path.endsWith('/discovery')) {
        discoveryBodies.push(options.body)
        return { repositories: [], nextCursor: null }
      }
      return { connections: [], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: workspace },
    })
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'valid-token' } })
    fireEvent.click(screen.getByRole('button', { name: 'Найти репозитории' }))

    await waitFor(() => {
      expect(discoveryBodies).toEqual([{ bitbucketWorkspace: workspace, apiToken: 'valid-token' }])
    })
    expect(screen.queryByText(/длиннее 128 символов/i)).toBeNull()
  })

  it.each([
    ['embedded whitespace', 'bad token'],
    ['non-ASCII', 'tökén'],
    ['overlong', 'x'.repeat(4097)],
  ])('explains an invalid %s API token before discovery reaches transport', async (_, token) => {
    const discovery = vi.fn()
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/discovery')) discovery()
      return { connections: [], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'private-space' },
    })
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: token } })
    fireEvent.click(screen.getByRole('button', { name: 'Найти репозитории' }))

    expect(
      await screen.findByText(
        'API token Bitbucket содержит недопустимые символы или слишком длинный.',
      ),
    ).toBeTruthy()
    expect(discovery).not.toHaveBeenCalled()
    expect(screen.queryByText(/неожиданный формат ответа сервера/i)).toBeNull()
    expect(document.body.textContent).not.toContain(token)
  })

  it('keeps a distinct response-format message for malformed discovery JSON', async () => {
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/discovery'))
        return { repositories: 'malformed', nextCursor: null }
      return { connections: [], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'private-space' },
    })
    fireEvent.change(screen.getByLabelText(/api token/i), { target: { value: 'temporary-token' } })
    fireEvent.click(screen.getByRole('button', { name: /найти репозитории/i }))

    expect(
      await screen.findByText(
        'Неожиданный формат ответа сервера. Обновите страницу и повторите попытку.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText(/длиннее 128 символов/i)).toBeNull()
  })

  it('asks for a token if it was cleared after discovery before connecting', async () => {
    const connectCalls = vi.fn()
    setMockTransport((endpoint) => {
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
      if (endpoint.method === 'POST' && endpoint.path.endsWith('/connections')) connectCalls()
      return { connections: [], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'private-space' },
    })
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'temporary-token' } })
    fireEvent.click(screen.getByRole('button', { name: /найти репозитории/i }))
    const connect = await screen.findByRole('button', { name: 'Подключить private-repo' })
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: '' } })
    fireEvent.click(connect)

    expect(await screen.findByText('Введите API token Bitbucket для подключения.')).toBeTruthy()
    expect(connectCalls).not.toHaveBeenCalled()
    expect(screen.queryByText(/неожиданный формат ответа сервера/i)).toBeNull()
  })

  it('explains an invalid token before connecting a discovered repository', async () => {
    const connectCalls = vi.fn()
    setMockTransport((endpoint) => {
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
      if (endpoint.method === 'POST' && endpoint.path.endsWith('/connections')) connectCalls()
      return { connections: [], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'private-space' },
    })
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'valid-token' } })
    fireEvent.click(screen.getByRole('button', { name: 'Найти репозитории' }))
    const connect = await screen.findByRole('button', { name: 'Подключить private-repo' })
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'bad token' } })
    fireEvent.click(connect)

    expect(
      await screen.findByText(
        'API token Bitbucket содержит недопустимые символы или слишком длинный.',
      ),
    ).toBeTruthy()
    expect(connectCalls).not.toHaveBeenCalled()
    expect(screen.queryByText(/неожиданный формат ответа сервера/i)).toBeNull()
    expect(document.body.textContent).not.toContain('bad token')
  })

  it('keeps the response-format message when connect returns malformed JSON', async () => {
    const connectBodies: unknown[] = []
    setMockTransport((endpoint, options) => {
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
      if (endpoint.method === 'POST' && endpoint.path.endsWith('/connections')) {
        connectBodies.push(options.body)
        return { id: 'malformed-provider-id' }
      }
      return { connections: [], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'private-space' },
    })
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: ' temporary-token ' } })
    fireEvent.click(screen.getByRole('button', { name: /найти репозитории/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Подключить private-repo' }))

    expect(
      await screen.findByText(
        'Неожиданный формат ответа сервера. Обновите страницу и повторите попытку.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText(/введите api token bitbucket/i)).toBeNull()
    expect(connectBodies).toEqual([
      {
        bitbucketWorkspace: 'private-space',
        repositorySlug: 'private-repo',
        repositoryUuid: REMOTE,
        apiToken: 'temporary-token',
      },
    ])
  })

  it('shows the API repository-inaccessible message for a bad Bitbucket token', async () => {
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/discovery')) {
        throw new ApiError(422, 'Unprocessable Entity', { detail: 'repository_inaccessible' })
      }
      return { connections: [], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'private-space' },
    })
    fireEvent.change(screen.getByLabelText(/api token/i), { target: { value: 'bad-token' } })
    fireEvent.click(screen.getByRole('button', { name: /найти репозитории/i }))

    expect(
      await screen.findByText(
        'Репозиторий Bitbucket недоступен этому API token. Проверьте права доступа.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText('repository_inaccessible')).toBeNull()
  })

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

  it('lists all connections in the selected workspace without requesting a cursor', async () => {
    const paths: string[] = []
    setMockTransport((endpoint) => {
      paths.push(endpoint.path)
      return {
        connections: ['first-repo', 'second-repo'].map((slug) => ({
          id: INSTALLATION,
          repositoryId: slug === 'first-repo' ? REPOSITORY : REMOTE,
          repositoryUuid: REMOTE,
          workspaceSlug: 'private-space',
          repositorySlug: slug,
          status: 'active',
          credentialGeneration: 1,
          webhookUrl: `https://api.example.test/webhooks/bitbucket/${INSTALLATION}/${REPOSITORY}`,
        })),
        nextCursor: null,
      }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('Second team'))
    expect(await screen.findByText('private-space/first-repo')).toBeTruthy()
    expect(await screen.findByText('private-space/second-repo')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /ещё подключения/i })).toBeNull()
    expect(paths).toEqual([`/workspaces/${SECOND}/bitbucket/connections`])
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
    const discoveryBodies: unknown[] = []
    setMockTransport((endpoint, options) => {
      paths.push(endpoint.path)
      if (endpoint.path.endsWith('/discovery')) {
        discoveryBodies.push(options.body)
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
    expect(screen.getByLabelText<HTMLInputElement>('API token').value).toBe('')
    expect(screen.queryByRole('button', { name: /показать ещё/i })).toBeNull()
    fireEvent.change(screen.getByLabelText(/api token/i), { target: { value: 'new-token' } })
    fireEvent.click(screen.getByRole('button', { name: /найти репозитории/i }))
    await waitFor(() => {
      expect(discoveryBodies).toHaveLength(2)
    })
    expect(discoveryBodies[1]).toEqual({
      bitbucketWorkspace: 'private-space',
      apiToken: 'new-token',
    })
    expect(paths.every((path) => !path.includes('temporary-token'))).toBe(true)
    expect(paths.some((path) => path.includes(FIRST))).toBe(false)
    expect(paths).toContain(`/workspaces/${SECOND}/bitbucket/connections`)
  })

  it('keeps separate one-time setup cards across same-workspace discovery and connect until dismissal or workspace switch', async () => {
    const clipboardWrite = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWrite },
    })
    const repositories = [
      { slug: 'first-repo', uuid: REMOTE, repositoryId: REPOSITORY },
      { slug: 'second-repo', uuid: REPOSITORY, repositoryId: REMOTE },
      { slug: 'third-repo', uuid: FIRST, repositoryId: SECOND },
    ]
    setMockTransport((endpoint, options) => {
      if (endpoint.path.endsWith('/discovery')) {
        return {
          repositories: repositories.map((repository) => ({
            uuid: repository.uuid,
            workspaceSlug: 'private-space',
            slug: repository.slug,
            name: repository.slug,
            isPrivate: true,
            htmlUrl: `https://bitbucket.org/private-space/${repository.slug}`,
          })),
          nextCursor: null,
        }
      }
      if (endpoint.method === 'POST' && endpoint.path.endsWith('/connections')) {
        const request = options.body as { repositorySlug: string }
        const repository = repositories.find((item) => item.slug === request.repositorySlug)
        if (!repository) throw new Error('Unexpected repository in test')
        return {
          id: INSTALLATION,
          repositoryId: repository.repositoryId,
          repositoryUuid: repository.uuid,
          workspaceSlug: 'private-space',
          repositorySlug: repository.slug,
          status: 'awaiting_webhook',
          credentialGeneration: 1,
          webhook:
            repository.slug === 'third-repo'
              ? null
              : {
                  url: `https://api.example.test/webhooks/bitbucket/${INSTALLATION}/${repository.repositoryId}`,
                  events: ['repo:push', 'pullrequest:created', 'pullrequest:updated'],
                  secret: `secret-${repository.slug}`,
                },
        }
      }
      return { connections: [], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    const search = async (slug: string, retainedSecret?: string) => {
      fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
        target: { value: 'private-space' },
      })
      fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'temporary-token' } })
      fireEvent.click(screen.getByRole('button', { name: /найти репозитории/i }))
      const connectButton = await screen.findByRole('button', { name: `Подключить ${slug}` })
      if (retainedSecret) expect(screen.getByText(retainedSecret)).toBeTruthy()
      fireEvent.click(connectButton)
    }

    await search('first-repo')
    expect(await screen.findByText('secret-first-repo')).toBeTruthy()
    expect(screen.getByText('Webhook URL')).toBeTruthy()
    expect(screen.getByText('События')).toBeTruthy()
    expect(screen.getByText('Webhook secret')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /скопировать url.*first-repo/i }))
    fireEvent.click(screen.getByRole('button', { name: /скопировать события.*first-repo/i }))
    fireEvent.click(screen.getByRole('button', { name: /скопировать секрет.*first-repo/i }))
    expect(clipboardWrite.mock.calls.map((call) => call[0])).toEqual([
      `https://api.example.test/webhooks/bitbucket/${INSTALLATION}/${REPOSITORY}`,
      'repo:push, pullrequest:created, pullrequest:updated',
      'secret-first-repo',
    ])

    await search('second-repo', 'secret-first-repo')
    expect(await screen.findByText('secret-second-repo')).toBeTruthy()
    expect(screen.getByText('secret-first-repo')).toBeTruthy()

    await search('third-repo', 'secret-second-repo')
    expect(await screen.findByText(/секрет уже выдавался.*обновите webhook secret/i)).toBeTruthy()
    expect(screen.getByText('secret-first-repo')).toBeTruthy()
    expect(screen.getByText('secret-second-repo')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /закрыть настройку webhook.*first-repo/i }))
    expect(screen.queryByText('secret-first-repo')).toBeNull()
    expect(screen.getByText('secret-second-repo')).toBeTruthy()

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('Second team'))
    expect(screen.queryByText('secret-second-repo')).toBeNull()
    expect(screen.queryByText(/секрет уже выдавался.*обновите webhook secret/i)).toBeNull()
  })

  it('keeps successive secret rotations visible and marks the previous secret obsolete', async () => {
    let rotation = 0
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/webhook-secret')) {
        rotation += 1
        return {
          url: `https://api.example.test/webhooks/bitbucket/${INSTALLATION}/${REPOSITORY}`,
          events: ['repo:push', 'pullrequest:created', 'pullrequest:updated'],
          secret: `rotated-secret-${String(rotation)}`,
        }
      }
      return {
        connections: [
          {
            id: INSTALLATION,
            repositoryId: REPOSITORY,
            repositoryUuid: REMOTE,
            workspaceSlug: 'private-space',
            repositorySlug: 'first-repo',
            status: 'active',
            credentialGeneration: 1,
            webhookUrl: `https://api.example.test/webhooks/bitbucket/${INSTALLATION}/${REPOSITORY}`,
          },
        ],
        nextCursor: null,
      }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    const rotate = async () => {
      fireEvent.click(await screen.findByRole('button', { name: /новый webhook secret/i }))
    }
    await rotate()
    expect(await screen.findByText('rotated-secret-1')).toBeTruthy()
    await rotate()
    expect(await screen.findByText('rotated-secret-2')).toBeTruthy()
    expect(screen.getByText('rotated-secret-1')).toBeTruthy()
    expect(screen.getByText(/предыдущий секрет.*недействителен/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /обновить api token/i }))
    expect(screen.getByLabelText('Новый API token').getAttribute('autocomplete')).toBe(
      'new-password',
    )
    expect(screen.getByLabelText('API token').getAttribute('autocomplete')).toBe('new-password')
  })

  it('moves focus from a connected discovery row to its one-time webhook setup', async () => {
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/discovery')) {
        return {
          repositories: [
            {
              uuid: REMOTE,
              workspaceSlug: 'private-space',
              slug: 'first-repo',
              name: 'First repo',
              isPrivate: true,
              htmlUrl: 'https://bitbucket.org/private-space/first-repo',
            },
          ],
          nextCursor: null,
        }
      }
      if (endpoint.method === 'POST' && endpoint.path.endsWith('/connections')) {
        return {
          ...firstConnection,
          webhook: {
            url: firstConnection.webhookUrl,
            events: ['repo:push'],
            secret: 'one-time-secret',
          },
        }
      }
      return { connections: [], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'private-space' },
    })
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'temporary-token' } })
    fireEvent.click(screen.getByRole('button', { name: /найти репозитории/i }))
    const connect = await screen.findByRole('button', { name: 'Подключить first-repo' })
    connect.focus()
    fireEvent.click(connect)
    expect(await screen.findByText('one-time-secret')).toBeTruthy()
    const copyUrl = screen.getByRole('button', {
      name: 'Скопировать URL для private-space/first-repo',
    })
    await waitFor(() => {
      expect(document.activeElement).toBe(copyUrl)
    })
    expect(document.activeElement).not.toBe(document.body)
  })

  it('returns focus to the credential action after its form closes and to hook setup after rotation', async () => {
    setMockTransport((endpoint) => {
      if (endpoint.method === 'PUT') return { id: INSTALLATION, credentialGeneration: 2 }
      if (endpoint.path.endsWith('/webhook-secret')) {
        return {
          url: firstConnection.webhookUrl,
          events: ['repo:push'],
          secret: 'rotated-secret',
        }
      }
      return { connections: [firstConnection], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    const openCredential = await screen.findByRole('button', {
      name: 'Обновить API token для private-space/first-repo',
    })
    fireEvent.click(openCredential)
    fireEvent.change(screen.getByLabelText('Новый API token'), {
      target: { value: 'replacement-token' },
    })
    const submit = screen.getByRole('button', { name: 'Подтвердить обновление token' })
    submit.focus()
    fireEvent.click(submit)
    await waitFor(() => {
      expect(screen.queryByLabelText('Новый API token')).toBeNull()
    })
    await waitFor(() => {
      expect(document.activeElement).toBe(openCredential)
    })

    const rotateHook = screen.getByRole('button', {
      name: 'Новый webhook secret для private-space/first-repo',
    })
    rotateHook.focus()
    fireEvent.click(rotateHook)
    expect(await screen.findByText('rotated-secret')).toBeTruthy()
    const copyUrl = screen.getByRole('button', {
      name: 'Скопировать URL для private-space/first-repo',
    })
    await waitFor(() => {
      expect(document.activeElement).toBe(copyUrl)
    })
  })

  it('keeps failed connection and hook actions keyboard reachable', async () => {
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/discovery')) {
        return {
          repositories: [
            {
              uuid: REMOTE,
              workspaceSlug: 'private-space',
              slug: 'first-repo',
              name: 'First repo',
              isPrivate: true,
              htmlUrl: 'https://bitbucket.org/private-space/first-repo',
            },
          ],
          nextCursor: null,
        }
      }
      if (endpoint.method === 'POST' && endpoint.path.endsWith('/connections')) {
        throw new ApiError(429, 'Too Many Requests', { detail: 'private-detail' })
      }
      if (endpoint.path.endsWith('/webhook-secret')) {
        throw new ApiError(429, 'Too Many Requests', { detail: 'private-detail' })
      }
      return { connections: [firstConnection], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    fireEvent.change(screen.getByRole('textbox', { name: /bitbucket workspace/i }), {
      target: { value: 'private-space' },
    })
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'temporary-token' } })
    fireEvent.click(screen.getByRole('button', { name: /найти репозитории/i }))
    const connect = await screen.findByRole('button', { name: 'Подключить first-repo' })
    connect.focus()
    fireEvent.click(connect)
    expect(
      await screen.findByText('Bitbucket ограничил частоту запросов. Повторите позже.'),
    ).toBeTruthy()
    await waitFor(() => {
      expect(document.activeElement).toBe(connect)
    })

    const rotateHook = screen.getByRole('button', {
      name: 'Новый webhook secret для private-space/first-repo',
    })
    rotateHook.focus()
    fireEvent.click(rotateHook)
    await waitFor(() => {
      expect(document.activeElement).toBe(rotateHook)
    })
    expect(document.activeElement).not.toBe(document.body)
  })

  it('moves focus to discovery after a confirmed repository row disappears', async () => {
    let connected = true
    setMockTransport((endpoint) => {
      if (endpoint.method === 'DELETE') {
        connected = false
        return null
      }
      return { connections: connected ? [firstConnection] : [], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    const disconnect = await screen.findByRole('button', {
      name: 'Отключить private-space/first-repo',
    })
    disconnect.focus()
    fireEvent.click(disconnect)
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Отключить' }))
    await waitFor(() => {
      expect(
        screen.queryByRole('button', {
          name: 'Отключить private-space/first-repo',
        }),
      ).toBeNull()
    })
    const workspaceInput = screen.getByRole('textbox', { name: 'Bitbucket workspace' })
    await waitFor(() => {
      expect(document.activeElement).toBe(workspaceInput)
    })
    expect(document.activeElement).not.toBe(document.body)
  })

  it('returns focus to credential submit and the named disconnect action on failed mutations', async () => {
    setMockTransport((endpoint) => {
      if (endpoint.method === 'PUT' || endpoint.method === 'DELETE') {
        throw new ApiError(429, 'Too Many Requests', { detail: 'private-detail' })
      }
      return { connections: [firstConnection], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    const openCredential = await screen.findByRole('button', {
      name: 'Обновить API token для private-space/first-repo',
    })
    fireEvent.click(openCredential)
    fireEvent.change(screen.getByLabelText('Новый API token'), {
      target: { value: 'replacement-token' },
    })
    const submit = screen.getByRole('button', { name: 'Подтвердить обновление token' })
    submit.focus()
    fireEvent.click(submit)
    await waitFor(() => {
      expect(document.activeElement).toBe(submit)
    })
    expect(screen.getByLabelText('Новый API token')).toBeTruthy()

    const disconnect = screen.getByRole('button', { name: 'Отключить private-space/first-repo' })
    disconnect.focus()
    fireEvent.click(disconnect)
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Отключить' }))
    await waitFor(() => {
      expect(document.activeElement).toBe(disconnect)
    })
    expect(screen.getByText('private-space/first-repo')).toBeTruthy()
    expect(document.activeElement).not.toBe(document.body)
  })

  it('keeps a new webhook card when an older card is dismissed in the same batch', async () => {
    let rotation = 0
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/webhook-secret')) {
        rotation += 1
        return {
          url: firstConnection.webhookUrl,
          events: ['repo:push'],
          secret: `secret-${String(rotation)}`,
        }
      }
      return { connections: [firstConnection], nextCursor: null }
    })
    const { client } = renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    const rotate = await screen.findByRole('button', {
      name: 'Новый webhook secret для private-space/first-repo',
    })
    fireEvent.click(rotate)
    expect(await screen.findByText('secret-1')).toBeTruthy()

    const invalidate = client.invalidateQueries.bind(client)
    let dismissed = false
    vi.spyOn(client, 'invalidateQueries').mockImplementation((filters) => {
      if (rotation === 2 && !dismissed) {
        dismissed = true
        screen
          .getByRole('button', {
            name: 'Закрыть настройку webhook для private-space/first-repo',
          })
          .dispatchEvent(new MouseEvent('click', { bubbles: true }))
      }
      return invalidate(filters)
    })
    fireEvent.click(rotate)
    await waitFor(() => {
      expect(dismissed).toBe(true)
    })
    expect(screen.queryByText('secret-1')).toBeNull()
    expect(await screen.findByText('secret-2')).toBeTruthy()
  })

  it('moves focus to a remaining webhook card, then the discovery input, as cards close', async () => {
    let rotation = 0
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/webhook-secret')) {
        rotation += 1
        return {
          url: firstConnection.webhookUrl,
          events: ['repo:push'],
          secret: `secret-${String(rotation)}`,
        }
      }
      return { connections: [firstConnection], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    const rotate = await screen.findByRole('button', {
      name: 'Новый webhook secret для private-space/first-repo',
    })
    fireEvent.click(rotate)
    expect(await screen.findByText('secret-1')).toBeTruthy()
    fireEvent.click(rotate)
    expect(await screen.findByText('secret-2')).toBeTruthy()

    const dismissSecond = screen.getAllByRole('button', {
      name: 'Закрыть настройку webhook для private-space/first-repo',
    })[1]
    if (!dismissSecond) throw new Error('Second setup dismiss button missing')
    dismissSecond.focus()
    fireEvent.click(dismissSecond)
    const remainingCopy = screen.getByRole('button', {
      name: 'Скопировать URL для private-space/first-repo',
    })
    await waitFor(() => {
      expect(document.activeElement).toBe(remainingCopy)
    })

    const dismissFirst = screen.getByRole('button', {
      name: 'Закрыть настройку webhook для private-space/first-repo',
    })
    dismissFirst.focus()
    fireEvent.click(dismissFirst)
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole('textbox', { name: 'Bitbucket workspace' }),
      )
    })
    expect(document.activeElement).not.toBe(document.body)
  })

  it('falls back to discovery when a pending focus target disappears during refresh', async () => {
    let finishRefetch: ((value: unknown) => void) | undefined
    let listCalls = 0
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/webhook-secret')) {
        return { url: firstConnection.webhookUrl, events: ['repo:push'], secret: 'pending-secret' }
      }
      if (endpoint.method === 'GET' && endpoint.path.endsWith('/connections')) {
        listCalls += 1
        if (listCalls === 2) {
          return new Promise((resolve) => {
            finishRefetch = resolve
          })
        }
      }
      return { connections: [firstConnection], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    const rotate = await screen.findByRole('button', {
      name: 'Новый webhook secret для private-space/first-repo',
    })
    rotate.focus()
    fireEvent.click(rotate)
    expect(await screen.findByText('pending-secret')).toBeTruthy()
    await waitFor(() => {
      expect(finishRefetch).toBeDefined()
    })
    rotate.blur()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Закрыть настройку webhook для private-space/first-repo',
      }),
    )
    expect(screen.queryByText('pending-secret')).toBeNull()
    await act(async () => {
      finishRefetch?.({ connections: [firstConnection], nextCursor: null })
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole('textbox', { name: 'Bitbucket workspace' }),
      )
    })
  })

  it('does not steal focus moved to another control while a webhook rotation is pending', async () => {
    let finishRotation: ((value: unknown) => void) | undefined
    setMockTransport((endpoint) => {
      if (endpoint.path.endsWith('/webhook-secret')) {
        return new Promise((resolve) => {
          finishRotation = resolve
        })
      }
      return { connections: [firstConnection], nextCursor: null }
    })
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
    fireEvent.click(screen.getByText('First team'))
    const rotate = await screen.findByRole('button', {
      name: 'Новый webhook secret для private-space/first-repo',
    })
    rotate.focus()
    fireEvent.click(rotate)
    await waitFor(() => {
      expect(finishRotation).toBeDefined()
    })
    const workspaceInput = screen.getByRole('textbox', { name: 'Bitbucket workspace' })
    workspaceInput.focus()
    await act(async () => {
      finishRotation?.({
        url: firstConnection.webhookUrl,
        events: ['repo:push'],
        secret: 'late-secret',
      })
      await Promise.resolve()
    })
    expect(await screen.findByText('late-secret')).toBeTruthy()
    await waitFor(() => {
      expect(document.activeElement).toBe(workspaceInput)
    })
  })
})
