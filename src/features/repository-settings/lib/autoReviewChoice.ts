import { VCS_ACCESS_NAME, type VcsProvider } from '../../../shared/model/provider'

// The choice of auto-review while the provider cannot reach the repository (ui#93, D9). The api
// then serves `enabled: false` whatever was stored (api PR #156, SD §6.9), so the UI never shows
// the stored preference; it offers the two values to write and tells which one was saved.

import { i18n } from '../../../shared/i18n'

/** Writes `enabled: true`: auto-review starts once GitHub App access is back. */
export function enableAutoReviewLabel(): string {
  return i18n.t('settings.autoReview.enable')
}

/** Writes `enabled: false`: auto-review stays off once GitHub App access is back. */
export function keepAutoReviewOffLabel(): string {
  return i18n.t('settings.autoReview.keepOff')
}

/** The message for a choice the server saved while the GitHub App cannot reach the repository. */
export function autoReviewChoiceSaved(enabled: boolean, provider: VcsProvider = 'github'): string {
  const accessName = VCS_ACCESS_NAME[provider]
  return enabled
    ? i18n.t('settings.autoReview.savedOn', { accessName })
    : i18n.t('settings.autoReview.savedOff', { accessName })
}
