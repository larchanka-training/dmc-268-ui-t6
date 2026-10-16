import { describe, expect, it } from 'vitest'

import { disabledRagIndex, type Repository } from '../../../entities/repository'
import {
  buildSettingsPatch,
  formatBranchFilter,
  hasDraftChanges,
  parseBranchFilter,
  toFormValues,
  validateBranchFilterText,
  visibleLineNumber,
  type SettingsFormValues,
} from './settingsPatch'

const REPOSITORY: Repository = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  fullName: 'org/repo',
  url: 'https://github.com/org/repo',
  defaultBranch: 'main',
  enabled: true,
  defaultEngine: 'fast',
  waitForCi: 'auto',
  maxComments: 10,
  reviewEvent: 'COMMENT',
  branchFilter: ['main', 'release/*'],
  severityThreshold: 'all',
  installationAvailable: true,
  ragEnabled: false,
  ragIndex: disabledRagIndex,
}

// The form of REPOSITORY.
const BASELINE: SettingsFormValues = {
  waitForCi: 'auto',
  maxComments: 10,
  reviewEvent: 'COMMENT',
  branchFilter: 'main\nrelease/*',
  severityThreshold: 'all',
}

describe('toFormValues', () => {
  it('takes only the fields the form edits, the branch filter one mask per line', () => {
    expect(toFormValues(REPOSITORY)).toStrictEqual({
      waitForCi: 'auto',
      maxComments: 10,
      reviewEvent: 'COMMENT',
      branchFilter: 'main\nrelease/*',
      severityThreshold: 'all',
    })
  })

  it('shows an empty filter as an empty text', () => {
    expect(toFormValues({ ...REPOSITORY, branchFilter: [] }).branchFilter).toBe('')
  })
})

describe('parseBranchFilter', () => {
  it('trims, drops blank lines and keeps the first of equal masks', () => {
    expect(parseBranchFilter('  main \n\n\t\nrelease/*\r\nmain\n   \nfeat/**  ')).toEqual([
      'main',
      'release/*',
      'feat/**',
    ])
  })

  it('reads an empty or blank text as the empty list', () => {
    expect(parseBranchFilter('')).toEqual([])
    expect(parseBranchFilter(' \n \n')).toEqual([])
  })
})

describe('formatBranchFilter', () => {
  it('writes one mask per line and reads back the same list', () => {
    expect(formatBranchFilter(['main', 'release/*'])).toBe('main\nrelease/*')
    expect(formatBranchFilter([])).toBe('')
    expect(parseBranchFilter(formatBranchFilter(['a', 'b/*', 'c']))).toEqual(['a', 'b/*', 'c'])
  })
})

describe('visibleLineNumber', () => {
  const text = '\n  main \n\nmain\nrelease/*\r\n\n[oops'

  it('names the first visible line of the mask at an index of the cleaned list', () => {
    // The cleaned list is ['main', 'release/*', '[oops'].
    expect(visibleLineNumber(text, 0)).toBe(2)
    expect(visibleLineNumber(text, 1)).toBe(5)
    expect(visibleLineNumber(text, 2)).toBe(7)
  })

  it('falls back to the index plus one when no line matches', () => {
    expect(visibleLineNumber(text, 3)).toBe(4)
    expect(visibleLineNumber('', 0)).toBe(1)
  })
})

describe('validateBranchFilterText', () => {
  it('accepts the empty text and a normal list', () => {
    expect(validateBranchFilterText('')).toBeNull()
    expect(validateBranchFilterText('main\nrelease/*')).toBeNull()
  })

  it('accepts exactly 20 masks of 255 characters', () => {
    const text = Array.from({ length: 20 }, (_, i) => String(i).padEnd(255, 'a')).join('\n')
    expect(validateBranchFilterText(text)).toBeNull()
  })

  it('refuses more than 20 masks', () => {
    const text = Array.from({ length: 21 }, (_, i) => `b${String(i)}`).join('\n')
    expect(validateBranchFilterText(text)).toBe('Не больше 20 масок')
  })

  it('refuses a mask longer than 255 characters and names its line', () => {
    const text = `main\n${'a'.repeat(256)}`
    expect(validateBranchFilterText(text)).toBe('Маска в строке 2 длиннее 255 символов')
  })

  it('names the visible line when the text has blank lines before the mask', () => {
    const text = `\nmain\n\n${'a'.repeat(256)}`
    expect(validateBranchFilterText(text)).toBe('Маска в строке 4 длиннее 255 символов')
  })
})

describe('buildSettingsPatch', () => {
  it('is empty when nothing changed', () => {
    expect(buildSettingsPatch(BASELINE, { ...BASELINE })).toEqual({})
  })

  it('holds only the changed fields', () => {
    expect(buildSettingsPatch(BASELINE, { ...BASELINE, maxComments: 5 })).toEqual({
      maxComments: 5,
    })
    expect(
      buildSettingsPatch(BASELINE, {
        ...BASELINE,
        waitForCi: 'never',
        reviewEvent: 'REQUEST_CHANGES',
      }),
    ).toEqual({ waitForCi: 'never', reviewEvent: 'REQUEST_CHANGES' })
  })

  it('compares against the baseline it is given, not against the first one', () => {
    const saved: SettingsFormValues = { ...BASELINE, maxComments: 5 }
    expect(buildSettingsPatch(saved, { ...saved })).toEqual({})
    expect(buildSettingsPatch(saved, { ...saved, maxComments: 10 })).toEqual({ maxComments: 10 })
  })

  it('does not treat a cleared limit as a change', () => {
    expect(buildSettingsPatch(BASELINE, { ...BASELINE, maxComments: null })).toEqual({})
  })

  it('never produces a defaultEngine key', () => {
    const patch = buildSettingsPatch(BASELINE, {
      ...BASELINE,
      waitForCi: 'always',
      maxComments: 1,
      reviewEvent: 'REQUEST_CHANGES',
    })
    expect(Object.keys(patch).sort()).toEqual(['maxComments', 'reviewEvent', 'waitForCi'])
  })

  describe('branch filter', () => {
    it('is not a change while the masks are the same list', () => {
      expect(
        buildSettingsPatch(BASELINE, {
          ...BASELINE,
          branchFilter: '  main\n\nrelease/*  \nmain',
        }),
      ).toEqual({})
    })

    it('sends the whole new list, normalized', () => {
      expect(
        buildSettingsPatch(BASELINE, {
          ...BASELINE,
          branchFilter: 'main\n release/* \nhotfix/*\nmain',
        }),
      ).toEqual({ branchFilter: ['main', 'release/*', 'hotfix/*'] })
    })

    it('compares the lists element by element, so a reorder is a change', () => {
      expect(
        buildSettingsPatch(BASELINE, {
          ...BASELINE,
          branchFilter: 'release/*\nmain',
        }),
      ).toEqual({ branchFilter: ['release/*', 'main'] })
    })

    it('sends an empty filter as []', () => {
      expect(buildSettingsPatch(BASELINE, { ...BASELINE, branchFilter: '' })).toEqual({
        branchFilter: [],
      })
      expect(buildSettingsPatch(BASELINE, { ...BASELINE, branchFilter: ' \n  ' })).toEqual({
        branchFilter: [],
      })
    })

    it('does not send an empty filter that was already empty', () => {
      const empty: SettingsFormValues = { ...BASELINE, branchFilter: '' }
      expect(buildSettingsPatch(empty, { ...empty, branchFilter: '\n' })).toEqual({})
    })
  })

  describe('severity threshold', () => {
    it('sends the new wire value', () => {
      expect(buildSettingsPatch(BASELINE, { ...BASELINE, severityThreshold: 'warning' })).toEqual({
        severityThreshold: 'warning',
      })
      expect(buildSettingsPatch(BASELINE, { ...BASELINE, severityThreshold: 'critical' })).toEqual({
        severityThreshold: 'critical',
      })
    })

    it('sends nothing for the value it opened with', () => {
      expect(buildSettingsPatch(BASELINE, { ...BASELINE })).toEqual({})
    })
  })
})

describe('hasDraftChanges', () => {
  it('is false for the values the form opened with', () => {
    expect(hasDraftChanges(BASELINE, { ...BASELINE })).toBe(false)
  })

  it('is true for each field that differs from the baseline', () => {
    expect(hasDraftChanges(BASELINE, { ...BASELINE, waitForCi: 'always' })).toBe(true)
    expect(hasDraftChanges(BASELINE, { ...BASELINE, maxComments: 3 })).toBe(true)
    expect(hasDraftChanges(BASELINE, { ...BASELINE, reviewEvent: 'REQUEST_CHANGES' })).toBe(true)
    expect(hasDraftChanges(BASELINE, { ...BASELINE, branchFilter: 'main' })).toBe(true)
    expect(hasDraftChanges(BASELINE, { ...BASELINE, severityThreshold: 'critical' })).toBe(true)
  })

  it('is true for a cleared limit, which buildSettingsPatch leaves out of the patch', () => {
    const cleared = { ...BASELINE, maxComments: null }
    expect(buildSettingsPatch(BASELINE, cleared)).toEqual({})
    expect(hasDraftChanges(BASELINE, cleared)).toBe(true)
  })

  it('is false for a limit that is cleared in the baseline too', () => {
    const cleared = { ...BASELINE, maxComments: null }
    expect(hasDraftChanges(cleared, { ...cleared })).toBe(false)
  })

  it.each([
    ['a blank line', 'main\nrelease/*\n'],
    ['trailing spaces', 'main\nrelease/*  '],
    ['a repeated mask', 'main\nrelease/*\nmain'],
    ['a space before a mask', ' main\nrelease/*'],
  ])(
    'is true for a branch filter text that differs only by %s, which parses to the same list',
    (_name, text) => {
      const typed = { ...BASELINE, branchFilter: text }
      expect(buildSettingsPatch(BASELINE, typed)).toEqual({})
      expect(hasDraftChanges(BASELINE, typed)).toBe(true)
    },
  )

  it('compares against the baseline it is given', () => {
    const saved = { ...BASELINE, maxComments: 4 }
    expect(hasDraftChanges(saved, { ...BASELINE, maxComments: 4 })).toBe(false)
    expect(hasDraftChanges(BASELINE, { ...BASELINE, maxComments: 4 })).toBe(true)
  })
})
