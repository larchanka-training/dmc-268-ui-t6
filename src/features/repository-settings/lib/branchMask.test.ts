import { describe, expect, it } from 'vitest'

import { branchMaskError } from './branchMask'

const WHITESPACE = 'пробелы и управляющие символы недопустимы'
const STARS = 'не больше двух «*» подряд'
const CHARACTERS = 'символы ? [ ] { } ! \\ ~ ^ : недопустимы'
const DOTS_AND_SLASHES = '«..» и «//» недопустимы'
const DOT_SEGMENT = 'часть между «/» не может начинаться с «.»'
const START = 'не может начинаться с «/» или «-»'
const END = 'не может заканчиваться на «/», «.» или «.lock»'
const AT_SIGN = '«@» не может быть маской'

// The cases of the api repo, `tests/test_branch_patterns.py` (`INVALID_BRANCH_PATTERNS`), each
// with the reason the rule of `_pattern_error` that refuses it gives. `empty` and
// `longer-than-255` are not here: blank lines never reach the function, and the length is checked
// on the Zod schema (see the last test).
const REFUSED: Record<string, readonly [mask: string, reason: string]> = {
  space: ['release x', WHITESPACE],
  tab: ['release\tx', WHITESPACE],
  newline: ['release\n', WHITESPACE],
  control: ['release\x01x', WHITESPACE],
  delete: ['release\x7fx', WHITESPACE],
  'lone-surrogate': ['release/\ud800', WHITESPACE],
  'three-stars': ['release/***', STARS],
  'question-mark': ['release?', CHARACTERS],
  'open-bracket': ['release[0', CHARACTERS],
  'close-bracket': ['release]0', CHARACTERS],
  'open-brace': ['release{0', CHARACTERS],
  'close-brace': ['release}0', CHARACTERS],
  'exclamation-mark': ['!release', CHARACTERS],
  backslash: ['release\\x', CHARACTERS],
  tilde: ['release~1', CHARACTERS],
  caret: ['release^1', CHARACTERS],
  colon: ['release:x', CHARACTERS],
  'double-dot': ['release..x', DOTS_AND_SLASHES],
  'double-slash': ['release//x', DOTS_AND_SLASHES],
  'dot-segment-start': ['.release', DOT_SEGMENT],
  'dot-inner-segment-start': ['release/.x', DOT_SEGMENT],
  'leading-slash': ['/release', START],
  'leading-dash': ['-release', START],
  'trailing-slash': ['release/', END],
  'trailing-dot': ['release.', END],
  'lock-suffix': ['release.lock', END],
  'at-sign': ['@', AT_SIGN],
}

describe('branchMaskError', () => {
  it.each(Object.entries(REFUSED))('refuses %s with its reason', (_name, [mask, reason]) => {
    expect(branchMaskError(mask)).toBe(reason)
  })

  it.each([
    '*',
    '**',
    'main',
    'release/*',
    'feature/**/x',
    'v1.2',
    'main.locked',
    'user@x',
    'release-*',
    'a'.repeat(255),
    ...Array.from({ length: 20 }, (_, number) => `release/${String(number)}`),
    // An emoji is one code point (a surrogate pair), not a lone surrogate.
    'feat/🚀',
  ])('accepts %s', (mask) => {
    expect(branchMaskError(mask)).toBeNull()
  })

  // The API's whitespace is Python `isspace()` (Zs, Zl, Zp and the Cc controls) plus the Cc and
  // Cs categories. JS `\s` also matches U+FEFF (Cf), which the API lets through.
  it('accepts a U+FEFF inside a mask, as the API does', () => {
    expect(branchMaskError('a\uFEFFb')).toBeNull()
  })

  it.each([
    ['U+00A0 no-break space', 'a\u00A0b'],
    ['U+0085 next line', 'a\u0085b'],
    ['U+2028 line separator', 'a\u2028b'],
    ['U+2029 paragraph separator', 'a\u2029b'],
    ['U+3000 ideographic space', 'a\u3000b'],
  ])('refuses %s as whitespace', (_name, mask) => {
    expect(branchMaskError(mask)).toBe(WHITESPACE)
  })

  it.each([
    { mask: 'a b..c', reason: WHITESPACE, order: 'whitespace before the double dot' },
    { mask: 'a ***', reason: WHITESPACE, order: 'whitespace before three stars' },
    { mask: 'a***?', reason: STARS, order: 'three stars before the forbidden characters' },
    { mask: 'a?..', reason: CHARACTERS, order: 'forbidden characters before the double dot' },
    { mask: '.a..b', reason: DOTS_AND_SLASHES, order: 'double dot before the dot segment' },
    { mask: '/.a', reason: DOT_SEGMENT, order: 'dot segment before the leading slash' },
    { mask: '.lock', reason: DOT_SEGMENT, order: 'dot segment before the .lock suffix' },
    { mask: '-a/', reason: START, order: 'leading dash before the trailing slash' },
    { mask: '/a.', reason: START, order: 'leading slash before the trailing dot' },
  ])('names the first failing rule only: $order ($mask)', ({ mask, reason }) => {
    expect(branchMaskError(mask)).toBe(reason)
  })

  it('leaves an empty mask and a long one to the layers that judge them', () => {
    // Blank lines are dropped before a mask reaches here, and the 255 limit is the Zod schema's
    // (`Repository.branchFilter`).
    expect(branchMaskError('')).toBeNull()
    expect(branchMaskError('a'.repeat(256))).toBeNull()
  })
})
