import { describe, expect, it, vi } from 'vitest'

import { fromPatch, toHunks } from '../../../entities/diff'
import { SAMPLE_PATCH_A } from '../../../shared/fixtures/sample.patch'
import { refractorForDiffView } from './refractorForDiffView'
import { tokensForHunks } from './tokensForHunks'

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
    expect(tokensForHunks('docs/notes.xyz', [])).toBeUndefined()
  })

  it('returns undefined when hunks are empty for a known language', () => {
    expect(tokensForHunks('src/a.ts', [])).toBeUndefined()
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
