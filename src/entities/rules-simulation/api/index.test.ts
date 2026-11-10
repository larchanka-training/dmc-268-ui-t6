import { afterEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'

import { fetchRulesSimulation, startRulesSimulation } from './index'

const ID = '5a5a5a5a-5a5a-4a5a-8a5a-000000000001'
const REPO_ID = '22222222-2222-4222-8222-000000000001'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function answer(body: unknown, status = 200) {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify(body), { status }))
  globalThis.fetch = fetchMock
  return fetchMock
}

describe('startRulesSimulation', () => {
  it('posts the input to the repository and returns the queued simulation', async () => {
    const fetchMock = answer({ id: ID, status: 'queued' }, 202)
    const input = { mode: 'code' as const, path: 'a.py', content: 'x = 1', rulesMd: '# Style' }

    expect(await startRulesSimulation(REPO_ID, input)).toEqual({ id: ID, status: 'queued' })

    const call = fetchMock.mock.calls[0]
    expect(call?.[0]).toEqual(
      expect.stringMatching(new RegExp(`/repos/${REPO_ID}/rules-simulations$`)),
    )
    const init = call?.[1]
    expect(init?.method).toBe('POST')
    expect(typeof init?.body === 'string' ? JSON.parse(init.body) : null).toEqual(input)
  })

  it('refuses an answer that does not match the schema', async () => {
    answer({ id: ID, status: 'running' }, 202)
    await expect(
      startRulesSimulation(REPO_ID, { mode: 'code', path: '', content: 'x', rulesMd: '' }),
    ).rejects.toBeInstanceOf(ZodError)
  })
})

describe('fetchRulesSimulation', () => {
  it('reads the simulation by id', async () => {
    const fetchMock = answer({ id: ID, status: 'running' })

    expect(await fetchRulesSimulation(ID)).toEqual({ id: ID, status: 'running' })
    expect(fetchMock.mock.calls[0]?.[0]).toEqual(
      expect.stringMatching(new RegExp(`/rules-simulations/${ID}$`)),
    )
  })

  it('refuses a finished simulation without its findings', async () => {
    answer({ id: ID, status: 'succeeded', tokensIn: 1, tokensOut: 1, costUsd: 0 })
    await expect(fetchRulesSimulation(ID)).rejects.toBeInstanceOf(ZodError)
  })
})
