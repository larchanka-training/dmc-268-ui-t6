import type { SeverityThreshold } from '../../../entities/repository'
import {
  SeveritySchema,
  severityBadgeGroup,
  type Severity,
  type SeverityBadgeGroup,
} from '../../../entities/review'

// The wire value is a floor over the D3 badge groups (api#149): `all` publishes every group,
// `warning` drops info, `critical` keeps critical alone. The levels each option keeps are worked
// out from the shared `severityBadgeGroup` map, so the two cannot drift apart.
const KEPT_GROUPS: Record<SeverityThreshold, readonly SeverityBadgeGroup[]> = {
  all: ['critical', 'warning', 'info'],
  warning: ['critical', 'warning'],
  critical: ['critical'],
}

const LABEL: Record<SeverityThreshold, string> = {
  all: 'All',
  warning: 'Warn & Crit',
  critical: 'Only Critical',
}

/** The levels a threshold publishes, most severe first. */
export function keptSeverities(threshold: SeverityThreshold): Severity[] {
  return SeveritySchema.options.filter((severity) =>
    KEPT_GROUPS[threshold].includes(severityBadgeGroup(severity)),
  )
}

export interface SeverityThresholdOption {
  value: SeverityThreshold
  label: string
  levels: Severity[]
}

/** From the widest option to the narrowest. */
export const SEVERITY_THRESHOLD_OPTIONS: readonly SeverityThresholdOption[] = (
  ['all', 'warning', 'critical'] as const
).map((value) => ({ value, label: LABEL[value], levels: keptSeverities(value) }))
