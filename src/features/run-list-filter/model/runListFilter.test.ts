import { describe, expect, it } from 'vitest'

import { parseRunListFilter, runListHref, writeRunListFilter } from './runListFilter'

describe('parseRunListFilter', () => {
  it('reads the repo of the URL', () => {
    expect(parseRunListFilter(new URLSearchParams('repo=org%2Frepo'))).toEqual({ repo: 'org/repo' })
  })

  it('returns no filter when the URL has no repo', () => {
    expect(parseRunListFilter(new URLSearchParams('page=2'))).toEqual({})
  })

  it('drops an empty or overlong repo param', () => {
    expect(parseRunListFilter(new URLSearchParams('repo='))).toEqual({})
    expect(parseRunListFilter(new URLSearchParams(`repo=${'a'.repeat(513)}`))).toEqual({})
    expect(parseRunListFilter(new URLSearchParams(`repo=${'a'.repeat(512)}`))).toEqual({
      repo: 'a'.repeat(512),
    })
  })

  it('takes the first repo when the URL repeats the param', () => {
    expect(parseRunListFilter(new URLSearchParams('repo=org%2Fa&repo=org%2Fb'))).toEqual({
      repo: 'org/a',
    })
  })
})

describe('writeRunListFilter', () => {
  it('replaces the repo and keeps every other param', () => {
    const next = writeRunListFilter(new URLSearchParams('repo=org%2Fa&page=2'), {
      repo: 'org/b',
    })
    expect(next.getAll('repo')).toEqual(['org/b'])
    expect(next.get('page')).toBe('2')
  })

  it('removes the repo of an empty filter and keeps every other param', () => {
    const next = writeRunListFilter(new URLSearchParams('repo=org%2Fa&page=2'), {})
    expect(next.has('repo')).toBe(false)
    expect(next.get('page')).toBe('2')
  })

  it('does not change the params it was given', () => {
    const prev = new URLSearchParams('repo=org%2Fa')
    writeRunListFilter(prev, {})
    expect(prev.get('repo')).toBe('org/a')
  })
})

describe('runListHref', () => {
  it('links to the whole list without a filter', () => {
    expect(runListHref({})).toBe('/runs')
  })

  it('links to the runs of one repository', () => {
    expect(runListHref({ repo: 'larchanka-training/dmc-268-ui-t6' })).toBe(
      '/runs?repo=larchanka-training%2Fdmc-268-ui-t6',
    )
  })
})
