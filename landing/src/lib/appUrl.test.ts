import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_APP_URL, getAppUrl, loadAppUrl, parseAppUrl } from './appUrl'

const respond = (body: string, ok = true) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status: ok ? 200 : 404 }))

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
  it('uses appUrl from config.json', async () => {
    expect(await loadAppUrl(respond('{"appUrl":"https://app.example.com"}'))).toBe(
      'https://app.example.com/',
    )
    expect(getAppUrl()).toBe('https://app.example.com/')
  })

  it('falls back to the default when the file is missing', async () => {
    expect(await loadAppUrl(respond('', false))).toBe(DEFAULT_APP_URL)
    expect(getAppUrl()).toBe(DEFAULT_APP_URL)
  })

  it('falls back when the body is not json (SPA fallback html)', async () => {
    expect(await loadAppUrl(respond('<!doctype html>'))).toBe(DEFAULT_APP_URL)
  })

  it('falls back when the config is invalid or the request fails', async () => {
    expect(await loadAppUrl(respond('{"appUrl":"ftp://x"}'))).toBe(DEFAULT_APP_URL)
    expect(await loadAppUrl(vi.fn<typeof fetch>().mockRejectedValue(new Error('net')))).toBe(
      DEFAULT_APP_URL,
    )
  })
})
