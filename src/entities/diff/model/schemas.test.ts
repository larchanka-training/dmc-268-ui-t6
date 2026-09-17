import { describe, expect, it } from 'vitest'

import { DiffLineSchema, FileDiffSchema, FileSliceSchema, RawFileDiffSchema } from './schemas'

describe('DiffLineSchema', () => {
  it('accepts a context line with both oldLine and newLine set', () => {
    expect(
      DiffLineSchema.safeParse({ type: 'context', oldLine: 1, newLine: 1, content: 'line one' })
        .success,
    ).toBe(true)
  })

  it('rejects an added line with oldLine set', () => {
    expect(
      DiffLineSchema.safeParse({ type: 'added', oldLine: 3, newLine: 4, content: 'line four' })
        .success,
    ).toBe(false)
  })

  it('rejects a removed line with newLine set', () => {
    expect(
      DiffLineSchema.safeParse({ type: 'removed', oldLine: 4, newLine: 3, content: 'line four' })
        .success,
    ).toBe(false)
  })
})

describe('FileDiffSchema', () => {
  it('accepts a FileDiff with 2 chunks', () => {
    const fileDiff = {
      filename: 'src/a.ts',
      chunks: [
        {
          header: '@@ -1,4 +1,5 @@',
          lines: [{ type: 'context', oldLine: 1, newLine: 1, content: 'line one' }],
        },
        {
          header: '@@ -10,3 +11,3 @@',
          lines: [{ type: 'context', oldLine: 10, newLine: 11, content: 'line ten' }],
        },
      ],
    }
    const result = FileDiffSchema.safeParse(fileDiff)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.chunks.length).toBe(2)
    }
  })
})

describe('RawFileDiffSchema', () => {
  it('accepts a RawFileDiff with filename and patch', () => {
    expect(
      RawFileDiffSchema.safeParse({ filename: 'src/a.ts', patch: '@@ -1,4 +1,5 @@' }).success,
    ).toBe(true)
  })

  it('rejects a RawFileDiff missing patch', () => {
    const result = RawFileDiffSchema.safeParse({ filename: 'src/a.ts' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['patch'])
    }
  })
})

describe('FileSliceSchema', () => {
  it('accepts a FileSlice with nextOffset null', () => {
    const fileSlice = {
      path: 'src/a.ts',
      startLine: 1,
      lines: ['line one', 'line two'],
      totalLines: 2,
      nextOffset: null,
    }
    expect(FileSliceSchema.safeParse(fileSlice).success).toBe(true)
  })

  it('rejects a FileSlice with startLine 0', () => {
    const fileSlice = {
      path: 'src/a.ts',
      startLine: 0,
      lines: [],
      totalLines: 0,
      nextOffset: null,
    }
    expect(FileSliceSchema.safeParse(fileSlice).success).toBe(false)
  })
})
