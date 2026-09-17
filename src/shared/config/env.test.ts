import { describe, expect, it } from 'vitest'

import { parseEnv } from './env'

describe('parseEnv', () => {
  it('defaults VITE_API_BASE_URL to /api when missing', () => {
    expect(parseEnv({})).toEqual({ VITE_API_BASE_URL: '/api' })
  })

  it('keeps a provided VITE_API_BASE_URL and strips extra keys', () => {
    expect(parseEnv({ VITE_API_BASE_URL: 'http://localhost:8000/api', MODE: 'test' })).toEqual({
      VITE_API_BASE_URL: 'http://localhost:8000/api',
    })
  })

  it('throws when VITE_API_BASE_URL is an empty string', () => {
    expect(() => parseEnv({ VITE_API_BASE_URL: '' })).toThrow()
  })
})
