import type { Severity } from '../model/schemas'

export type SeverityBadgeGroup = 'critical' | 'warning' | 'info'

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
