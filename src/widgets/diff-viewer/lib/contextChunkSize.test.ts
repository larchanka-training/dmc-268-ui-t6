import { describe, expect, it } from 'vitest'

import { contextChunkLimit, MAX_CONTEXT_CHUNK_LINES } from './contextChunkSize'

describe('contextChunkLimit', () => {
  it('caps a gap larger than 500 at the files query max', () => {
    expect(MAX_CONTEXT_CHUNK_LINES).toBe(500)
    expect(contextChunkLimit(501)).toBe(500)
    expect(contextChunkLimit(600)).toBe(500)
  })

  it('passes through gaps within the cap', () => {
    expect(contextChunkLimit(5)).toBe(5)
    expect(contextChunkLimit(500)).toBe(500)
  })
})
