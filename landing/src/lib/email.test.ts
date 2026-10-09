import { describe, expect, it } from 'vitest'

import { isValidEmail, normalizeEmail } from './email'

describe('isValidEmail', () => {
  it.each(['dev@example.com', 'a.b+tag@sub.example.io', '  Dev@Example.COM  '])(
    'accepts %s',
    (value) => {
      expect(isValidEmail(value)).toBe(true)
    },
  )

  it.each(['', 'dev', 'dev@', '@example.com', 'dev@example', 'dev @example.com', 'dev@ex..com'])(
    'rejects %j',
    (value) => {
      expect(isValidEmail(value)).toBe(false)
    },
  )

  it('rejects addresses longer than 254 characters', () => {
    expect(isValidEmail(`${'a'.repeat(250)}@example.com`)).toBe(false)
  })
})

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Dev@Example.COM ')).toBe('dev@example.com')
  })
})
