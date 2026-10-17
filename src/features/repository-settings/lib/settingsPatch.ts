import {
  RepositorySchema,
  type Repository,
  type ReviewEvent,
  type SeverityThreshold,
  type UpdateRepositoryInput,
  type WaitForCi,
} from '../../../entities/repository'
import { branchMaskError } from './branchMask'

/**
 * What the settings form edits. `defaultEngine` is not here on purpose: it is shown as text and
 * never sent (the api accepts only `fast` until phase 3).
 */
export interface SettingsFormValues {
  waitForCi: WaitForCi
  /** `null` while the field is cleared; a cleared limit is not a change. */
  maxComments: number | null
  reviewEvent: ReviewEvent
  /** One mask per line, as typed. */
  branchFilter: string
  severityThreshold: SeverityThreshold
}

/** Masks of the textarea: trimmed, blank lines dropped, the first of equal masks kept. */
export function parseBranchFilter(text: string): string[] {
  const masks = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
  return [...new Set(masks)]
}

/**
 * The line of the textarea a mask sits on, 1-based: the first line whose trimmed text is the mask
 * at `maskIndex` of the cleaned list (`parseBranchFilter`). The cleaned list loses blank lines and
 * duplicates, so its index is not what the user sees. Falls back to the index plus one when no
 * line matches.
 */
export function visibleLineNumber(text: string, maskIndex: number): number {
  const mask = parseBranchFilter(text)[maskIndex]
  const line = mask === undefined ? -1 : text.split(/\r?\n/).findIndex((l) => l.trim() === mask)
  return line === -1 ? maskIndex + 1 : line + 1
}

export function formatBranchFilter(masks: readonly string[]): string {
  return masks.join('\n')
}

/**
 * The client mirrors what the API checks of the list: the size limits of
 * `Repository.branchFilter` (also so the save never fails in `updateRepository` with a Zod error)
 * and the grammar of each mask (`branchMaskError`), so a refused mask is named by its line before
 * any request. The 422 of the server stays as the fallback if the two drift. Sizes are judged
 * first; then the first line of the text, in textarea order, whose mask is refused.
 */
export function validateBranchFilterText(text: string): string | null {
  const masks = parseBranchFilter(text)
  const parsed = RepositorySchema.shape.branchFilter.safeParse(masks)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const index = issue?.path[0]
    if (typeof index === 'number') {
      return `Маска в строке ${String(visibleLineNumber(text, index))} длиннее 255 символов`
    }
    return 'Не больше 20 масок'
  }
  for (const [index, mask] of masks.entries()) {
    const reason = branchMaskError(mask)
    if (reason !== null) {
      return `Маска в строке ${String(visibleLineNumber(text, index))}: ${reason}`
    }
  }
  return null
}

export function toFormValues(repository: Repository): SettingsFormValues {
  return {
    waitForCi: repository.waitForCi,
    maxComments: repository.maxComments,
    reviewEvent: repository.reviewEvent,
    branchFilter: formatBranchFilter(repository.branchFilter),
    severityThreshold: repository.severityThreshold,
  }
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index])
}

/** The fields whose value differs from the baseline the form opened with (or last saved). */
export function buildSettingsPatch(
  baseline: SettingsFormValues,
  values: SettingsFormValues,
): UpdateRepositoryInput {
  const patch: UpdateRepositoryInput = {}
  if (values.waitForCi !== baseline.waitForCi) {
    patch.waitForCi = values.waitForCi
  }
  if (values.maxComments !== null && values.maxComments !== baseline.maxComments) {
    patch.maxComments = values.maxComments
  }
  if (values.reviewEvent !== baseline.reviewEvent) {
    patch.reviewEvent = values.reviewEvent
  }
  const next = parseBranchFilter(values.branchFilter)
  if (!sameList(parseBranchFilter(baseline.branchFilter), next)) {
    patch.branchFilter = next
  }
  if (values.severityThreshold !== baseline.severityThreshold) {
    patch.severityThreshold = values.severityThreshold
  }
  return patch
}

/**
 * Whether the form holds anything other than its baseline: every field compared as typed, with no
 * parsing and no normalising. Unlike `buildSettingsPatch` this counts what a PATCH cannot or
 * need not carry (a cleared limit, a branch filter text that reads as the same list), because
 * that is still the user's draft.
 */
export function hasDraftChanges(baseline: SettingsFormValues, values: SettingsFormValues): boolean {
  return (
    values.waitForCi !== baseline.waitForCi ||
    values.maxComments !== baseline.maxComments ||
    values.reviewEvent !== baseline.reviewEvent ||
    values.branchFilter !== baseline.branchFilter ||
    values.severityThreshold !== baseline.severityThreshold
  )
}

/**
 * The values to show after a successful save: every field that still holds what was submitted
 * takes the saved value, one the user changed while the request ran keeps what they typed. The
 * comparison is raw, as in `hasDraftChanges`.
 */
export function applySavedValues(
  submitted: SettingsFormValues,
  current: SettingsFormValues,
  saved: SettingsFormValues,
): SettingsFormValues {
  return {
    waitForCi: current.waitForCi === submitted.waitForCi ? saved.waitForCi : current.waitForCi,
    maxComments:
      current.maxComments === submitted.maxComments ? saved.maxComments : current.maxComments,
    reviewEvent:
      current.reviewEvent === submitted.reviewEvent ? saved.reviewEvent : current.reviewEvent,
    branchFilter:
      current.branchFilter === submitted.branchFilter ? saved.branchFilter : current.branchFilter,
    severityThreshold:
      current.severityThreshold === submitted.severityThreshold
        ? saved.severityThreshold
        : current.severityThreshold,
  }
}
