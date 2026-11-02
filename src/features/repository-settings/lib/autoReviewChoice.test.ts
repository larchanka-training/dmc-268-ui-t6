import { describe, expect, expectTypeOf, it } from 'vitest'

import type { VcsProvider } from '../../../shared/model/provider'

import {
  autoReviewChoiceSaved,
  enableAutoReviewLabel,
  keepAutoReviewOffLabel,
} from './autoReviewChoice'

describe('autoReviewChoice', () => {
  it('requires a provider at every call site', () => {
    expectTypeOf<Parameters<typeof autoReviewChoiceSaved>>().toEqualTypeOf<[boolean, VcsProvider]>()
  })

  it('labels the two choices', () => {
    expect(enableAutoReviewLabel()).toBe('Включить авто-ревью')
    expect(keepAutoReviewOffLabel()).toBe('Оставить выключенным')
  })

  it('says that turning auto-review on waits for GitHub App access', () => {
    expect(autoReviewChoiceSaved(true, 'github')).toBe(
      'Выбор сохранён. Авто-ревью включится, когда доступ к GitHub App восстановится.',
    )
  })

  it('says that keeping auto-review off stays so when GitHub App access is back', () => {
    expect(autoReviewChoiceSaved(false, 'github')).toBe(
      'Выбор сохранён. Авто-ревью останется выключенным, когда доступ к GitHub App восстановится.',
    )
  })

  it.each([
    ['gitlab', 'GitLab'],
    ['bitbucket', 'Bitbucket Cloud'],
  ] as const)('names %s access in both saved choices', (provider, access) => {
    expect(autoReviewChoiceSaved(true, provider)).toBe(
      `Выбор сохранён. Авто-ревью включится, когда доступ к ${access} восстановится.`,
    )
    expect(autoReviewChoiceSaved(false, provider)).toBe(
      `Выбор сохранён. Авто-ревью останется выключенным, когда доступ к ${access} восстановится.`,
    )
  })
})
