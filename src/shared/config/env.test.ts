import { describe, expect, it } from 'vitest'

import { parseEnv } from './env'

describe('parseEnv', () => {
  it('defaults VITE_API_BASE_URL to /api and string variables to empty string', () => {
    expect(parseEnv({})).toEqual({
      VITE_API_BASE_URL: '/api',
      VITE_GITHUB_CLIENT_ID: '',
      VITE_GITHUB_APP_SLUG: '',
      VITE_DOCS_URL: 'https://staging.dmc268-t6.axyi.ru/docs',
    })
  })

  it('keeps provided variables', () => {
    expect(
      parseEnv({
        VITE_API_BASE_URL: 'http://localhost:8000/api',
        VITE_GITHUB_CLIENT_ID: 'gh_custom_id',
        VITE_GITHUB_APP_SLUG: 'my-app',
        VITE_DOCS_URL: 'https://example.com/docs',
        MODE: 'test',
      }),
    ).toEqual({
      VITE_API_BASE_URL: 'http://localhost:8000/api',
      VITE_GITHUB_CLIENT_ID: 'gh_custom_id',
      VITE_GITHUB_APP_SLUG: 'my-app',
      VITE_DOCS_URL: 'https://example.com/docs',
    })
  })

  it('throws when VITE_API_BASE_URL is an empty string', () => {
    expect(() => parseEnv({ VITE_API_BASE_URL: '' })).toThrow()
  })

  it('falls back to the staging docs url when VITE_DOCS_URL is empty', () => {
    expect(parseEnv({ VITE_DOCS_URL: '' }).VITE_DOCS_URL).toBe(
      'https://staging.dmc268-t6.axyi.ru/docs',
    )
  })

  it.each(['http://localhost:3000/docs', 'https://example.com/docs'])(
    'accepts an http(s) VITE_DOCS_URL: %s',
    (value) => {
      expect(parseEnv({ VITE_DOCS_URL: value }).VITE_DOCS_URL).toBe(value)
    },
  )

  it.each([
    'not a url',
    'javascript:alert(1)',
    'ftp://example.com/docs',
    'xhttp://example.com/docs',
    'httpsx://example.com/docs',
  ])('throws when VITE_DOCS_URL is not an http(s) url: %s', (value) => {
    expect(() => parseEnv({ VITE_DOCS_URL: value })).toThrow()
  })
})
