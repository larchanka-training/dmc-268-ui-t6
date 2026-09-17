import { describe, expect, it } from 'vitest'

import { SAMPLE_PATCH_A } from '../../../shared/fixtures/sample.patch'
import type { FileSlice } from '../model/schemas'
import { expandContext, formatHunkHeader } from './expandContext'
import { fromPatch } from './fromPatch'

describe('expandContext', () => {
  it('merges a mid-file slice with its two neighbouring hunks', () => {
    const file = fromPatch(SAMPLE_PATCH_A)
    const slice: FileSlice = {
      path: 'src/a.ts',
      startLine: 6,
      lines: ['five', 'six', 'seven', 'eight', 'nine'],
      totalLines: 13,
      nextOffset: null,
    }
    const result = expandContext(file, slice)
    expect(result.chunks.length).toBe(1)
    expect(result.chunks[0]?.header).toBe('@@ -1,12 +1,13 @@')
    expect(result.chunks[0]?.lines.length).toBe(15)
    expect(result.chunks[0]?.lines[6]).toEqual({
      type: 'context',
      oldLine: 5,
      newLine: 6,
      content: 'five',
    })
    expect(result.chunks[0]?.lines[10]).toEqual({
      type: 'context',
      oldLine: 9,
      newLine: 10,
      content: 'nine',
    })
    expect(result.chunks[0]?.lines[11]).toEqual({
      type: 'context',
      oldLine: 10,
      newLine: 11,
      content: 'ten',
    })
  })

  it('formats a hunk header', () => {
    expect(formatHunkHeader({ oldStart: 5, oldLines: 5, newStart: 6, newLines: 5 })).toBe(
      '@@ -5,5 +6,5 @@',
    )
  })

  it('merges a slice adjacent to the last hunk', () => {
    const file = fromPatch(SAMPLE_PATCH_A)
    const slice: FileSlice = {
      path: 'src/a.ts',
      startLine: 14,
      lines: ['fourteen'],
      totalLines: 14,
      nextOffset: null,
    }
    const result = expandContext(file, slice)
    // Observed chunk count reported alongside the other T2 results; asserted here
    // against the actual react-diff-view insertHunk merge behaviour.
    expect(result.chunks.length).toBe(2)
    const lastChunk = result.chunks[result.chunks.length - 1]
    const lastLine = lastChunk?.lines[lastChunk.lines.length - 1]
    expect(lastLine).toEqual({
      type: 'context',
      oldLine: 13,
      newLine: 14,
      content: 'fourteen',
    })
  })
})
