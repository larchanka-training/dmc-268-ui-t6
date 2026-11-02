import { afterEach, describe, expect, it } from 'vitest'

import { setMockTransport } from '../../../shared/api/client'
import {
  BitbucketConnectionItemSchema,
  BitbucketConnectResponseSchema,
  BitbucketCredentialRotateRequestSchema,
} from '../model/schemas'
import {
  connectBitbucketRepository,
  discoverBitbucketRepositories,
  disconnectBitbucketRepository,
  listBitbucketConnections,
  rotateBitbucketCredential,
  rotateBitbucketWebhookSecret,
} from './index'

const WORKSPACE = '11111111-1111-4111-8111-111111111111'
const INSTALLATION = '22222222-2222-4222-8222-222222222222'
const REPOSITORY = '33333333-3333-4333-8333-333333333333'
const REMOTE = '44444444-4444-4444-8444-444444444444'
const WEBHOOK = {
  url: `https://api.example.test/webhooks/bitbucket/${INSTALLATION}/${REPOSITORY}`,
  events: [
    'repo:push',
    'pullrequest:created',
    'pullrequest:updated',
    'pullrequest:fulfilled',
    'pullrequest:rejected',
  ],
  secret: 'one-time-secret',
}
const CONNECTION = {
  id: INSTALLATION,
  repositoryId: REPOSITORY,
  repositoryUuid: REMOTE,
  workspaceSlug: 'private-space',
  repositorySlug: 'private-repo',
  status: 'awaiting_webhook',
  credentialGeneration: 1,
  webhookUrl: WEBHOOK.url,
}
const DISCOVERED = {
  uuid: REMOTE,
  workspaceSlug: 'private-space',
  slug: 'private-repo',
  name: 'Private repo',
  isPrivate: true,
  htmlUrl: 'https://bitbucket.org/private-space/private-repo',
}

afterEach(() => {
  setMockTransport(null)
})

describe('Bitbucket workspace connection API', () => {
  describe.each([
    ['connect response', BitbucketConnectResponseSchema, { ...CONNECTION, webhook: WEBHOOK }],
    ['connection item', BitbucketConnectionItemSchema, CONNECTION],
  ])('%s slug bounds', (_name, schema, connection) => {
    it.each(['workspaceSlug', 'repositorySlug'] as const)('accepts a 128-character %s', (field) => {
      expect(schema.safeParse({ ...connection, [field]: 'a'.repeat(128) }).success).toBe(true)
    })

    it.each(['workspaceSlug', 'repositorySlug'] as const)('rejects a 129-character %s', (field) => {
      expect(schema.safeParse({ ...connection, [field]: 'a'.repeat(129) }).success).toBe(false)
    })
  })

  it('sends discovery and connect only to the selected portal workspace and validates private repositories', async () => {
    const calls: { path: string; body: unknown }[] = []
    setMockTransport((endpoint, options) => {
      calls.push({ path: endpoint.path, body: options.body })
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
      return {
        id: INSTALLATION,
        repositoryId: REPOSITORY,
        repositoryUuid: REMOTE,
        workspaceSlug: 'private-space',
        repositorySlug: 'private-repo',
        status: 'awaiting_webhook',
        credentialGeneration: 1,
        webhook: WEBHOOK,
      }
    })

    const discovery = await discoverBitbucketRepositories(WORKSPACE, {
      bitbucketWorkspace: 'private-space',
      apiToken: 'temporary-token',
    })
    expect(discovery.repositories[0]?.isPrivate).toBe(true)
    const connected = await connectBitbucketRepository(WORKSPACE, {
      bitbucketWorkspace: 'private-space',
      repositorySlug: 'private-repo',
      repositoryUuid: REMOTE,
      apiToken: 'temporary-token',
    })
    expect(connected.webhook?.secret).toBe('one-time-secret')
    expect(connected.webhook?.events).toEqual([
      'repo:push',
      'pullrequest:created',
      'pullrequest:updated',
      'pullrequest:fulfilled',
      'pullrequest:rejected',
    ])
    expect(calls).toEqual([
      {
        path: `/workspaces/${WORKSPACE}/bitbucket/discovery`,
        body: { bitbucketWorkspace: 'private-space', apiToken: 'temporary-token' },
      },
      {
        path: `/workspaces/${WORKSPACE}/bitbucket/connections`,
        body: {
          bitbucketWorkspace: 'private-space',
          repositorySlug: 'private-repo',
          repositoryUuid: REMOTE,
          apiToken: 'temporary-token',
        },
      },
    ])
  })

  it('rejects an unknown connection status even when every other field is valid', async () => {
    setMockTransport(() => ({
      connections: [{ ...CONNECTION, status: 'unknown' }],
      nextCursor: null,
    }))
    await expect(listBitbucketConnections(WORKSPACE)).rejects.toThrow(/status/i)
  })

  it('rejects malformed isPrivate even when every other discovery field is valid', async () => {
    setMockTransport(() => ({
      repositories: [{ ...DISCOVERED, isPrivate: 'yes' }],
      nextCursor: null,
    }))
    await expect(
      discoverBitbucketRepositories(WORKSPACE, {
        bitbucketWorkspace: 'private-space',
        apiToken: 't',
      }),
    ).rejects.toThrow(/isPrivate/i)
  })

  it('parses a complete connect response and rejects only malformed status', async () => {
    const valid = {
      id: INSTALLATION,
      repositoryId: REPOSITORY,
      repositoryUuid: REMOTE,
      workspaceSlug: 'private-space',
      repositorySlug: 'private-repo',
      status: 'awaiting_webhook',
      credentialGeneration: 1,
      webhook: WEBHOOK,
    }
    setMockTransport(() => valid)
    const input = {
      bitbucketWorkspace: 'private-space',
      repositorySlug: 'private-repo',
      repositoryUuid: REMOTE,
      apiToken: 'temporary-token',
    }
    await expect(connectBitbucketRepository(WORKSPACE, input)).resolves.toMatchObject(valid)
    setMockTransport(() => ({ ...valid, status: 'unrecognized' }))
    await expect(connectBitbucketRepository(WORKSPACE, input)).rejects.toThrow(/status/i)
  })

  it('rejects an undeclared webhook event on connect and secret rotation', async () => {
    const webhook = { ...WEBHOOK, events: [...WEBHOOK.events, 'pullrequest:merged'] }
    const input = {
      bitbucketWorkspace: 'private-space',
      repositorySlug: 'private-repo',
      repositoryUuid: REMOTE,
      apiToken: 'temporary-token',
    }
    setMockTransport(() => ({ ...CONNECTION, webhook }))
    await expect(connectBitbucketRepository(WORKSPACE, input)).rejects.toThrow(/events/i)
    setMockTransport(() => webhook)
    await expect(rotateBitbucketWebhookSecret(WORKSPACE, INSTALLATION, REPOSITORY)).rejects.toThrow(
      /events/i,
    )
  })

  it('uses an unpaged connection endpoint and rejects a fabricated next cursor', async () => {
    const paths: string[] = []
    setMockTransport((endpoint) => {
      paths.push(endpoint.path)
      return { connections: [CONNECTION], nextCursor: null }
    })
    await expect(listBitbucketConnections(WORKSPACE)).resolves.toEqual({
      connections: [CONNECTION],
      nextCursor: null,
    })
    expect(paths).toEqual([`/workspaces/${WORKSPACE}/bitbucket/connections`])

    setMockTransport(() => ({ connections: [CONNECTION], nextCursor: 'unsupported-cursor' }))
    await expect(listBitbucketConnections(WORKSPACE)).rejects.toThrow(/nextCursor/i)
  })

  it('rejects an empty credential before sending the rotation request', async () => {
    expect(BitbucketCredentialRotateRequestSchema.safeParse({ apiToken: '' }).success).toBe(false)
    expect(BitbucketCredentialRotateRequestSchema.parse({ apiToken: 'replacement-token' })).toEqual(
      {
        apiToken: 'replacement-token',
      },
    )
    const calls: string[] = []
    setMockTransport((endpoint) => {
      calls.push(endpoint.path)
      return { id: INSTALLATION, credentialGeneration: 2 }
    })
    await expect(rotateBitbucketCredential(WORKSPACE, INSTALLATION, '')).rejects.toThrow(
      /apiToken/i,
    )
    expect(calls).toEqual([])
  })

  it.each([
    ['empty', ''],
    ['4097 bytes', 'a'.repeat(4097)],
    ['space', 'token with space'],
    ['trailing newline', 'token\n'],
    ['tab', 'token\t'],
    ['NUL', 'token\0'],
    ['DEL', 'token\x7f'],
    ['non-ASCII', 'tökén'],
  ])(
    'rejects %s API token before discovery, connect and credential rotation HTTP',
    async (_, token) => {
      const calls: string[] = []
      setMockTransport((endpoint) => {
        calls.push(endpoint.path)
        throw new Error('invalid token reached transport')
      })
      await expect(
        discoverBitbucketRepositories(WORKSPACE, {
          bitbucketWorkspace: 'private-space',
          apiToken: token,
        }),
      ).rejects.toThrow(/apiToken/i)
      await expect(
        connectBitbucketRepository(WORKSPACE, {
          bitbucketWorkspace: 'private-space',
          repositorySlug: 'private-repo',
          repositoryUuid: REMOTE,
          apiToken: token,
        }),
      ).rejects.toThrow(/apiToken/i)
      await expect(rotateBitbucketCredential(WORKSPACE, INSTALLATION, token)).rejects.toThrow(
        /apiToken/i,
      )
      expect(calls).toEqual([])
    },
  )

  it('accepts a 4096-character printable ASCII API token at all three boundaries', async () => {
    const token = '!' + '~'.repeat(4095)
    const calls: { path: string; token: string | undefined }[] = []
    setMockTransport((endpoint, options) => {
      const body = options.body as { apiToken?: string }
      calls.push({ path: endpoint.path, token: body.apiToken })
      if (endpoint.path.endsWith('/discovery')) {
        return { repositories: [DISCOVERED], nextCursor: null }
      }
      if (endpoint.path.endsWith('/credential')) {
        return { id: INSTALLATION, credentialGeneration: 2 }
      }
      return { ...CONNECTION, webhook: WEBHOOK }
    })
    await expect(
      discoverBitbucketRepositories(WORKSPACE, {
        bitbucketWorkspace: 'private-space',
        apiToken: token,
      }),
    ).resolves.toMatchObject({ nextCursor: null })
    await expect(
      connectBitbucketRepository(WORKSPACE, {
        bitbucketWorkspace: 'private-space',
        repositorySlug: 'private-repo',
        repositoryUuid: REMOTE,
        apiToken: token,
      }),
    ).resolves.toMatchObject({ webhook: WEBHOOK })
    await expect(rotateBitbucketCredential(WORKSPACE, INSTALLATION, token)).resolves.toEqual({
      id: INSTALLATION,
      credentialGeneration: 2,
    })
    expect(calls).toEqual([
      { path: `/workspaces/${WORKSPACE}/bitbucket/discovery`, token },
      { path: `/workspaces/${WORKSPACE}/bitbucket/connections`, token },
      { path: `/workspaces/${WORKSPACE}/bitbucket/connections/${INSTALLATION}/credential`, token },
    ])
  })

  it('disconnects one binding, rotates shared credential explicitly and rotates only its hook secret', async () => {
    const calls: { method: string; path: string; body: unknown }[] = []
    setMockTransport((endpoint, options) => {
      calls.push({ ...endpoint, body: options.body })
      if (endpoint.method === 'DELETE') return null
      if (endpoint.path.endsWith('/credential')) {
        return { id: INSTALLATION, credentialGeneration: 2 }
      }
      return WEBHOOK
    })
    await rotateBitbucketCredential(WORKSPACE, INSTALLATION, 'replacement-token')
    const rotatedWebhook = await rotateBitbucketWebhookSecret(WORKSPACE, INSTALLATION, REPOSITORY)
    expect(rotatedWebhook.events).toEqual([
      'repo:push',
      'pullrequest:created',
      'pullrequest:updated',
      'pullrequest:fulfilled',
      'pullrequest:rejected',
    ])
    await disconnectBitbucketRepository(WORKSPACE, INSTALLATION, REPOSITORY)
    expect(calls).toEqual([
      {
        method: 'PUT',
        path: `/workspaces/${WORKSPACE}/bitbucket/connections/${INSTALLATION}/credential`,
        body: { apiToken: 'replacement-token' },
      },
      {
        method: 'POST',
        path: `/workspaces/${WORKSPACE}/bitbucket/connections/${INSTALLATION}/repositories/${REPOSITORY}/webhook-secret`,
        body: undefined,
      },
      {
        method: 'DELETE',
        path: `/workspaces/${WORKSPACE}/bitbucket/connections/${INSTALLATION}/repositories/${REPOSITORY}`,
        body: undefined,
      },
    ])
  })
})
