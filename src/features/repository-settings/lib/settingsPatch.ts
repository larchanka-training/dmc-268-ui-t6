import {
  RepositorySchema,
  type Repository,
  type ReviewEvent,
  type SeverityThreshold,
  type UpdateRepositoryInput,
  type WaitForCi,
} from '../../../entities/repository'

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
 * The client checks only the size of the list (the limits of `Repository.branchFilter`) so the
 * save never fails in `updateRepository` with a Zod error; the glob grammar is the server's to
 * judge.
 */
export function validateBranchFilterText(text: string): string | null {
  const parsed = RepositorySchema.shape.branchFilter.safeParse(parseBranchFilter(text))
  if (parsed.success) {
    return null
  }
  const issue = parsed.error.issues[0]
  const index = issue?.path[0]
  if (typeof index === 'number') {
    return `Маска в строке ${String(visibleLineNumber(text, index))} длиннее 255 символов`
  }
  return 'Не больше 20 масок'
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
