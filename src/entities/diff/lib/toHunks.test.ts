import { parseDiff } from 'react-diff-view'
import { describe, expect, it } from 'vitest'

import { SAMPLE_PATCH_A, SAMPLE_PATCH_B } from '../../../shared/fixtures/sample.patch'
import type { Chunk, FileDiff } from '../model/schemas'
import { chunksFromHunks, fromPatch } from './fromPatch'
import { toHunks } from './toHunks'

describe('toHunks', () => {
  it('converts the first chunk back to a HunkData', () => {
    const file = fromPatch(SAMPLE_PATCH_A)
    const hunks = toHunks(file)
    expect(hunks[0]).toMatchObject({
      content: '@@ -1,4 +1,5 @@',
      oldStart: 1,
      oldLines: 4,
      newStart: 1,
      newLines: 5,
    })
    expect(hunks[0]?.changes.length).toBe(6)
    expect(hunks[0]?.changes[1]).toEqual({
      type: 'delete',
      isDelete: true,
      lineNumber: 2,
      content: 'line two',
    })
    expect(hunks[0]?.changes[4]).toEqual({
      type: 'normal',
      isNormal: true,
      oldLineNumber: 3,
      newLineNumber: 4,
      content: 'line three',
    })
  })

  it('round-trips chunksFromHunks(toHunks(file)) against file.chunks', () => {
    const fileA = fromPatch(SAMPLE_PATCH_A)
    expect(chunksFromHunks(toHunks(fileA))).toEqual(fileA.chunks)
    const fileB = fromPatch(SAMPLE_PATCH_B)
    expect(chunksFromHunks(toHunks(fileB))).toEqual(fileB.chunks)
  })

  it('round-trips against the library parseDiff output', () => {
    // The real gitdiff-parser output carries an extra runtime-only `isPlain` key per
    // hunk that is absent from the react-diff-view HunkData type and from our adapter;
    // objectContaining (via toMatchObject, received ⊇ expected) tolerates that extra key.
    const file = fromPatch(SAMPLE_PATCH_A)
    const libraryHunks = parseDiff(SAMPLE_PATCH_A.patch)[0]?.hunks
    expect(libraryHunks).toMatchObject(toHunks(file))
  })

  it('falls back to the header regex when no line carries the count (all-added chunk)', () => {
    const chunk: Chunk = {
      header: '@@ -0,0 +1,3 @@',
      lines: [
        { type: 'added', oldLine: null, newLine: 1, content: 'a' },
        { type: 'added', oldLine: null, newLine: 2, content: 'b' },
        { type: 'added', oldLine: null, newLine: 3, content: 'c' },
      ],
    }
    const file: FileDiff = { filename: 'x.ts', chunks: [chunk] }
    const [hunk] = toHunks(file)
    expect(hunk).toMatchObject({
      oldStart: 0,
      oldLines: 0,
      newStart: 1,
      newLines: 3,
      content: '@@ -0,0 +1,3 @@',
    })
  })

  it('falls back to the header regex when no line carries the count (all-removed chunk)', () => {
    const chunk: Chunk = {
      header: '@@ -4,2 +3,0 @@',
      lines: [
        { type: 'removed', oldLine: 4, newLine: null, content: 'a' },
        { type: 'removed', oldLine: 5, newLine: null, content: 'b' },
      ],
    }
    const file: FileDiff = { filename: 'x.ts', chunks: [chunk] }
    const [hunk] = toHunks(file)
    expect(hunk).toMatchObject({ oldStart: 4, oldLines: 2, newStart: 3, newLines: 0 })
  })
})
