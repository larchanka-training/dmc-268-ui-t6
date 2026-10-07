import type { HunkData } from 'react-diff-view'
import { describe, expect, it, vi } from 'vitest'

import { fromPatch, toHunks } from '../../../entities/diff'
import { SAMPLE_PATCH_A } from '../../../shared/fixtures/sample.patch'
import { refractorForDiffView } from './refractorForDiffView'
import {
  countDiffSideLines,
  MAX_LINES_FOR_SYNC_HIGHLIGHT,
  MAX_SYNC_HIGHLIGHT_TOTAL_LINES,
  tokensForHunks,
} from './tokensForHunks'

describe('tokensForHunks', () => {
  it('returns real tokens from tokenize for a TypeScript file (no mock)', () => {
    const file = fromPatch(SAMPLE_PATCH_A)
    const tokens = tokensForHunks(file.filename, toHunks(file))
    expect(tokens).toBeDefined()
    expect(tokens?.old.length).toBeGreaterThan(0)
    expect(tokens?.new.length).toBeGreaterThan(0)
  })

  it('returns tokens for Python when the grammar is bundled in refractor', () => {
    const file = fromPatch({
      filename: 'lib/run.py',
      patch: [
        'diff --git a/lib/run.py b/lib/run.py',
        'index 1111111..2222222 100644',
        '--- a/lib/run.py',
        '+++ b/lib/run.py',
        '@@ -1,2 +1,3 @@',
        ' def main():',
        '-    pass',
        '+    return 1',
        '+    x = 2',
      ].join('\n'),
    })
    const tokens = tokensForHunks(file.filename, toHunks(file))
    expect(tokens).toBeDefined()
  })

  it('returns undefined for an unknown file extension', () => {
    const hunks = toHunks(fromPatch(SAMPLE_PATCH_A))
    // Non-empty hunks, so the language check (not the empty-hunks early return) is what is under test.
    expect(hunks.length).toBeGreaterThan(0)
    // Without the check the call still ends in `undefined` through the tokenize catch, so also
    // pin that the highlighter is never reached.
    const highlightSpy = vi.spyOn(refractorForDiffView, 'highlight')

    expect(tokensForHunks('docs/notes.xyz', hunks)).toBeUndefined()
    expect(highlightSpy).not.toHaveBeenCalled()
    highlightSpy.mockRestore()
  })

  it('returns undefined when hunks are empty for a known language', () => {
    expect(tokensForHunks('src/a.ts', [])).toBeUndefined()
  })

  it('returns undefined when the total diff budget is exceeded', () => {
    const file = fromPatch(SAMPLE_PATCH_A)
    const hunks = toHunks(file)
    expect(
      tokensForHunks(file.filename, hunks, {
        diffTotalLines: MAX_SYNC_HIGHLIGHT_TOTAL_LINES + 1,
      }),
    ).toBeUndefined()
  })

  it('returns undefined when diff-side line count exceeds the sync threshold', () => {
    const file = fromPatch(SAMPLE_PATCH_A)
    const hunks = toHunks(file)
    expect(countDiffSideLines(hunks)).toBeLessThanOrEqual(MAX_LINES_FOR_SYNC_HIGHLIGHT)

    const first = hunks[0]
    if (first === undefined) {
      throw new Error('expected at least one hunk')
    }
    const hugeHunks: HunkData[] = [
      {
        ...first,
        oldLines: MAX_LINES_FOR_SYNC_HIGHLIGHT,
        newLines: 1,
      },
    ]
    expect(tokensForHunks(file.filename, hugeHunks)).toBeUndefined()
  })

  it('returns tokens for a deletion-only hunk', () => {
    const file = fromPatch({
      filename: 'src/remove.ts',
      patch: [
        'diff --git a/src/remove.ts b/src/remove.ts',
        'index 1111111..2222222 100644',
        '--- a/src/remove.ts',
        '+++ b/src/remove.ts',
        '@@ -1,3 +0,0 @@',
        '-const a = 1',
        '-const b = 2',
        '-export {}',
      ].join('\n'),
    })
    const tokens = tokensForHunks(file.filename, toHunks(file))
    expect(tokens).toBeDefined()
  })

  it('logs and returns undefined when tokenize throws', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const file = fromPatch(SAMPLE_PATCH_A)
    const highlightSpy = vi.spyOn(refractorForDiffView, 'highlight').mockImplementation(() => {
      throw new Error('highlight failed')
    })

    const tokens = tokensForHunks(file.filename, toHunks(file))

    expect(tokens).toBeUndefined()
    expect(errorSpy).toHaveBeenCalled()
    highlightSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
