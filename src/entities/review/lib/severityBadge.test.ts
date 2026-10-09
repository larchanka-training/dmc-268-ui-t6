import { describe, expect, it } from 'vitest'

import {
  SEVERITY_BADGE_COLOR,
  SEVERITY_BADGE_GROUPS,
  SEVERITY_BADGE_LABEL,
  severityBadgeGroup,
} from './severityBadge'

describe('SEVERITY_BADGE_GROUPS', () => {
  it('lists the three badge groups in canonical order', () => {
    expect([...SEVERITY_BADGE_GROUPS]).toEqual(['critical', 'warning', 'info'])
  })

  it('has a label and a colour for every group', () => {
    expect(Object.keys(SEVERITY_BADGE_LABEL)).toEqual(['critical', 'warning', 'info'])
    expect(Object.keys(SEVERITY_BADGE_COLOR)).toEqual(['critical', 'warning', 'info'])
  })
})

describe('severityBadgeGroup', () => {
  it('folds the five severities into the three groups', () => {
    expect(severityBadgeGroup('critical')).toBe('critical')
    expect(severityBadgeGroup('high')).toBe('critical')
    expect(severityBadgeGroup('medium')).toBe('warning')
    expect(severityBadgeGroup('low')).toBe('warning')
    expect(severityBadgeGroup('info')).toBe('info')
  })
})
