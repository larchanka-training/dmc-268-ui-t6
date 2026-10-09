import { describe, expect, it } from 'vitest'

import type { FindingView } from '../../../entities/review'
import {
  EMPTY_FINDING_FILTERS,
  effectiveFileFilter,
  hasActiveFindingFilters,
  hasContentFilter,
  matchesFindingFilters,
  parseFindingFilters,
  writeFindingFilters,
  type FindingFilters,
} from './findingFilters'

function makeFinding(id: string, overrides: Partial<FindingView>): FindingView {
  return {
    id,
    file: 'src/a.ts',
    oldLine: null,
    newLine: 3,
    endLine: null,
    side: 'RIGHT',
    severity: 'medium',
    category: 'readability',
    title: 'Title',
    body: 'Body',
    suggestion: null,
    confidence: 0.5,
    ruleName: null,
    ...overrides,
  }
}

// Badge groups: critical = critical + high, warning = medium + low, info = info.
const critA = makeFinding('critA', {
  file: 'src/a.ts',
  severity: 'critical',
  title: 'SQL injection in query',
  body: 'User input is concatenated into SQL.',
  ruleName: 'sql-injection',
})
const highB = makeFinding('highB', {
  file: 'src/b.ts',
  severity: 'high',
  title: 'Hardcoded token',
  body: 'Move the token to env.',
  ruleName: 'no-secrets',
})
const medA = makeFinding('medA', {
  file: 'src/a.ts',
  severity: 'medium',
  title: 'Console statement',
  body: 'Remove debug output before merge.',
  ruleName: 'no-console',
})
const lowB = makeFinding('lowB', {
  file: 'src/b.ts',
  severity: 'low',
  title: 'Naming',
  body: 'Variable name is too short.',
  ruleName: null,
})
const infoC = makeFinding('infoC', {
  file: 'src/c.ts',
  severity: 'info',
  title: 'Docs',
  body: 'Add a JSDoc comment to the exported function.',
  ruleName: null,
})
const ruA = makeFinding('ruA', {
  file: 'src/a.ts',
  severity: 'high',
  title: 'Утечка секрета',
  body: 'Ключ лежит в ИСХОДНИКАХ репозитория.',
  ruleName: null,
})
const FINDINGS = [critA, highB, medA, lowB, infoC, ruA]

/** Ids of the findings that pass; every file of the fixture exists in the run unless stated. */
function passing(
  filters: Partial<FindingFilters>,
  effectiveFiles: string[] = filters.files ?? [],
): string[] {
  const full: FindingFilters = { ...EMPTY_FINDING_FILTERS, ...filters }
  return FINDINGS.filter((finding) => matchesFindingFilters(finding, full, effectiveFiles)).map(
    (finding) => finding.id,
  )
}

describe('parseFindingFilters', () => {
  it('returns empty filters for no params', () => {
    expect(parseFindingFilters(new URLSearchParams())).toEqual(EMPTY_FINDING_FILTERS)
  })

  it('reads valid file, severity and q values', () => {
    const params = new URLSearchParams(
      'file=src%2Fa.ts&file=README.md&severity=warning&severity=critical&q=a+b%20c',
    )
    expect(parseFindingFilters(params)).toEqual({
      files: ['src/a.ts', 'README.md'],
      severities: ['critical', 'warning'],
      query: 'a b c',
    })
  })

  it('reads a Cyrillic query', () => {
    expect(parseFindingFilters(new URLSearchParams('q=ошибка')).query).toBe('ошибка')
  })

  it('puts severities in canonical group order, whatever the URL order', () => {
    const params = new URLSearchParams('severity=info&severity=warning&severity=critical')
    expect(parseFindingFilters(params).severities).toEqual(['critical', 'warning', 'info'])
  })

  it('keeps the URL order of files', () => {
    const params = new URLSearchParams('file=z.ts&file=a.ts&file=m.ts')
    expect(parseFindingFilters(params).files).toEqual(['z.ts', 'a.ts', 'm.ts'])
  })

  it('drops severities that are not badge groups', () => {
    const params = new URLSearchParams(
      'severity=bogus&severity=high&severity=Critical&severity=&severity=warning',
    )
    expect(parseFindingFilters(params).severities).toEqual(['warning'])
  })

  it('drops empty and overlong file values, keeps the 1024-char boundary', () => {
    const atLimit = 'f'.repeat(1024)
    const params = new URLSearchParams()
    params.append('file', '')
    params.append('file', 'f'.repeat(1025))
    params.append('file', atLimit)
    params.append('file', 'ok.ts')
    expect(parseFindingFilters(params).files).toEqual([atLimit, 'ok.ts'])
  })

  it('cuts an overlong q to 200 chars', () => {
    const params = new URLSearchParams()
    params.set('q', 'x'.repeat(250))
    expect(parseFindingFilters(params).query).toBe('x'.repeat(200))
  })

  it('uses the first q only', () => {
    const params = new URLSearchParams('q=one&q=two')
    expect(parseFindingFilters(params).query).toBe('one')
  })

  it('treats an empty q as no query', () => {
    expect(parseFindingFilters(new URLSearchParams('q=')).query).toBe('')
  })

  it('removes duplicates and keeps first-seen order', () => {
    const params = new URLSearchParams(
      'file=b.ts&file=a.ts&file=b.ts&severity=info&severity=info&severity=critical&severity=critical',
    )
    expect(parseFindingFilters(params)).toEqual({
      files: ['b.ts', 'a.ts'],
      severities: ['critical', 'info'],
      query: '',
    })
  })

  it('ignores unrelated params', () => {
    const params = new URLSearchParams('tab=diff&Severity=info&files=a.ts')
    expect(parseFindingFilters(params)).toEqual(EMPTY_FINDING_FILTERS)
  })

  it('never throws on malformed percent-encoding', () => {
    const params = new URLSearchParams('file=%&severity=%E0%A4%A&q=%E0%A4%A')
    expect(() => parseFindingFilters(params)).not.toThrow()
    expect(parseFindingFilters(params).severities).toEqual([])
  })
})

describe('writeFindingFilters', () => {
  const FULL: FindingFilters = {
    files: ['src/a.ts', 'README.md'],
    severities: ['critical', 'info'],
    query: 'ошибка',
  }

  it('round-trips through parseFindingFilters', () => {
    expect(parseFindingFilters(writeFindingFilters(new URLSearchParams(), FULL))).toEqual(FULL)
    expect(
      parseFindingFilters(writeFindingFilters(new URLSearchParams(), EMPTY_FINDING_FILTERS)),
    ).toEqual(EMPTY_FINDING_FILTERS)
  })

  it('serialises to repeatable file and severity params and a single q', () => {
    const next = writeFindingFilters(new URLSearchParams(), FULL)
    expect(next.getAll('file')).toEqual(['src/a.ts', 'README.md'])
    expect(next.getAll('severity')).toEqual(['critical', 'info'])
    expect(next.getAll('q')).toEqual(['ошибка'])
    expect(next.toString()).toBe(
      'file=src%2Fa.ts&file=README.md&severity=critical&severity=info&q=%D0%BE%D1%88%D0%B8%D0%B1%D0%BA%D0%B0',
    )
  })

  it('keeps every other param and replaces only file, severity and q', () => {
    const prev = new URLSearchParams('tab=diff&file=old.ts&view=split&severity=warning&q=old')
    const next = writeFindingFilters(prev, FULL)
    expect(next.getAll('tab')).toEqual(['diff'])
    expect(next.getAll('view')).toEqual(['split'])
    expect(next.getAll('file')).toEqual(['src/a.ts', 'README.md'])
    expect(next.getAll('severity')).toEqual(['critical', 'info'])
    expect(next.getAll('q')).toEqual(['ошибка'])
  })

  it('returns a new instance and leaves prev untouched', () => {
    const prev = new URLSearchParams('tab=diff&file=old.ts&q=old')
    const next = writeFindingFilters(prev, FULL)
    expect(next).not.toBe(prev)
    expect(prev.toString()).toBe('tab=diff&file=old.ts&q=old')
  })

  it('omits empty values and removes the previous ones', () => {
    const prev = new URLSearchParams('tab=diff&file=old.ts&severity=warning&q=old')
    const next = writeFindingFilters(prev, EMPTY_FINDING_FILTERS)
    expect(next.toString()).toBe('tab=diff')
  })

  it('omits an empty file entry and an empty q', () => {
    const next = writeFindingFilters(new URLSearchParams(), {
      files: ['', 'a.ts'],
      severities: [],
      query: '',
    })
    expect(next.toString()).toBe('file=a.ts')
  })

  it('writes a whitespace-only query as typed so the search input stays controlled', () => {
    const next = writeFindingFilters(new URLSearchParams(), {
      ...EMPTY_FINDING_FILTERS,
      query: ' ',
    })
    expect(next.get('q')).toBe(' ')
  })
})

describe('hasActiveFindingFilters / hasContentFilter', () => {
  it('are false for empty filters', () => {
    expect(hasActiveFindingFilters(EMPTY_FINDING_FILTERS)).toBe(false)
    expect(hasContentFilter(EMPTY_FINDING_FILTERS)).toBe(false)
  })

  it('treats a file filter as active but not as a content filter', () => {
    const filters = { ...EMPTY_FINDING_FILTERS, files: ['src/a.ts'] }
    expect(hasActiveFindingFilters(filters)).toBe(true)
    expect(hasContentFilter(filters)).toBe(false)
  })

  it('treats a severity filter as active and as a content filter', () => {
    const filters: FindingFilters = { ...EMPTY_FINDING_FILTERS, severities: ['info'] }
    expect(hasActiveFindingFilters(filters)).toBe(true)
    expect(hasContentFilter(filters)).toBe(true)
  })

  it('treats a non-blank query as active and as a content filter', () => {
    const filters = { ...EMPTY_FINDING_FILTERS, query: 'console' }
    expect(hasActiveFindingFilters(filters)).toBe(true)
    expect(hasContentFilter(filters)).toBe(true)
  })

  it('ignores a blank query', () => {
    const filters = { ...EMPTY_FINDING_FILTERS, query: '   ' }
    expect(hasActiveFindingFilters(filters)).toBe(false)
    expect(hasContentFilter(filters)).toBe(false)
  })
})

describe('effectiveFileFilter', () => {
  it('drops files that are not in the run, keeping the filter order', () => {
    expect(
      effectiveFileFilter(['src/b.ts', 'gone.ts', 'src/a.ts'], ['src/a.ts', 'src/b.ts']),
    ).toEqual(['src/b.ts', 'src/a.ts'])
  })

  it('keeps everything when every file is in the run', () => {
    expect(effectiveFileFilter(['a.ts', 'b.ts'], ['b.ts', 'a.ts', 'c.ts'])).toEqual([
      'a.ts',
      'b.ts',
    ])
  })

  it('is empty for an empty run-file list', () => {
    expect(effectiveFileFilter(['a.ts', 'b.ts'], [])).toEqual([])
  })

  it('is empty when no file is selected', () => {
    expect(effectiveFileFilter([], ['a.ts'])).toEqual([])
  })

  it('does not repeat a file that the run lists twice', () => {
    expect(effectiveFileFilter(['a.ts'], ['a.ts', 'a.ts'])).toEqual(['a.ts'])
  })
})

describe('matchesFindingFilters', () => {
  it('passes everything without filters', () => {
    expect(passing({})).toEqual(['critA', 'highB', 'medA', 'lowB', 'infoC', 'ruA'])
  })

  describe('each filter alone', () => {
    it('file', () => {
      expect(passing({ files: ['src/a.ts'] })).toEqual(['critA', 'medA', 'ruA'])
      expect(passing({ files: ['src/b.ts', 'src/c.ts'] })).toEqual(['highB', 'lowB', 'infoC'])
    })

    it('severity groups, both members of a group', () => {
      expect(passing({ severities: ['critical'] })).toEqual(['critA', 'highB', 'ruA'])
      expect(passing({ severities: ['warning'] })).toEqual(['medA', 'lowB'])
      expect(passing({ severities: ['info'] })).toEqual(['infoC'])
    })

    it('several severity groups are OR-ed', () => {
      expect(passing({ severities: ['critical', 'info'] })).toEqual([
        'critA',
        'highB',
        'infoC',
        'ruA',
      ])
    })

    it('query in the title', () => {
      expect(passing({ query: 'console' })).toEqual(['medA'])
    })

    it('query in the body', () => {
      expect(passing({ query: 'ENV' })).toEqual(['highB'])
    })

    it('query in the ruleName', () => {
      expect(passing({ query: 'SQL-INJECTION' })).toEqual(['critA'])
      expect(passing({ query: 'no-secrets' })).toEqual(['highB'])
    })

    it('query ignores surrounding whitespace', () => {
      expect(passing({ query: '  console  ' })).toEqual(['medA'])
    })

    it('a blank query does not filter', () => {
      expect(passing({ query: '   ' })).toEqual(['critA', 'highB', 'medA', 'lowB', 'infoC', 'ruA'])
    })

    it('a null ruleName neither throws nor matches', () => {
      expect(passing({ query: 'null' })).toEqual([])
      expect(passing({ query: 'naming' })).toEqual(['lowB'])
    })

    it('a query that is in no field matches nothing', () => {
      expect(passing({ query: 'zzz-not-there' })).toEqual([])
    })
  })

  describe('Cyrillic', () => {
    it('matches the title case-insensitively', () => {
      expect(passing({ query: 'утечка' })).toEqual(['ruA'])
      expect(passing({ query: 'УТЕЧКА СЕКРЕТА' })).toEqual(['ruA'])
    })

    it('matches the body case-insensitively', () => {
      expect(passing({ query: 'исходниках' })).toEqual(['ruA'])
      expect(passing({ query: 'Лежит В' })).toEqual(['ruA'])
    })
  })

  describe('every pair', () => {
    it('file and severity', () => {
      expect(passing({ files: ['src/a.ts'], severities: ['critical'] })).toEqual(['critA', 'ruA'])
      expect(passing({ files: ['src/c.ts'], severities: ['critical'] })).toEqual([])
    })

    it('file and query', () => {
      expect(passing({ files: ['src/a.ts'], query: 'console' })).toEqual(['medA'])
      expect(passing({ files: ['src/b.ts'], query: 'console' })).toEqual([])
    })

    it('severity and query', () => {
      expect(passing({ severities: ['warning'], query: 'name' })).toEqual(['lowB'])
      expect(passing({ severities: ['critical'], query: 'name' })).toEqual([])
    })
  })

  describe('all three', () => {
    it('keeps the finding that satisfies every filter', () => {
      expect(passing({ files: ['src/b.ts'], severities: ['critical'], query: 'token' })).toEqual([
        'highB',
      ])
    })

    it('drops everything when one filter disagrees', () => {
      expect(passing({ files: ['src/a.ts'], severities: ['critical'], query: 'token' })).toEqual([])
    })
  })

  describe('effective files', () => {
    it('the file filter is read from effectiveFiles, not from filters.files', () => {
      // `gone.ts` is not in the run: the sanitised filter is empty, so nothing is hidden.
      expect(passing({ files: ['gone.ts'] }, [])).toEqual([
        'critA',
        'highB',
        'medA',
        'lowB',
        'infoC',
        'ruA',
      ])
      expect(passing({ files: ['gone.ts', 'src/c.ts'] }, ['src/c.ts'])).toEqual(['infoC'])
    })
  })
})
