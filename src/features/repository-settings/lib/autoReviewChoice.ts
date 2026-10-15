// The choice of auto-review while the GitHub App cannot reach the repository (ui#93, D9). The api
// then serves `enabled: false` whatever was stored (api PR #156, SD §6.9), so the UI never shows
// the stored preference; it offers the two values to write and tells which one was saved.

/** Writes `enabled: true`: auto-review starts once GitHub App access is back. */
export const ENABLE_AUTO_REVIEW_LABEL = 'Включить авто-ревью'

/** Writes `enabled: false`: auto-review stays off once GitHub App access is back. */
export const KEEP_AUTO_REVIEW_OFF_LABEL = 'Оставить выключенным'

/** The message for a choice the server saved while the GitHub App cannot reach the repository. */
export function autoReviewChoiceSaved(enabled: boolean): string {
  return enabled
    ? 'Выбор сохранён. Авто-ревью включится, когда доступ к GitHub App восстановится.'
    : 'Выбор сохранён. Авто-ревью останется выключенным, когда доступ к GitHub App восстановится.'
}
