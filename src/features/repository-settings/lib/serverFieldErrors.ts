import { ApiError } from '../../../shared/api/client'
import { validationErrorLocations } from '../../../shared/api/validationError'
import { visibleLineNumber } from './settingsPatch'

const FIELD_NAMES = [
  'waitForCi',
  'maxComments',
  'reviewEvent',
  'branchFilter',
  'severityThreshold',
] as const
export type SettingsFieldName = (typeof FIELD_NAMES)[number]

export type ServerFieldErrors = Partial<Record<SettingsFieldName, string[]>>

export interface ServerErrorSplit {
  /** Texts to show under the field the server named. */
  fields: ServerFieldErrors
  /** The error (or part of it) names no field of the form: show it above the form. */
  general: boolean
}

function isFieldName(value: unknown): value is SettingsFieldName {
  return FIELD_NAMES.some((name) => name === value)
}

// The server's own `msg` is English text and is never shown (see `runMutationErrorMessage`).
function fieldMessage(
  field: SettingsFieldName,
  index: string | number | undefined,
  submittedBranchFilter: string | undefined,
): string {
  if (field === 'branchFilter' && typeof index === 'number') {
    // `index` counts the cleaned list that was sent; the user counts the lines they typed.
    const line = visibleLineNumber(submittedBranchFilter ?? '', index)
    return `Маска в строке ${String(line)} не принята сервером`
  }
  if (field === 'severityThreshold') {
    return 'Сервер не принял порог'
  }
  return 'Сервер не принял значение'
}

/**
 * Splits a failed save into messages for the fields of the form and a rest for the `Alert`
 * above it. Only a 422 in FastAPI's `HTTPValidationError` shape can name a field; any other
 * error, a `detail` that is not a list, and a location that matches no field are general.
 *
 * `submittedBranchFilter` is the textarea text the sent list came from: a refused mask is named
 * by its line there. Pass `undefined` when the branch filter was not part of the save.
 */
export function splitServerError(error: unknown, submittedBranchFilter?: string): ServerErrorSplit {
  if (!(error instanceof ApiError) || error.status !== 422) {
    return { fields: {}, general: true }
  }
  const locations = validationErrorLocations(error.data)
  if (locations.length === 0) {
    return { fields: {}, general: true }
  }

  const fields: ServerFieldErrors = {}
  let general = false
  for (const { path } of locations) {
    const [root, field, index] = path
    if (root !== 'body' || !isFieldName(field)) {
      general = true
      continue
    }
    const message = fieldMessage(field, index, submittedBranchFilter)
    const messages = fields[field] ?? []
    if (!messages.includes(message)) {
      messages.push(message)
    }
    fields[field] = messages
  }
  return { fields, general }
}
