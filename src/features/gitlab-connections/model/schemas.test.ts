import { describe, expect, it } from 'vitest'

import {
  GitLabConnectResponseSchema,
  GitLabConnectionListSchema,
  GitLabDiscoveryResponseSchema,
} from './schemas'

const INSTALLATION = '22222222-2222-4222-8222-222222222222'
const REPOSITORY = '33333333-3333-4333-8333-333333333333'
const PROJECT_ID = 42
const WEBHOOK_URL = `https://api.example.test/webhooks/gitlab/${INSTALLATION}`

const PROJECT = {
  projectId: PROJECT_ID,
  pathWithNamespace: 'group/review-me',
  name: 'Review me',
  webUrl: 'https://gitlab.com/group/review-me',
}

const CONNECTION = {
  id: INSTALLATION,
  repositoryId: REPOSITORY,
  projectId: PROJECT_ID,
  pathWithNamespace: 'group/review-me',
  status: 'awaiting_webhook',
  webhookUrl: WEBHOOK_URL,
}

describe('GitLab connection schemas', () => {
  it('parses discovery projects and drops nothing the contract names', () => {
    const parsed = GitLabDiscoveryResponseSchema.parse({ projects: [PROJECT] })
    expect(parsed.projects).toEqual([PROJECT])
  })

  it('rejects a discovery project whose id is not a positive integer', () => {
    expect(
      GitLabDiscoveryResponseSchema.safeParse({
        projects: [{ ...PROJECT, projectId: 0 }],
      }).success,
    ).toBe(false)
  })

  it('parses a manual connect response with a one-time webhook secret', () => {
    const parsed = GitLabConnectResponseSchema.parse({
      ...CONNECTION,
      webhook: { url: WEBHOOK_URL, secret: 'one-time-secret' },
    })
    expect(parsed.webhook).toEqual({ url: WEBHOOK_URL, secret: 'one-time-secret' })
    expect(parsed.status).toBe('awaiting_webhook')
  })

  it('parses an automatic connect response with no webhook secret', () => {
    const parsed = GitLabConnectResponseSchema.parse({
      ...CONNECTION,
      status: 'active',
      webhook: null,
    })
    expect(parsed.webhook).toBeNull()
    expect(parsed.status).toBe('active')
  })

  it('parses a connection list without a secret and rejects an unknown status', () => {
    const parsed = GitLabConnectionListSchema.parse({ connections: [CONNECTION] })
    expect(parsed.connections[0]).toEqual(CONNECTION)
    expect('webhookSecret' in (parsed.connections[0] ?? {})).toBe(false)
    expect(
      GitLabConnectionListSchema.safeParse({
        connections: [{ ...CONNECTION, status: 'pending' }],
      }).success,
    ).toBe(false)
  })
})
