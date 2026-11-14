import { afterEach, describe, expect, it } from 'vitest'

import { setMockTransport } from '../../../shared/api/client'
import { listAgentTokens, revokeAgentToken } from './agentTokens'

const TOKEN_ID = '00000000-0000-4000-8000-000000000001'
const TOKEN = {
  id: TOKEN_ID,
  repository: 'octo/repo',
  createdAt: '2026-11-05T12:00:00Z',
  expiresAt: '2026-12-05T12:00:00Z',
}

afterEach(() => {
  setMockTransport(null)
})

describe('agent token API', () => {
  it('parses the owner token list without a credential', async () => {
    setMockTransport((endpoint) => {
      expect(endpoint).toEqual({ method: 'GET', path: '/agent/tokens' })
      return [TOKEN]
    })
    expect(await listAgentTokens()).toEqual([TOKEN])
  })

  it('rejects malformed token metadata', async () => {
    setMockTransport(() => [{ ...TOKEN, id: 'not-a-uuid' }])
    await expect(listAgentTokens()).rejects.toThrow()
  })

  it('revokes one token by ID', async () => {
    setMockTransport((endpoint) => {
      expect(endpoint).toEqual({ method: 'DELETE', path: `/agent/tokens/${TOKEN_ID}` })
      return null
    })
    await expect(revokeAgentToken(TOKEN_ID)).resolves.toBeUndefined()
  })
})
