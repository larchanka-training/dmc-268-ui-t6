import { z, ZodError } from 'zod'

import { ApiError } from '../../../shared/api/client'
import { i18n } from '../../../shared/i18n'
import { RulesDiagnosticSchema, type RulesDiagnostic } from '../../../entities/repository'

// How the UI reads a refused POST and a failed simulation. PROVISIONAL, as the schemas: api#311
// names `409` with the id of the active simulation, `budget_paused`, `422` with RULES_FORMAT_SPEC §9
// diagnostics and a code for content over 64 KiB, but not the bodies. Each case is told by the shape
// of the body, so a renamed `detail` costs a text, not the adoption of the running simulation.
// The text is fixed by the case, never the api `detail`: it is English and must not reach the UI.

const ActiveSimulationBodySchema = z.object({ id: z.uuid() })
const RejectedRulesBodySchema = z.object({ diagnostics: z.array(RulesDiagnosticSchema).min(1) })
const DetailBodySchema = z.object({ detail: z.string() })

const BUDGET_PAUSED = 'budget_paused'
const CONTENT_TOO_LARGE = 'content_too_large'
const DEADLINE_EXCEEDED = 'deadline_exceeded'

function detailOf(error: ApiError): string | null {
  const parsed = DetailBodySchema.safeParse(error.data)
  return parsed.success ? parsed.data.detail : null
}

/** The simulation that is still running, from the `409` of a second POST: the page follows it. */
export function activeSimulationId(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 409) {
    return null
  }
  const parsed = ActiveSimulationBodySchema.safeParse(error.data)
  return parsed.success ? parsed.data.id : null
}

/** The errors of rules the server could not parse, on lines of the `rulesMd` that was sent. */
export function rejectedRulesDiagnostics(error: unknown): RulesDiagnostic[] | null {
  if (!(error instanceof ApiError) || error.status !== 422) {
    return null
  }
  const parsed = RejectedRulesBodySchema.safeParse(error.data)
  return parsed.success ? parsed.data.diagnostics : null
}

export function simulationStartErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return i18n.t('common.errors.schema')
  }
  if (error instanceof ApiError) {
    switch (error.status) {
      case 404:
        return i18n.t('playground.errors.repositoryNotFound')
      case 409:
        return detailOf(error) === BUDGET_PAUSED
          ? i18n.t('playground.errors.budgetPaused')
          : i18n.t('playground.errors.simulationRunning')
      case 422:
        if (rejectedRulesDiagnostics(error) !== null) {
          return i18n.t('playground.errors.rulesInvalid')
        }
        return detailOf(error) === CONTENT_TOO_LARGE
          ? i18n.t('playground.errors.contentTooLarge')
          : i18n.t('playground.errors.inputRejected')
      case 429:
        return i18n.t('playground.errors.rateLimited')
    }
  }
  return i18n.t('playground.errors.startFailed')
}

export function simulationReadErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return i18n.t('common.errors.schema')
  }
  if (error instanceof ApiError && error.status === 404) {
    return i18n.t('playground.errors.simulationNotFound')
  }
  return i18n.t('playground.errors.readFailed')
}

/** The `errorCode` of a failed simulation: a missed deadline, or else the model did not finish. */
export function simulationFailureMessage(errorCode: string): string {
  return errorCode === DEADLINE_EXCEEDED
    ? i18n.t('playground.errors.deadlineExceeded')
    : i18n.t('playground.errors.modelFailed')
}
