import { describe, expect, it } from 'vitest'

import { SeveritySchema } from '../model/schemas'
import {
  SEVERITY_BADGE_GROUPS,
  SEVERITY_BADGE_LABEL,
  SEVERITY_LABEL,
  severityBadgeGroup,
} from './severityBadge'

describe('SEVERITY_BADGE_GROUPS', () => {
  it('lists the three badge groups in canonical order', () => {
    expect([...SEVERITY_BADGE_GROUPS]).toEqual(['critical', 'warning', 'info'])
  })

  it('has a label for every group', () => {
    expect(Object.keys(SEVERITY_BADGE_LABEL)).toEqual(['critical', 'warning', 'info'])
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

describe('SEVERITY_LABEL', () => {
  it('has a label for every severity level', () => {
    expect(Object.keys(SEVERITY_LABEL)).toEqual(SeveritySchema.options)
  })
})
