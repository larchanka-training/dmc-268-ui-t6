import { describe, expect, it } from 'vitest'

import type { Repository } from '../../../entities/repository'
import { buildSettingsPatch, toFormValues, type SettingsFormValues } from './settingsPatch'

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
  branchFilter: [],
  severityThreshold: 'all',
  installationAvailable: true,
}

const BASELINE: SettingsFormValues = {
  waitForCi: 'auto',
  maxComments: 10,
  reviewEvent: 'COMMENT',
}

describe('toFormValues', () => {
  it('takes only the fields the form edits', () => {
    expect(toFormValues(REPOSITORY)).toEqual({
      waitForCi: 'auto',
      maxComments: 10,
      reviewEvent: 'COMMENT',
    })
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
        waitForCi: 'never',
        maxComments: 10,
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
      waitForCi: 'always',
      maxComments: 1,
      reviewEvent: 'REQUEST_CHANGES',
    })
    expect(Object.keys(patch).sort()).toEqual(['maxComments', 'reviewEvent', 'waitForCi'])
  })
})
