import type { ChangeData } from 'react-diff-view'
import { getChangeKey, parseDiff } from 'react-diff-view'
import { describe, expect, it } from 'vitest'

import { SAMPLE_PATCH_A } from '../../../shared/fixtures/sample.patch'
import { commentKey } from './commentKey'
import { fromPatch } from './fromPatch'

function targetOf(change: ChangeData): { oldLine: number | null; newLine: number | null } {
  if (change.type === 'insert') {
    return { oldLine: null, newLine: change.lineNumber }
  }
  if (change.type === 'delete') {
    return { oldLine: change.lineNumber, newLine: null }
  }
  return { oldLine: change.oldLineNumber, newLine: change.newLineNumber }
}

describe('commentKey', () => {
  const file = fromPatch(SAMPLE_PATCH_A)

  it('resolves an added line by newLine', () => {
    expect(commentKey({ oldLine: null, newLine: 2 }, file)).toBe('I2')
  })

  it('resolves a context line by newLine or oldLine', () => {
    expect(commentKey({ oldLine: 3, newLine: 4 }, file)).toBe('N3')
    expect(commentKey({ oldLine: null, newLine: 4 }, file)).toBe('N3')
  })

  it('resolves a removed line by oldLine', () => {
    expect(commentKey({ oldLine: 2, newLine: null }, file)).toBe('D2')
  })

  it('returns null for a line outside the loaded chunks', () => {
    expect(commentKey({ oldLine: null, newLine: 99 }, file)).toBeNull()
  })

  it('matches getChangeKey for every change in the parsed patch', () => {
    const hunk = parseDiff(SAMPLE_PATCH_A.patch)[0]?.hunks[0]
    if (!hunk) {
      throw new Error('expected hunk in fixture')
    }
    for (const change of hunk.changes) {
      expect(commentKey(targetOf(change), file)).toBe(getChangeKey(change))
    }
  })
})
