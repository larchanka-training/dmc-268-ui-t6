import { ApiError } from '../../../shared/api/client'
import { validationErrorLocations } from '../../../shared/api/validationError'
import { i18n } from '../../../shared/i18n'

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
function fieldMessage(field: SettingsFieldName): string {
  if (field === 'severityThreshold') {
    return i18n.t('settings.form.serverRejectedThreshold')
  }
  return i18n.t('settings.form.serverRejectedValue')
}

/**
 * Splits a failed save into messages for the fields of the form and a rest for the `Alert`
 * above it. Only a 422 in FastAPI's `HTTPValidationError` shape can name a field; any other
 * error, a `detail` that is not a list, and a location that matches no field are general.
 *
 * The API names a refused mask by no index (the whole list is one location), and the form judges
 * the grammar itself before sending (`branchMaskError`), so a 422 at `branchFilter` is the
 * fallback for rules that drifted: it gets the same text as any other field.
 */
export function splitServerError(error: unknown): ServerErrorSplit {
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
    const [root, field] = path
    if (root !== 'body' || !isFieldName(field)) {
      general = true
      continue
    }
    const message = fieldMessage(field)
    const messages = fields[field] ?? []
    if (!messages.includes(message)) {
      messages.push(message)
    }
    fields[field] = messages
  }
  return { fields, general }
}
