// @vitest-environment node
// ui#175: the two pure parts of the dead-code check against the knip baseline.
import { describe, expect, it } from 'vitest'

import { compareFindings, toFindings } from './knip-check.mjs'

const empty = {
  files: [],
  dependencies: [],
  devDependencies: [],
  unlisted: [],
  binaries: [],
  unresolved: [],
  exports: [],
  types: [],
  enumMembers: [],
  duplicates: [],
}

describe('toFindings', () => {
  it('flattens every issue type into sorted { type, file, symbol } entries', () => {
    const report = {
      issues: [
        {
          ...empty,
          file: 'src/b.ts',
          exports: [{ name: 'beta', line: 1, col: 1, pos: 0 }],
          types: [{ name: 'T', line: 2, col: 1, pos: 1 }],
        },
        {
          ...empty,
          file: 'src/a.ts',
          exports: [{ name: 'zed', line: 1, col: 1, pos: 0 }],
          dependencies: [{ name: 'left-pad' }],
        },
      ],
    }
    expect(toFindings(report)).toEqual([
      { type: 'dependencies', file: 'src/a.ts', symbol: 'left-pad' },
      { type: 'exports', file: 'src/a.ts', symbol: 'zed' },
      { type: 'exports', file: 'src/b.ts', symbol: 'beta' },
      { type: 'types', file: 'src/b.ts', symbol: 'T' },
    ])
  })

  it('names a namespaced symbol namespace.name and a duplicates group by its names', () => {
    const report = {
      issues: [
        {
          ...empty,
          file: 'src/api.ts',
          types: [{ namespace: 'userApi', name: 'AuthSession', line: 3, col: 1, pos: 2 }],
          duplicates: [[{ name: 'App' }, { name: 'default' }]],
        },
      ],
    }
    expect(toFindings(report)).toEqual([
      { type: 'duplicates', file: 'src/api.ts', symbol: 'App|default' },
      { type: 'types', file: 'src/api.ts', symbol: 'userApi.AuthSession' },
    ])
  })

  it('uses the file path as the symbol of an unused file', () => {
    const report = { issues: [{ ...empty, file: 'src/dead.ts', files: [{ name: 'src/dead.ts' }] }] }
    expect(toFindings(report)).toEqual([
      { type: 'files', file: 'src/dead.ts', symbol: 'src/dead.ts' },
    ])
  })

  it('returns nothing for a clean report', () => {
    expect(toFindings({ issues: [] })).toEqual([])
    expect(toFindings({ issues: [{ ...empty, file: 'src/a.ts' }] })).toEqual([])
  })
})

describe('compareFindings', () => {
  const a = { type: 'exports', file: 'src/a.ts', symbol: 'x' }

  it('reports nothing when the findings equal the baseline', () => {
    expect(compareFindings([a], [a])).toEqual({ added: [], stale: [] })
  })

  it('reports a finding missing from the baseline as added and the reverse as stale', () => {
    const b = { type: 'types', file: 'src/b.ts', symbol: 'Y' }
    expect(compareFindings([a, b], [a])).toEqual({ added: [b], stale: [] })
    expect(compareFindings([a], [a, b])).toEqual({ added: [], stale: [b] })
  })

  it('keys on type, file and symbol together', () => {
    const otherFile = { ...a, file: 'src/other.ts' }
    const otherType = { ...a, type: 'types' }
    expect(compareFindings([a, otherFile, otherType], [a])).toEqual({
      added: [otherFile, otherType],
      stale: [],
    })
    expect(compareFindings([otherFile], [a])).toEqual({ added: [otherFile], stale: [a] })
  })
})
