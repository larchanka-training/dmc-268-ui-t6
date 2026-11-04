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
        return { connections: [firstConnection, secondConnection], nextCursor: null }
      }
      return { connections: [firstConnection], nextCursor: 'opaque:second/page' }
    })
    renderPanel()
    selectWorkspace('First team')

    fireEvent.click(await screen.findByRole('button', { name: 'Показать ещё подключения' }))
    expect(await screen.findByText('private-space/second-repo')).toBeTruthy()
    expect(screen.getAllByText('private-space/first-repo')).toHaveLength(1)
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

  it('does not display a previous workspace page after switching workspaces', async () => {
    let finishPage: ((value: unknown) => void) | undefined
    const paths: string[] = []
    setMockTransport((endpoint) => {
      paths.push(endpoint.path)
      if (endpoint.path === `/workspaces/${FIRST}/bitbucket/connections`) {
        return { connections: [firstConnection], nextCursor: 'next' }
      }
      if (endpoint.path === `/workspaces/${FIRST}/bitbucket/connections?cursor=next`) {
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
    await act(async () => {
      finishPage?.({ connections: [firstConnection], nextCursor: null })
      await Promise.resolve()
    })
    expect(screen.queryByText('private-space/first-repo')).toBeNull()
    expect(paths).toEqual([
      `/workspaces/${FIRST}/bitbucket/connections`,
      `/workspaces/${FIRST}/bitbucket/connections?cursor=next`,
      `/workspaces/${SECOND}/bitbucket/connections`,
    ])
  })
})
