import { ZodError } from 'zod'

import { ApiError } from '../../../shared/api/client'
import { i18n } from '../../../shared/i18n'

export function runDetailLoadMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return i18n.t('runs.errors.runNotFound')
    }
    return i18n.t('runs.errors.runLoadFailed')
  }
  if (error instanceof ZodError) {
    return i18n.t('common.errors.schema')
  }
  return i18n.t('runs.errors.runLoad')
}

export function runDiffLoadMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return i18n.t('runs.errors.diffNotFound')
    }
    return i18n.t('runs.errors.diffLoadFailed')
  }
  if (error instanceof ZodError) {
    return i18n.t('runs.errors.diffInvalid')
  }
  return i18n.t('runs.errors.diffLoad')
}
