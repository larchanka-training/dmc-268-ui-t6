import { describe, expect, it } from 'vitest'

import { parseEnv } from './env'

describe('parseEnv', () => {
  it('defaults VITE_API_BASE_URL to /api and VITE_GITHUB_CLIENT_ID to dmc_mock_client_id when missing', () => {
    expect(parseEnv({})).toEqual({
      VITE_API_BASE_URL: '/api',
      VITE_GITHUB_CLIENT_ID: 'dmc_mock_client_id',
    })
  })

  it('keeps provided variables and strips extra keys', () => {
    expect(
      parseEnv({
        VITE_API_BASE_URL: 'http://localhost:8000/api',
        VITE_GITHUB_CLIENT_ID: 'gh_custom_id',
        MODE: 'test',
      }),
    ).toEqual({
      VITE_API_BASE_URL: 'http://localhost:8000/api',
      VITE_GITHUB_CLIENT_ID: 'gh_custom_id',
    })
  })

  it('throws when VITE_API_BASE_URL is an empty string', () => {
    expect(() => parseEnv({ VITE_API_BASE_URL: '' })).toThrow()
  })
})
