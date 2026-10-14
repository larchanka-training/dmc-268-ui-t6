import type {
  Repository,
  ReviewEvent,
  UpdateRepositoryInput,
  WaitForCi,
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
}

export function toFormValues(repository: Repository): SettingsFormValues {
  return {
    waitForCi: repository.waitForCi,
    maxComments: repository.maxComments,
    reviewEvent: repository.reviewEvent,
  }
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
  return patch
}
