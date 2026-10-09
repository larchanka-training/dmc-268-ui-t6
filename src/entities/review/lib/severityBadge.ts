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

export const SEVERITY_BADGE_COLOR: Record<SeverityBadgeGroup, string> = {
  critical: 'red',
  warning: 'orange',
  info: 'blue',
}
