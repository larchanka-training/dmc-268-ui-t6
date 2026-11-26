import { afterEach, describe, expect, it } from 'vitest'

import { setMockTransport } from '../../../shared/api/client'
import {
  connectGitLabProject,
  discoverGitLabProjects,
  disconnectGitLabProject,
  listGitLabConnections,
} from './index'

const WORKSPACE = '11111111-1111-4111-8111-111111111111'
const INSTALLATION = '22222222-2222-4222-8222-222222222222'
const REPOSITORY = '33333333-3333-4333-8333-333333333333'
const TOKEN = 'glpat-temporary-token'
const WEBHOOK_URL = `https://api.example.test/webhooks/gitlab/${INSTALLATION}`

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

afterEach(() => {
  setMockTransport(null)
})

describe('GitLab workspace connection API', () => {
  it('posts the token only in the discovery body and parses projects', async () => {
    const calls: { method: string; path: string; body: unknown }[] = []
    setMockTransport((endpoint, options) => {
      calls.push({ method: endpoint.method, path: endpoint.path, body: options.body })
      return { projects: [PROJECT] }
    })

    const discovery = await discoverGitLabProjects(WORKSPACE, { token: TOKEN })

    expect(discovery.projects).toEqual([PROJECT])
    expect(calls).toEqual([
      {
        method: 'POST',
        path: `/workspaces/${WORKSPACE}/gitlab/discovery`,
        body: { token: TOKEN },
      },
    ])
    expect(calls[0]?.path.includes(TOKEN)).toBe(false)
  })

  it('connects a project and keeps a manual webhook secret on the parsed response', async () => {
    setMockTransport(() => ({
      ...CONNECTION,
      webhook: { url: WEBHOOK_URL, secret: 'one-time-secret' },
    }))

    const connected = await connectGitLabProject(WORKSPACE, { token: TOKEN, projectId: 42 })

    expect(connected.webhook).toEqual({ url: WEBHOOK_URL, secret: 'one-time-secret' })
    expect(connected.status).toBe('awaiting_webhook')
  })

  it('accepts an automatic connect response whose webhook is null', async () => {
    setMockTransport(() => ({ ...CONNECTION, status: 'active', webhook: null }))

    const connected = await connectGitLabProject(WORKSPACE, { token: TOKEN, projectId: 42 })

    expect(connected.webhook).toBeNull()
    expect(connected.status).toBe('active')
  })

  it('lists connections without a secret and rejects an unknown status', async () => {
    setMockTransport(() => ({ connections: [CONNECTION] }))
    const listed = await listGitLabConnections(WORKSPACE)
    expect(listed.connections).toEqual([CONNECTION])

    setMockTransport(() => ({ connections: [{ ...CONNECTION, status: 'pending' }] }))
    await expect(listGitLabConnections(WORKSPACE)).rejects.toThrow(/status/i)
  })

  it('deletes one installation and does not send the token', async () => {
    const calls: { method: string; path: string; body: unknown }[] = []
    setMockTransport((endpoint, options) => {
      calls.push({ method: endpoint.method, path: endpoint.path, body: options.body })
      return null
    })

    await disconnectGitLabProject(WORKSPACE, INSTALLATION)

    expect(calls).toEqual([
      {
        method: 'DELETE',
        path: `/workspaces/${WORKSPACE}/gitlab/connections/${INSTALLATION}`,
        body: undefined,
      },
    ])
  })
})
