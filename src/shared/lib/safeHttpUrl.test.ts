import { describe, expect, it } from 'vitest'

import { safeHttpUrl } from './safeHttpUrl'

describe('safeHttpUrl', () => {
  it('allows http and https URLs', () => {
    expect(safeHttpUrl('https://github.com/org/repo/pull/1')).toBe(
      'https://github.com/org/repo/pull/1',
    )
    expect(safeHttpUrl('http://example.com')).toBe('http://example.com')
  })

  it('rejects javascript and malformed URLs', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull()
    expect(safeHttpUrl('not-a-url')).toBeNull()
  })
})
