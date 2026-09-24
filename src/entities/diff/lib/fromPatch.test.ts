import { describe, expect, it } from 'vitest'

import { SAMPLE_PATCH_A, SAMPLE_PATCH_B } from '../../../shared/fixtures/sample.patch'
import { fromPatch } from './fromPatch'

describe('fromPatch', () => {
  it('parses a two-hunk patch', () => {
    const result = fromPatch(SAMPLE_PATCH_A)
    expect(result.filename).toBe('src/a.ts')
    expect(result.chunks.length).toBe(2)
    expect(result.chunks[0]?.header).toBe('@@ -1,4 +1,5 @@')
    expect(result.chunks[0]?.lines.length).toBe(6)
    expect(result.chunks[0]?.lines.map((l) => l.type)).toEqual([
      'context',
      'removed',
      'added',
      'added',
      'context',
      'context',
    ])
    expect(result.chunks[0]?.lines[2]).toEqual({
      type: 'added',
      oldLine: null,
      newLine: 2,
      content: 'line 2',
    })
    expect(result.chunks[0]?.lines[4]).toEqual({
      type: 'context',
      oldLine: 3,
      newLine: 4,
      content: 'line three',
    })
    expect(result.chunks[1]?.lines.length).toBe(4)
  })

  it('parses a single-hunk patch', () => {
    const result = fromPatch(SAMPLE_PATCH_B)
    expect(result.chunks.length).toBe(1)
    expect(result.chunks[0]?.lines.length).toBe(3)
    expect(result.chunks[0]?.lines[1]?.type).toBe('added')
    expect(result.chunks[0]?.lines[1]?.newLine).toBe(2)
  })

  it('keeps raw.filename even without a diff --git header', () => {
    const noGitHeader = SAMPLE_PATCH_A.patch.split('\n').slice(2).join('\n')
    const result = fromPatch({ filename: 'src/a.ts', patch: noGitHeader })
    expect(result.filename).toBe('src/a.ts')
    expect(result.chunks.length).toBe(2)
  })

  it('throws for a patch with hunks but no ---/+++/diff --git headers', () => {
    const hunksOnly = SAMPLE_PATCH_A.patch.split('\n').slice(4).join('\n')
    expect(() => fromPatch({ filename: 'src/a.ts', patch: hunksOnly })).toThrow(
      /unparseable patch for src\/a\.ts/,
    )
  })

  it('sets hasPatch true for a parsed string patch', () => {
    expect(fromPatch(SAMPLE_PATCH_A).hasPatch).toBe(true)
  })

  it('returns an empty, unparsed FileDiff with hasPatch false for patch: null', () => {
    const result = fromPatch({ filename: 'src/summary.ts', patch: null })
    expect(result).toEqual({ filename: 'src/summary.ts', chunks: [], hasPatch: false })
  })
})
