import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/config/env', () => ({
  USE_MOCKS: true,
  isMockMode: () => true,
  env: { VITE_USE_MOCKS: true },
  API_BASE_URL: '/api',
  GITHUB_CLIENT_ID: '',
  GITHUB_APP_SLUG: '',
}))

import {
  RulesSimulationAcceptedSchema,
  RulesSimulationSchema,
} from '../../entities/rules-simulation'
import { apiClient, setMockTransport } from '../../shared/api/client'
import { endpoints } from '../../shared/api/endpoints'
import { mockRepositories } from './app-state'
import { initMockTransport } from './mockTransport'

const REPO_ID = mockRepositories[0]?.id ?? ''
const FIXTURE_PREFIX = '5a5a5a5a-5a5a-4a5a-8a5a-'
const CONTENT_LIMIT = 64 * 1024

const input = {
  mode: 'code',
  path: 'src/app.py',
  content: 'a = 1\nb = 2\nc = 3\nd = 4',
  rulesMd: '# Security',
}

async function start(body: object = input) {
  return RulesSimulationAcceptedSchema.parse(
    await apiClient(endpoints.rulesSimulations.create(REPO_ID), { body }),
  )
}

async function read(id: string) {
  return RulesSimulationSchema.parse(await apiClient(endpoints.rulesSimulations.detail(id)))
}

beforeEach(() => {
  initMockTransport()
})

afterEach(() => {
  setMockTransport(null)
})

describe('mock rules simulations', () => {
  it('queues a simulation, runs it on the next GET and finishes it on the one after', async () => {
    const { id } = await start()
    expect(id.startsWith(FIXTURE_PREFIX)).toBe(true)

    expect((await read(id)).status).toBe('queued')
    expect((await read(id)).status).toBe('running')
    const done = await read(id)
    expect(done.status).toBe('succeeded')
    // Finished is final.
    expect(await read(id)).toEqual(done)
  })

  it('finds by the rules text, a default check and no rule, on lines the code has', async () => {
    const { id } = await start({ ...input, content: 'only = 1' })
    await read(id)
    await read(id)
    const done = await read(id)

    expect(done.status === 'succeeded' && done.findings.map((item) => item.ruleName)).toEqual([
      '.review/rules.md',
      'service-defaults:E2',
      null,
    ])
    expect(done.status === 'succeeded' && done.findings.every((item) => item.line === 1)).toBe(true)
    expect(done.status === 'succeeded' && done.costUsd).toBeGreaterThan(0)
  })

  it('finds nothing by the rules text when there is none', async () => {
    const { id } = await start({ ...input, rulesMd: '' })
    await read(id)
    await read(id)
    const done = await read(id)

    expect(done.status === 'succeeded' && done.findings.map((item) => item.ruleName)).toEqual([
      'service-defaults:E2',
      null,
    ])
  })

  it('refuses a second simulation while one runs, naming it, and takes one after', async () => {
    const { id } = await start()

    await expect(start()).rejects.toMatchObject({
      status: 409,
      data: { detail: 'active_simulation_exists', id },
    })

    await read(id)
    await read(id)
    await read(id)
    const next = await start()
    expect(next.id).not.toBe(id)
  })

  it('takes code of 64 KiB and refuses a byte more', async () => {
    const atLimit = await start({ ...input, content: 'é'.repeat(CONTENT_LIMIT / 2) })
    await read(atLimit.id)
    await read(atLimit.id)
    await read(atLimit.id)

    await expect(
      start({ ...input, content: `${'é'.repeat(CONTENT_LIMIT / 2)}x` }),
    ).rejects.toMatchObject({
      status: 422,
      data: { detail: 'content_too_large' },
    })
  })

  it('answers 404 for an unknown repository and an unknown simulation', async () => {
    await expect(
      apiClient(endpoints.rulesSimulations.create('22222222-2222-4222-8222-0000000000ff'), {
        body: input,
      }),
    ).rejects.toMatchObject({ status: 404 })
    await expect(read(`${FIXTURE_PREFIX}0000000000ff`)).rejects.toMatchObject({ status: 404 })
  })

  it('forgets the simulations when the transport starts again', async () => {
    const { id } = await start()
    initMockTransport()

    await expect(read(id)).rejects.toMatchObject({ status: 404 })
    expect((await start()).status).toBe('queued')
  })
})
