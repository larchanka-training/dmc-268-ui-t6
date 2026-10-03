import { describe, expect, it, vi } from 'vitest'

import { fromPatch, toHunks } from '../../../entities/diff'
import { SAMPLE_PATCH_A } from '../../../shared/fixtures/sample.patch'

vi.mock('react-diff-view', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-diff-view')>()
  return {
    ...actual,
    tokenize: vi.fn((): import('react-diff-view').HunkTokens => ({
      old: [[{ type: 'text', children: [{ type: 'plain', value: 'line' }] }]],
      new: [[{ type: 'text', children: [{ type: 'plain', value: 'line' }] }]],
    })),
  }
})

import { tokensForHunks } from './tokensForHunks'

describe('tokensForHunks', () => {
  it('returns tokens from tokenize for a known TypeScript file', () => {
    const file = fromPatch(SAMPLE_PATCH_A)
    const tokens = tokensForHunks(file.filename, toHunks(file))
    expect(tokens).toBeDefined()
  })

  it('returns undefined for an unknown file extension', () => {
    expect(tokensForHunks('docs/notes.xyz', [])).toBeUndefined()
  })

  it('returns undefined when hunks are empty for a known language', () => {
    expect(tokensForHunks('src/a.ts', [])).toBeUndefined()
  })
})
