import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CONFIG_TIMEOUT_MS, getAppUrl, loadAppUrl, parseAppUrl, resetAppUrl } from './appUrl'

// Literal from the spec (AC 4), deliberately not imported from the code under test.
const STAGING = 'https://staging-ui.dmc268-t6.axyi.ru'

const respond = (body: string, status = 200) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status }))

beforeEach(() => {
  resetAppUrl()
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('parseAppUrl', () => {
  it('accepts http(s) urls', () => {
    expect(parseAppUrl({ appUrl: ' https://app.example.com ' })).toBe('https://app.example.com/')
    expect(parseAppUrl({ appUrl: 'http://localhost:5173' })).toBe('http://localhost:5173/')
  })

  it.each([
    null,
    'x',
    {},
    { appUrl: 1 },
    { appUrl: '' },
    { appUrl: 'nope' },
    { appUrl: 'javascript:alert(1)' },
  ])('rejects %j', (value) => {
    expect(parseAppUrl(value)).toBeNull()
  })
})

describe('loadAppUrl', () => {
  it('starts with the default app url', () => {
    expect(getAppUrl()).toBe(STAGING)
  })

  it('uses appUrl from config.json', async () => {
    expect(await loadAppUrl(respond('{"appUrl":"https://app.example.com"}'))).toBe(
      'https://app.example.com/',
    )
    expect(getAppUrl()).toBe('https://app.example.com/')
  })

  it.each([404, 500])(
    'falls back to the default on status %i even if the body holds a valid appUrl',
    async (status) => {
      expect(await loadAppUrl(respond('{"appUrl":"https://x.example"}', status))).toBe(STAGING)
      expect(getAppUrl()).toBe(STAGING)
    },
  )

  it('falls back when the body is not json (SPA fallback html)', async () => {
    expect(await loadAppUrl(respond('<!doctype html>'))).toBe(STAGING)
  })

  it('falls back when the config is invalid or the request fails', async () => {
    expect(await loadAppUrl(respond('{"appUrl":"ftp://x"}'))).toBe(STAGING)
    expect(await loadAppUrl(vi.fn<typeof fetch>().mockRejectedValue(new Error('net')))).toBe(
      STAGING,
    )
  })

  it('requests /config.json without caching and with an abort signal', async () => {
    const fetchImpl = respond('{"appUrl":"https://app.example.com"}')
    await loadAppUrl(fetchImpl)

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledWith(
      '/config.json',
      expect.objectContaining({
        cache: 'no-store',
        signal: expect.any(AbortSignal) as AbortSignal,
      }),
    )
  })

  it('uses a 2 second timeout', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout')
    await loadAppUrl(respond('{}'))

    expect(CONFIG_TIMEOUT_MS).toBe(2000)
    expect(timeout).toHaveBeenCalledWith(2000)
  })

  it('falls back to the default when the request hangs until the timeout aborts it', async () => {
    vi.useFakeTimers()
    try {
      const hanging = vi.fn<typeof fetch>(
        (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new Error('aborted by timeout'))
            })
          }),
      )
      const result = loadAppUrl(hanging)
      await vi.advanceTimersByTimeAsync(2000)
      expect(await result).toBe(STAGING)
    } finally {
      vi.useRealTimers()
    }
  })
})
