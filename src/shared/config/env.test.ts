import { describe, expect, it } from 'vitest'

import { parseEnv } from './env'

describe('parseEnv', () => {
  it('defaults VITE_API_BASE_URL to /api and string variables to empty string', () => {
    expect(parseEnv({})).toEqual({
      VITE_API_BASE_URL: '/api',
      VITE_GITHUB_CLIENT_ID: '',
      VITE_GITHUB_APP_SLUG: '',
    })
  })

  it('keeps provided variables', () => {
    expect(
      parseEnv({
        VITE_API_BASE_URL: 'http://localhost:8000/api',
        VITE_GITHUB_CLIENT_ID: 'gh_custom_id',
        VITE_GITHUB_APP_SLUG: 'my-app',
        MODE: 'test',
      }),
    ).toEqual({
      VITE_API_BASE_URL: 'http://localhost:8000/api',
      VITE_GITHUB_CLIENT_ID: 'gh_custom_id',
      VITE_GITHUB_APP_SLUG: 'my-app',
    })
  })

  it('throws when VITE_API_BASE_URL is an empty string', () => {
    expect(() => parseEnv({ VITE_API_BASE_URL: '' })).toThrow()
  })
})
