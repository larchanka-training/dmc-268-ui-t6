import { describe, expect, it } from 'vitest'

import {
  autoReviewChoiceSaved,
  ENABLE_AUTO_REVIEW_LABEL,
  KEEP_AUTO_REVIEW_OFF_LABEL,
} from './autoReviewChoice'

describe('autoReviewChoice', () => {
  it('labels the two choices', () => {
    expect(ENABLE_AUTO_REVIEW_LABEL).toBe('Включить авто-ревью')
    expect(KEEP_AUTO_REVIEW_OFF_LABEL).toBe('Оставить выключенным')
  })

  it('says that turning auto-review on waits for GitHub App access', () => {
    expect(autoReviewChoiceSaved(true)).toBe(
      'Выбор сохранён. Авто-ревью включится, когда доступ к GitHub App восстановится.',
    )
  })

  it('says that keeping auto-review off stays so when GitHub App access is back', () => {
    expect(autoReviewChoiceSaved(false)).toBe(
      'Выбор сохранён. Авто-ревью останется выключенным, когда доступ к GitHub App восстановится.',
    )
  })
})
