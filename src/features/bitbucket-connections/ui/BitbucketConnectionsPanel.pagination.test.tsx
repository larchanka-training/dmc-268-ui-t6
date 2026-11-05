// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from 'antd'
import { afterEach, describe, expect, it } from 'vitest'

import { setMockTransport } from '../../../shared/api/client'
import { BitbucketConnectionsPanel } from './BitbucketConnectionsPanel'

const FIRST = '11111111-1111-4111-8111-111111111111'
const SECOND = '22222222-2222-4222-8222-222222222222'
const INSTALLATION = '33333333-3333-4333-8333-333333333333'
const FIRST_REPO = '44444444-4444-4444-8444-444444444444'
const SECOND_REPO = '55555555-5555-4555-8555-555555555555'
const THIRD_REPO = '66666666-6666-4666-8666-666666666666'
const firstConnection = {
  id: INSTALLATION,
  repositoryId: FIRST_REPO,
  repositoryUuid: FIRST_REPO,
  workspaceSlug: 'private-space',
  repositorySlug: 'first-repo',
  status: 'active',
  credentialGeneration: 1,
  webhookUrl: `https://api.example.test/webhooks/bitbucket/${INSTALLATION}/${FIRST_REPO}`,
}
const secondConnection = {
  ...firstConnection,
  repositoryId: SECOND_REPO,
  repositoryUuid: SECOND_REPO,
  repositorySlug: 'second-repo',
  webhookUrl: `https://api.example.test/webhooks/bitbucket/${INSTALLATION}/${SECOND_REPO}`,
}
const thirdConnection = {
  ...firstConnection,
  repositoryId: THIRD_REPO,
  repositoryUuid: THIRD_REPO,
  repositorySlug: 'third-repo',
  webhookUrl: `https://api.example.test/webhooks/bitbucket/${INSTALLATION}/${THIRD_REPO}`,
}

afterEach(() => {
  cleanup()
  setMockTransport(null)
})

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <App>
        <BitbucketConnectionsPanel
          workspaces={[
            { id: FIRST, name: 'First team', installationId: 1 },
            { id: SECOND, name: 'Second team', installationId: 2 },
          ]}
        />
      </App>
    </QueryClientProvider>,
  )
}

function selectWorkspace(name: string) {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: /portal workspace/i }))
  fireEvent.click(screen.getByText(name))
}

describe('Bitbucket connection pages', () => {
  it('loads a later page and shows each connection only once', async () => {
    const paths: string[] = []
    setMockTransport((endpoint) => {
      paths.push(endpoint.path)
      if (endpoint.path.includes('?cursor=')) {
        return { connections: [secondConnection, thirdConnection], nextCursor: null }
      }
      return { connections: [firstConnection, secondConnection], nextCursor: 'opaque:second/page' }
    })
    renderPanel()
    selectWorkspace('First team')

    fireEvent.click(await screen.findByRole('button', { name: 'Показать ещё подключения' }))
    expect(await screen.findByText('private-space/third-repo')).toBeTruthy()
    expect(screen.getAllByText(/^private-space\//).map((node) => node.textContent)).toEqual([
      'private-space/first-repo',
      'private-space/second-repo',
      'private-space/third-repo',
    ])
    expect(screen.queryByRole('button', { name: 'Показать ещё подключения' })).toBeNull()
    expect(paths).toEqual([
      `/workspaces/${FIRST}/bitbucket/connections`,
      `/workspaces/${FIRST}/bitbucket/connections?cursor=opaque%3Asecond%2Fpage`,
    ])
  })

  it('offers the next page even when the current page is empty', async () => {
    setMockTransport((endpoint) =>
      endpoint.path.includes('?cursor=')
        ? { connections: [secondConnection], nextCursor: null }
        : { connections: [], nextCursor: 'next' },
    )
    renderPanel()
    selectWorkspace('First team')
    fireEvent.click(await screen.findByRole('button', { name: 'Показать ещё подключения' }))
    expect(await screen.findByText('private-space/second-repo')).toBeTruthy()
  })

  it('moves focus to the safe action of a newly loaded connection', async () => {
    let finishPage: ((value: unknown) => void) | undefined
    setMockTransport((endpoint) => {
      if (endpoint.path.includes('?cursor=')) {
        return new Promise((resolve) => {
          finishPage = resolve
        })
      }
      return { connections: [firstConnection], nextCursor: 'next' }
    })
    renderPanel()
    selectWorkspace('First team')
    const pager = await screen.findByRole('button', { name: 'Показать ещё подключения' })
    pager.focus()
    fireEvent.click(pager)
    await waitFor(() => {
      expect(pager.hasAttribute('disabled')).toBe(true)
      expect(pager.className).toContain('ant-btn-loading')
      expect(finishPage).toBeDefined()
    })
    await act(async () => {
      finishPage?.({ connections: [secondConnection], nextCursor: null })
      await Promise.resolve()
    })

    expect(await screen.findByText('private-space/second-repo')).toBeTruthy()
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Обновить API token для private-space/second-repo' }),
      )
    })
  })

  it('leaves focus where the user moved it while a connection page loaded', async () => {
    let finishPage: ((value: unknown) => void) | undefined
    setMockTransport((endpoint) => {
      if (endpoint.path.includes('?cursor=')) {
        return new Promise((resolve) => {
          finishPage = resolve
        })
      }
      return { connections: [firstConnection], nextCursor: 'next' }
    })
    renderPanel()
    selectWorkspace('First team')
    const pager = await screen.findByRole('button', { name: 'Показать ещё подключения' })
    pager.focus()
    fireEvent.click(pager)
    await waitFor(() => {
      expect(finishPage).toBeDefined()
    })
    const workspaceInput = screen.getByRole('textbox', { name: 'Bitbucket workspace' })
    workspaceInput.focus()
    await act(async () => {
      finishPage?.({ connections: [secondConnection], nextCursor: null })
      await Promise.resolve()
    })

    expect(await screen.findByText('private-space/second-repo')).toBeTruthy()
    expect(document.activeElement).toBe(workspaceInput)
  })

  it('returns focus to Show more when a connection page fails', async () => {
    let failPage: ((reason: unknown) => void) | undefined
    setMockTransport((endpoint) => {
      if (endpoint.path.includes('?cursor=')) {
        return new Promise((_, reject) => {
          failPage = reject
        })
      }
      return { connections: [firstConnection], nextCursor: 'next' }
    })
    renderPanel()
    selectWorkspace('First team')
    const pager = await screen.findByRole('button', { name: 'Показать ещё подключения' })
    pager.focus()
    fireEvent.click(pager)
    await waitFor(() => {
      expect(pager.hasAttribute('disabled')).toBe(true)
      expect(failPage).toBeDefined()
    })
    const workspaceInput = screen.getByRole('textbox', { name: 'Bitbucket workspace' })
    workspaceInput.focus()
    workspaceInput.blur()
    expect(document.activeElement).toBe(document.body)
    await act(async () => {
      failPage?.(new Error('page failed'))
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(pager.hasAttribute('disabled')).toBe(false)
      expect(pager.isConnected).toBe(true)
      expect(document.activeElement).toBe(pager)
    })
    expect(screen.getByText('private-space/first-repo')).toBeTruthy()
  })

  it('moves focus to the safe action after retrying a failed connection page', async () => {
    let failFirst: ((reason: unknown) => void) | undefined
    let finishRetry: ((value: unknown) => void) | undefined
    let pageCalls = 0
    setMockTransport((endpoint) => {
      if (endpoint.path.includes('?cursor=')) {
        pageCalls += 1
        if (pageCalls === 1) {
          return new Promise((_, reject) => {
            failFirst = reject
          })
        }
        return new Promise((resolve) => {
          finishRetry = resolve
        })
      }
      return { connections: [firstConnection], nextCursor: 'next' }
    })
    renderPanel()
    selectWorkspace('First team')
    const pager = await screen.findByRole('button', { name: 'Показать ещё подключения' })
    pager.focus()
    fireEvent.click(pager)
    await waitFor(() => {
      expect(failFirst).toBeDefined()
      expect(pager.hasAttribute('disabled')).toBe(true)
    })
    const workspaceInput = screen.getByRole('textbox', { name: 'Bitbucket workspace' })
    workspaceInput.focus()
    workspaceInput.blur()
    await act(async () => {
      failFirst?.(new Error('page failed'))
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(pager.hasAttribute('disabled')).toBe(false)
      expect(document.activeElement).toBe(pager)
    })

    fireEvent.click(pager)
    await waitFor(() => {
      expect(finishRetry).toBeDefined()
      expect(pager.hasAttribute('disabled')).toBe(true)
    })
    workspaceInput.focus()
    workspaceInput.blur()
    expect(document.activeElement).toBe(document.body)
    await act(async () => {
      finishRetry?.({ connections: [secondConnection], nextCursor: null })
      await Promise.resolve()
    })

    expect(await screen.findByText('private-space/second-repo')).toBeTruthy()
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Обновить API token для private-space/second-repo' }),
      )
    })
    expect(pageCalls).toBe(2)
  })

  it('does not move focus after clicking Show more without focus', async () => {
    let finishPage: ((value: unknown) => void) | undefined
    setMockTransport((endpoint) => {
      if (endpoint.path.includes('?cursor=')) {
        return new Promise((resolve) => {
          finishPage = resolve
        })
      }
      return { connections: [firstConnection], nextCursor: 'next' }
    })
    renderPanel()
    selectWorkspace('First team')
    const pager = await screen.findByRole('button', { name: 'Показать ещё подключения' })
    const workspaceInput = screen.getByRole('textbox', { name: 'Bitbucket workspace' })
    workspaceInput.focus()
    workspaceInput.blur()
    expect(document.activeElement).toBe(document.body)

    fireEvent.click(pager)
    await waitFor(() => {
      expect(finishPage).toBeDefined()
    })
    await act(async () => {
      finishPage?.({ connections: [secondConnection], nextCursor: null })
      await Promise.resolve()
    })

    expect(await screen.findByText('private-space/second-repo')).toBeTruthy()
    expect(document.activeElement).toBe(document.body)
  })

  it.each([
    ['final', null],
    ['intermediate', 'later'],
  ])('recovers focus after an empty %s connection page', async (_, nextCursor) => {
    let finishPage: ((value: unknown) => void) | undefined
    setMockTransport((endpoint) => {
      if (endpoint.path.includes('?cursor=')) {
        return new Promise((resolve) => {
          finishPage = resolve
        })
      }
      return { connections: [firstConnection], nextCursor: 'next' }
    })
    renderPanel()
    selectWorkspace('First team')
    const pager = await screen.findByRole('button', { name: 'Показать ещё подключения' })
    pager.focus()
    fireEvent.click(pager)
    await waitFor(() => {
      expect(pager.hasAttribute('disabled')).toBe(true)
      expect(finishPage).toBeDefined()
    })
    const workspaceInput = screen.getByRole('textbox', { name: 'Bitbucket workspace' })
    workspaceInput.focus()
    workspaceInput.blur()
    expect(document.activeElement).toBe(document.body)
    await act(async () => {
      finishPage?.({ connections: [], nextCursor })
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(document.activeElement).toBe(
        nextCursor === null ? screen.getByRole('textbox', { name: 'Bitbucket workspace' }) : pager,
      )
    })
  })

  it('does not display a previous workspace page after switching workspaces', async () => {
    let finishPage: ((value: unknown) => void) | undefined
    let pageSignal: AbortSignal | null | undefined
    const paths: string[] = []
    setMockTransport((endpoint, options) => {
      paths.push(endpoint.path)
      if (endpoint.path === `/workspaces/${FIRST}/bitbucket/connections`) {
        return { connections: [firstConnection], nextCursor: 'next' }
      }
      if (endpoint.path === `/workspaces/${FIRST}/bitbucket/connections?cursor=next`) {
        pageSignal = options.signal
        return new Promise((resolve) => {
          finishPage = resolve
        })
      }
      return { connections: [secondConnection], nextCursor: null }
    })
    renderPanel()
    selectWorkspace('First team')
    expect(await screen.findByText('private-space/first-repo')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Показать ещё подключения' }))
    await waitFor(() => {
      expect(finishPage).toBeDefined()
    })

    selectWorkspace('Second team')
    expect(await screen.findByText('private-space/second-repo')).toBeTruthy()
    expect(pageSignal?.aborted).toBe(true)
    await act(async () => {
      finishPage?.({ connections: [firstConnection], nextCursor: null })
      await Promise.resolve()
    })
    expect(paths).toEqual([
      `/workspaces/${FIRST}/bitbucket/connections`,
      `/workspaces/${FIRST}/bitbucket/connections?cursor=next`,
      `/workspaces/${SECOND}/bitbucket/connections`,
    ])
  })
})
