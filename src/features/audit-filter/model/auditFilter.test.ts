import { describe, expect, it } from 'vitest'

import { parseAuditFilter, writeAuditFilter } from './auditFilter'

describe('parseAuditFilter', () => {
  it('reads the first repo and a known status', () => {
    const params = new URLSearchParams('repo=org/a&repo=org/b&status=failed&tab=notes')
    expect(parseAuditFilter(params)).toEqual({ repo: 'org/a', status: 'failed' })
  })

  it('drops an empty repo, an overlong repo and an unknown status', () => {
    expect(parseAuditFilter(new URLSearchParams('repo=&status=nope'))).toEqual({})
    expect(parseAuditFilter(new URLSearchParams(`repo=${'a'.repeat(513)}&status=failed`))).toEqual({
      status: 'failed',
    })
  })

  it.each([
    'queued',
    'running',
    'publishing',
    'succeeded',
    'failed',
    'cancelled',
    'skipped',
  ] as const)('accepts the run status %s', (status) => {
    expect(parseAuditFilter(new URLSearchParams(`status=${status}`))).toEqual({ status })
  })
})

describe('writeAuditFilter', () => {
  it('writes repo and status and keeps a foreign param', () => {
    const next = writeAuditFilter(new URLSearchParams('tab=notes'), {
      repo: 'org/a',
      status: 'cancelled',
    })
    expect(next.get('repo')).toBe('org/a')
    expect(next.get('status')).toBe('cancelled')
    expect(next.get('tab')).toBe('notes')
  })

  it('clears repo and status and keeps a foreign param', () => {
    const next = writeAuditFilter(new URLSearchParams('repo=org/a&status=failed&tab=notes'), {})
    expect(next.has('repo')).toBe(false)
    expect(next.has('status')).toBe(false)
    expect(next.get('tab')).toBe('notes')
  })
})
