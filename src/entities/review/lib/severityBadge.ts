import type { Severity } from '../model/schemas'

export const SEVERITY_BADGE_GROUPS = ['critical', 'warning', 'info'] as const
export type SeverityBadgeGroup = (typeof SEVERITY_BADGE_GROUPS)[number]

export function severityBadgeGroup(severity: Severity): SeverityBadgeGroup {
  if (severity === 'critical' || severity === 'high') {
    return 'critical'
  }
  if (severity === 'medium' || severity === 'low') {
    return 'warning'
  }
  return 'info'
}

export const SEVERITY_BADGE_LABEL: Record<SeverityBadgeGroup, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
}

/** Badge text of one finding: its exact level. The group is used by the severity filter. */
export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
}
